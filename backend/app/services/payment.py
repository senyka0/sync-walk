import asyncio
import logging
import time
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import async_session
from app.models.payment import GroupType, Payment, PaymentStatus
from app.models.tour import Tour
from app.schemas.payment import PaymentCreateResponse
from app.services.wayforpay import (
    generate_check_status_signature,
    generate_callback_response_signature,
    generate_signature,
    verify_callback_signature,
)

WAYFORPAY_API_URL = "https://api.wayforpay.com/api"
logger = logging.getLogger(__name__)
_payment_monitor_tasks: dict[str, asyncio.Task] = {}


async def create_payment(
    db: AsyncSession, user_id: uuid.UUID, tour_id: uuid.UUID, group_type: str
) -> PaymentCreateResponse:
    if not settings.WAYFORPAY_MERCHANT_ACCOUNT or not settings.WAYFORPAY_MERCHANT_SECRET:
        raise ValueError("WayForPay credentials are not configured")

    try:
        normalized_group_type = GroupType(group_type)
    except ValueError as error:
        raise ValueError("Invalid group type") from error

    result = await db.execute(select(Tour).where(Tour.id == tour_id))
    tour = result.scalar_one_or_none()
    if not tour:
        raise ValueError("Tour not found")

    price = (
        tour.group_price
        if normalized_group_type == GroupType.GROUP
        else tour.individual_price
    )
    order_ref = f"SW-{str(user_id)[:8]}-{int(time.time())}-{uuid.uuid4().hex[:6].upper()}"

    payment = Payment(
        user_id=user_id,
        tour_id=tour_id,
        order_reference=order_ref,
        amount=price,
        currency="UAH",
        status=PaymentStatus.PENDING,
        group_type=normalized_group_type,
    )
    db.add(payment)
    await db.flush()

    return_url = (
        f"{settings.BACKEND_PUBLIC_URL}/api/v1/payments/return"
        f"?tourId={tour_id}&type={group_type}&orderRef={order_ref}"
    )
    service_url = f"{settings.BACKEND_PUBLIC_URL}/api/v1/payments/callback"

    params = {
        "merchantAccount": settings.WAYFORPAY_MERCHANT_ACCOUNT,
        "merchantDomainName": settings.WAYFORPAY_MERCHANT_DOMAIN,
        "orderReference": order_ref,
        "orderDate": int(time.time()),
        "amount": price,
        "currency": "UAH",
        "productName": [tour.title],
        "productCount": [1],
        "productPrice": [price],
        "returnUrl": return_url,
        "serviceUrl": service_url,
    }
    params["merchantSignature"] = generate_signature(params)

    return PaymentCreateResponse(
        payment_url="https://secure.wayforpay.com/pay",
        return_url=return_url,
        service_url=service_url,
        merchant_auth_type=settings.WAYFORPAY_MERCHANT_AUTH_TYPE,
        merchant_transaction_secure_type=settings.WAYFORPAY_MERCHANT_TRANSACTION_SECURE_TYPE,
        order_timeout=settings.WAYFORPAY_ORDER_TIMEOUT,
        language=settings.WAYFORPAY_LANGUAGE,
        order_reference=order_ref,
        merchant_account=params["merchantAccount"],
        merchant_domain_name=params["merchantDomainName"],
        order_date=params["orderDate"],
        amount=price,
        currency="UAH",
        product_name=params["productName"],
        product_count=params["productCount"],
        product_price=params["productPrice"],
        merchant_signature=params["merchantSignature"],
    )


def start_payment_status_monitor(order_reference: str) -> None:
    if order_reference in _payment_monitor_tasks:
        return

    task = asyncio.create_task(_monitor_payment_status(order_reference))
    _payment_monitor_tasks[order_reference] = task
    task.add_done_callback(lambda _: _payment_monitor_tasks.pop(order_reference, None))


async def start_pending_payment_status_monitors() -> None:
    async with async_session() as db:
        result = await db.execute(
            select(Payment).where(Payment.status == PaymentStatus.PENDING)
        )
        payments = result.scalars().all()

    now = datetime.now(timezone.utc)
    for payment in payments:
        deadline = _payment_deadline(payment)
        if deadline > now:
            start_payment_status_monitor(payment.order_reference)


