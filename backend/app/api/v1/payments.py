import logging
import json
from urllib.parse import parse_qsl

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.core.database import get_db
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import PaymentCreateRequest, PaymentCreateResponse, PaymentStatusResponse
from app.services.payment import (
    create_payment,
    get_user_payment_by_order_reference,
    get_user_payments,
    handle_payment_callback,
    start_payment_status_monitor,
)

router = APIRouter()
logger = logging.getLogger(__name__)


async def _extract_request_payload(request: Request) -> dict[str, str]:
    payload: dict[str, str] = {}
    content_type = request.headers.get("content-type", "").lower()
    raw_body = await request.body()
    decoded_body = raw_body.decode("utf-8", errors="ignore")

    if "application/json" in content_type:
        try:
            json_body = json.loads(decoded_body) if decoded_body else {}
            if isinstance(json_body, dict):
                payload.update(
                    {str(key): str(value) for key, value in json_body.items() if value is not None}
                )
        except json.JSONDecodeError:
            pass
    elif decoded_body:
        payload.update(dict(parse_qsl(decoded_body, keep_blank_values=True)))
        if len(payload) == 1:
            only_key, only_value = next(iter(payload.items()))
            key_candidate = only_key.strip()
            if only_value == "" and key_candidate.startswith("{") and key_candidate.endswith("}"):
                try:
                    json_body = json.loads(key_candidate)
                    if isinstance(json_body, dict):
                        payload = {
                            str(key): str(value)
                            for key, value in json_body.items()
                            if value is not None
                        }
                except json.JSONDecodeError:
                    pass
        if not payload and decoded_body.lstrip().startswith("{"):
            try:
                json_body = json.loads(decoded_body)
                if isinstance(json_body, dict):
                    payload.update(
                        {
                            str(key): str(value)
                            for key, value in json_body.items()
                            if value is not None
                        }
                    )
            except json.JSONDecodeError:
                pass

    query_payload = {
        str(key): str(value)
        for key, value in request.query_params.items()
        if value is not None
    }
    payload.update(query_payload)

    if not payload:
        logger.warning(
            "WayForPay payload empty: method=%s content_type=%s query=%s body_len=%d body_preview=%s",
            request.method,
            content_type,
            dict(request.query_params),
            len(raw_body),
            decoded_body[:300],
        )

    return payload


@router.post("/create", response_model=PaymentCreateResponse)
async def create(
    data: PaymentCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        response = await create_payment(db, user.id, data.tour_id, data.group_type)
        await db.commit()
        start_payment_status_monitor(response.order_reference)
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/callback")
async def callback(request: Request, db: AsyncSession = Depends(get_db)):
    data = await _extract_request_payload(request)
    try:
        return await handle_payment_callback(db, data)
    except ValueError as e:
        logger.warning("WayForPay callback rejected: %s", str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.api_route("/return", methods=["GET", "POST"])
async def payment_return(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await _extract_request_payload(request)

    order_reference = (
        request.query_params.get("orderRef")
        or request.query_params.get("orderReference")
        or payload.get("orderReference")
        or payload.get("orderRef")
    )
    tour_id = request.query_params.get("tourId")
    group_type = request.query_params.get("type")

    if order_reference and (not tour_id or not group_type):
        result = await db.execute(
            select(Payment).where(Payment.order_reference == order_reference)
        )
        payment = result.scalar_one_or_none()
        if payment:
            tour_id = tour_id or str(payment.tour_id)
            group_type = group_type or payment.group_type.value

    if not order_reference or not tour_id or not group_type:
        return RedirectResponse(url=f"{settings.FRONTEND_PUBLIC_URL}/", status_code=302)

    redirect_url = (
        f"{settings.FRONTEND_PUBLIC_URL}/pay/{tour_id}"
        f"?type={group_type}&orderRef={order_reference}"
    )
    return RedirectResponse(url=redirect_url, status_code=302)


@router.get("/my", response_model=list[PaymentStatusResponse])
async def my_payments(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payments = await get_user_payments(db, user.id)
    return [PaymentStatusResponse.model_validate(p) for p in payments]


@router.get("/order/{order_reference}", response_model=PaymentStatusResponse)
async def payment_by_order(
    order_reference: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payment = await get_user_payment_by_order_reference(db, user.id, order_reference)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return PaymentStatusResponse.model_validate(payment)
