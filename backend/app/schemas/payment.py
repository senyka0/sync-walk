import uuid

from pydantic import BaseModel


class PaymentCreateRequest(BaseModel):
    tour_id: uuid.UUID
    group_type: str


class PaymentCreateResponse(BaseModel):
    payment_url: str
    return_url: str
    service_url: str
    merchant_auth_type: str
    merchant_transaction_secure_type: str
    order_timeout: int
    language: str
    order_reference: str
    merchant_account: str
    merchant_domain_name: str
    order_date: int
    amount: int
    currency: str
    product_name: list[str]
    product_count: list[int]
    product_price: list[int]
    merchant_signature: str


class PaymentStatusResponse(BaseModel):
    id: uuid.UUID
    tour_id: uuid.UUID
    order_reference: str
    amount: int
    currency: str
    status: str
    group_type: str

    model_config = {"from_attributes": True}
