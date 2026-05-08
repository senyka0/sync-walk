import asyncio
import logging

import httpx

from app.config import settings
from app.models.user import User
from app.schemas.feedback import FeedbackRequest

logger = logging.getLogger(__name__)

_SOURCE_LABELS: dict[str, str] = {
    "beta_banner": "Bug report from beta banner",
    "player": "Bug report from player",
    "tour_complete": "Review from actual route",
    "demo_exit": "Review from demo exit",
    "bug_report": "Bug report",
}


class FeedbackDeliveryError(Exception):
    pass


def _add_line(lines: list[str], label: str, value: object | None) -> None:
    if value is None or value == "":
        return
    lines.append(f"{label}: {value}")


def _format_feedback_message(
    payload: FeedbackRequest,
    user: User | None,
    client_ip: str | None,
) -> str:
    client = payload.client
    lines = [
        "SyncWalk feedback",
        f"Type: {_SOURCE_LABELS[payload.source]}",
        "",
        "Context:",
    ]

    _add_line(lines, "Tour", payload.tour_title)
    _add_line(lines, "Tour ID", payload.tour_id)
    _add_line(lines, "Room", payload.room_code)
    _add_line(lines, "Vote", payload.vote)
    _add_line(lines, "Choice", payload.choice)
    _add_line(lines, "Signal", payload.signal)

    lines.extend(["", "User:"])
    if user:
        _add_line(lines, "ID", user.id)
        _add_line(lines, "Name", user.name)
        _add_line(lines, "Email", user.email)
        _add_line(lines, "Phone", user.phone)
    else:
        lines.append("Authenticated: no")

    if client:
        _add_line(lines, "Visitor ID", client.visitor_id)

    lines.extend(["", "Client:"])
    _add_line(lines, "IP", client_ip)
    if client:
        _add_line(lines, "URL", client.url)
        _add_line(lines, "User agent", client.user_agent)
        _add_line(lines, "Browser brands", client.browser_brands)
        _add_line(lines, "Platform", client.platform)
        _add_line(lines, "Mobile", client.mobile)
        _add_line(lines, "Language", client.language)
        _add_line(lines, "Viewport", client.viewport)
        _add_line(lines, "Screen", client.screen)
        _add_line(lines, "Time zone", client.time_zone)

    lines.extend(["", "Message:", (payload.message or "").strip() or "(empty)"])
    return "\n".join(lines)


async def _send_to_chat(client: httpx.AsyncClient, chat_id: str, text: str) -> None:
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    body = {
        "chat_id": chat_id,
        "text": text[:4000],
        "disable_web_page_preview": True,
    }

    response = await client.post(url, json=body)
    response.raise_for_status()


async def _send_telegram_message(text: str) -> None:
    chat_ids = settings.telegram_feedback_chat_ids
    if not settings.TELEGRAM_BOT_TOKEN or not chat_ids:
        raise ValueError("Feedback destination is not configured")

    async with httpx.AsyncClient(timeout=10) as client:
        results = await asyncio.gather(
            *(_send_to_chat(client, chat_id, text) for chat_id in chat_ids),
            return_exceptions=True,
        )

    failures: list[tuple[str, BaseException]] = [
        (chat_id, result)
        for chat_id, result in zip(chat_ids, results)
        if isinstance(result, BaseException)
    ]

    for chat_id, error in failures:
        logger.warning("Failed to send feedback to chat %s: %s", chat_id, error)

    if failures and len(failures) == len(chat_ids):
        raise FeedbackDeliveryError(
            "Could not send feedback to Telegram",
        ) from failures[0][1]


async def deliver_feedback(
    payload: FeedbackRequest,
    user: User | None,
    client_ip: str | None,
) -> None:
    message = _format_feedback_message(payload, user, client_ip)
    await _send_telegram_message(message)
