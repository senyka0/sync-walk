import time
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.payment import GroupType, Payment, PaymentStatus
from app.models.tour import Tour
from app.schemas.payment import PaymentCreateResponse
from app.services.wayforpay import (
    generate_callback_response_signature,
    generate_signature,
    verify_callback_signature,
)


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