async def stop_payment_status_monitors() -> None:
    tasks = list(_payment_monitor_tasks.values())
    _payment_monitor_tasks.clear()
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


async def _monitor_payment_status(order_reference: str) -> None:
    while True:
        try:
            should_continue, sleep_for = await _check_pending_payment_once(order_reference)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Payment status monitor failed for order %s", order_reference)
            should_continue = True
            sleep_for = settings.WAYFORPAY_STATUS_CHECK_INTERVAL_SECONDS

        if not should_continue:
            return

        await asyncio.sleep(sleep_for)


async def _check_pending_payment_once(order_reference: str) -> tuple[bool, float]:
    async with async_session() as db:
        result = await db.execute(
            select(Payment).where(Payment.order_reference == order_reference)
        )
        payment = result.scalar_one_or_none()
        if not payment or payment.status != PaymentStatus.PENDING:
            return False, 0

        deadline = _payment_deadline(payment)
        now = datetime.now(timezone.utc)
        if deadline <= now:
            return False, 0

        try:
            status_data = await _fetch_wayforpay_payment_status(order_reference)
            updated = await _apply_wayforpay_status_response(db, payment, status_data)
            await db.commit()
        except ValueError as exc:
            await db.rollback()
            logger.warning(
                "WayForPay status check rejected for order %s: %s",
                order_reference,
                str(exc),
            )
            updated = False
        except httpx.HTTPError as exc:
            await db.rollback()
            logger.warning(
                "WayForPay status check unavailable for order %s: %s",
                order_reference,
                str(exc),
            )
            updated = False

        if updated or payment.status != PaymentStatus.PENDING:
            return False, 0

        remaining = (deadline - datetime.now(timezone.utc)).total_seconds()
        if remaining <= 0:
            return False, 0

        interval = max(1, settings.WAYFORPAY_STATUS_CHECK_INTERVAL_SECONDS)
        return True, min(interval, remaining)


