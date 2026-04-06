import hashlib
import hmac
from decimal import Decimal, InvalidOperation

from app.config import settings


def generate_signature(params: dict) -> str:
    sign_fields = [
        params["merchantAccount"],
        params["merchantDomainName"],
        params["orderReference"],
        str(params["orderDate"]),
        str(params["amount"]),
        params["currency"],
    ]

    for name in params.get("productName", []):
        sign_fields.append(name)
    for count in params.get("productCount", []):
        sign_fields.append(str(count))
    for price in params.get("productPrice", []):
        sign_fields.append(str(price))

    sign_string = ";".join(sign_fields)
    return hmac.new(
        settings.WAYFORPAY_MERCHANT_SECRET.encode(),
        sign_string.encode(),
        hashlib.md5,
    ).hexdigest()


def verify_callback_signature(data: dict) -> bool:
    merchant_account = str(data.get("merchantAccount", "")).strip()
    order_reference = str(data.get("orderReference", "")).strip()
    amount_raw = str(data.get("amount", "")).strip()
    currency = str(data.get("currency", "")).strip()
    auth_code = str(data.get("authCode", "")).strip()
    card_pan = str(data.get("cardPan", "")).strip()
    transaction_status = str(data.get("transactionStatus", "")).strip()
    reason_code = str(data.get("reasonCode", "")).strip()
    reason = str(data.get("reason", "")).strip()
    provided_sig = str(data.get("merchantSignature", "")).strip().lower()

    if not provided_sig:
        return False

    amount_variants = [amount_raw]
    try:
        amount_decimal = Decimal(amount_raw)
        amount_variants.extend(
            [
                format(amount_decimal, "f"),
                format(amount_decimal.normalize(), "f"),
                f"{amount_decimal:.2f}",
            ]
        )
    except (InvalidOperation, ValueError):
        pass

    reason_variants = [reason_code]
    if reason and reason not in reason_variants:
        reason_variants.append(reason)

    for amount in dict.fromkeys(amount_variants):
        normalized_amount = amount.replace(",", ".")
        normalized_decimal = None
        try:
            normalized_decimal = Decimal(normalized_amount)
        except (InvalidOperation, ValueError):
            pass

        amount_candidates = [amount, normalized_amount]
        if normalized_decimal is not None:
            amount_candidates.extend(
                [
                    f"{normalized_decimal:.2f}",
                    format(normalized_decimal.normalize(), "f"),
                ]
            )

        for reason_value in dict.fromkeys(reason_variants):
            for amount_candidate in dict.fromkeys(amount_candidates):
                sign_string = ";".join(
                    [
                        merchant_account,
                        order_reference,
                        amount_candidate,
                        currency,
                        auth_code,
                        card_pan,
                        transaction_status,
                        reason_value,
                    ]
                )
                candidates = [
                    hmac.new(
                        settings.WAYFORPAY_MERCHANT_SECRET.encode(),
                        sign_string.encode(),
                        hashlib.md5,
                    ).hexdigest(),
                    hashlib.md5(
                        f"{sign_string}{settings.WAYFORPAY_MERCHANT_SECRET}".encode()
                    ).hexdigest(),
                    hashlib.md5(
                        f"{settings.WAYFORPAY_MERCHANT_SECRET}{sign_string}".encode()
                    ).hexdigest(),
                ]
                if any(candidate.lower() == provided_sig for candidate in candidates):
                    return True

    return False


def generate_callback_response_signature(
    order_reference: str, status: str, timestamp: int
) -> str:
    sign_string = f"{order_reference};{status};{timestamp}"
    return hmac.new(
        settings.WAYFORPAY_MERCHANT_SECRET.encode(),
        sign_string.encode(),
        hashlib.md5,
    ).hexdigest()