async def _fetch_wayforpay_payment_status(order_reference: str) -> dict:
    if not settings.WAYFORPAY_MERCHANT_ACCOUNT or not settings.WAYFORPAY_MERCHANT_SECRET:
        raise ValueError("WayForPay credentials are not configured")

    payload = {
        "transactionType": "CHECK_STATUS",
        "merchantAccount": settings.WAYFORPAY_MERCHANT_ACCOUNT,
        "orderReference": order_reference,
        "merchantSignature": generate_check_status_signature(order_reference),
        "apiVersion": 1,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(WAYFORPAY_API_URL, json=payload)
        response.raise_for_status()
        data = response.json()

    if not isinstance(data, dict):
        raise ValueError("Invalid WayForPay status response")
    return data


async def _apply_wayforpay_status_response(
    db: AsyncSession, payment: Payment, data: dict
) -> bool:
    normalized_data = {str(k).strip().lower(): v for k, v in data.items()}

    def value(key: str) -> str:
        raw = normalized_data.get(key.lower())
        if raw is None:
            return ""
        text = str(raw).strip()
        return "" if text.lower() in {"none", "null"} else text

    response_data = {
        "merchantAccount": value("merchantAccount"),
        "orderReference": value("orderReference"),
        "merchantSignature": value("merchantSignature"),
        "amount": value("amount"),
        "currency": value("currency"),
        "authCode": value("authCode"),
        "cardPan": value("cardPan"),
        "transactionStatus": value("transactionStatus"),
        "reasonCode": value("reasonCode"),
        "reason": value("reason"),
        "createdDate": value("createdDate"),
        "processingDate": value("processingDate"),
        "paymentSystem": value("paymentSystem"),
    }

    if response_data["merchantAccount"] != settings.WAYFORPAY_MERCHANT_ACCOUNT:
        raise ValueError("Invalid merchant account")
    if response_data["orderReference"] != payment.order_reference:
        raise ValueError("Invalid order reference")
    if response_data["currency"] and response_data["currency"] != payment.currency:
        raise ValueError("Invalid currency")
    if response_data["amount"] and not _amount_matches(response_data["amount"], payment.amount):
        raise ValueError("Invalid amount")
    if not verify_callback_signature(response_data):
        raise ValueError("Invalid signature")

    normalized_status = response_data["transactionStatus"].lower()
    if normalized_status in {"approved", "success"}:
        payment.status = PaymentStatus.APPROVED
    elif normalized_status == "refunded":
        payment.status = PaymentStatus.REFUNDED
    elif normalized_status in {"declined", "expired", "voided", "reversed"}:
        payment.status = PaymentStatus.DECLINED
    else:
        payment.status = PaymentStatus.PENDING

    payment.wayforpay_response = data
    await db.flush()
    return payment.status != PaymentStatus.PENDING


def _amount_matches(response_amount: str, payment_amount: int) -> bool:
    try:
        return Decimal(response_amount.replace(",", ".")) == Decimal(payment_amount)
    except (InvalidOperation, ValueError):
        return False


def _payment_deadline(payment: Payment) -> datetime:
    created_at = payment.created_at or datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return created_at + timedelta(seconds=settings.WAYFORPAY_ORDER_TIMEOUT)


async def handle_payment_callback(db: AsyncSession, data: dict) -> dict:
    normalized_data = {str(k).strip().lower(): v for k, v in data.items()}
    normalized_compact = {
        "".join(ch for ch in str(k).strip().lower() if ch.isalnum()): v
        for k, v in data.items()
    }

    def value(key: str) -> str:
        raw = normalized_data.get(key, normalized_compact.get(key))
        if raw is None:
            return ""
        text = str(raw).strip()
        return "" if text.lower() in {"none", "null"} else text

    data = {
        "merchantAccount": value("merchantaccount"),
        "orderReference": value("orderreference"),
        "merchantSignature": value("merchantsignature"),
        "amount": value("amount"),
        "currency": value("currency"),
        "authCode": value("authcode"),
        "cardPan": value("cardpan"),
        "transactionStatus": value("transactionstatus"),
        "reasonCode": value("reasoncode"),
        "reason": value("reason"),
        "email": value("email"),
        "phone": value("phone"),
        "createdDate": value("createddate"),
        "processingDate": value("processingdate"),
        "paymentSystem": value("paymentsystem"),
    }

    if not verify_callback_signature(data):
        raise ValueError("Invalid signature")
    if data.get("merchantAccount", "") != settings.WAYFORPAY_MERCHANT_ACCOUNT:
        raise ValueError("Invalid merchant account")

    order_ref = data.get("orderReference", "")
    result = await db.execute(
        select(Payment).where(Payment.order_reference == order_ref)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise ValueError("Payment not found")

    tx_status = str(data.get("transactionStatus", ""))
    normalized_status = tx_status.lower()
    if normalized_status in {"approved", "success"}:
        payment.status = PaymentStatus.APPROVED
    elif normalized_status == "refunded":
        payment.status = PaymentStatus.REFUNDED
    elif normalized_status in {"declined", "expired", "voided", "reversed"}:
        payment.status = PaymentStatus.DECLINED
    elif payment.status == PaymentStatus.PENDING:
        payment.status = PaymentStatus.PENDING

    payment.wayforpay_response = data
    await db.flush()

    response_time = int(time.time())
    response_status = "accept"
    response_signature = generate_callback_response_signature(
        order_ref, response_status, response_time
    )

    return {
        "orderReference": order_ref,
        "status": response_status,
        "time": response_time,
        "signature": response_signature,
    }


async def get_user_payments(db: AsyncSession, user_id: uuid.UUID) -> list[Payment]:
    result = await db.execute(
        select(Payment)
        .where(
            Payment.user_id == user_id,
            Payment.status.in_([PaymentStatus.APPROVED, PaymentStatus.REFUNDED]),
        )
        .order_by(Payment.created_at.desc())
    )
    return list(result.scalars().all())


async def get_user_payment_by_order_reference(
    db: AsyncSession, user_id: uuid.UUID, order_reference: str
) -> Payment | None:
    result = await db.execute(
        select(Payment).where(
            Payment.user_id == user_id, Payment.order_reference == order_reference
        )
    )
    return result.scalar_one_or_none()
