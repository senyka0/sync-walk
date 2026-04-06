import uuid

from pydantic import BaseModel


class TourPointResponse(BaseModel):
    id: uuid.UUID
    order_index: int
    title: str
    title_uk: str | None = None
    description: str
    description_uk: str | None = None
    latitude: float
    longitude: float
    audio_url: str
    audio_url_uk: str | None = None

    model_config = {"from_attributes": True}


class TourListResponse(BaseModel):
    id: uuid.UUID
    city: str
    title: str
    title_uk: str | None = None
    description: str
    description_uk: str | None = None
    cover_image_url: str
    duration_min: int
    individual_price: int
    group_price: int
    max_participants: int
    stops_count: int

    model_config = {"from_attributes": True}


class TourDetailResponse(TourListResponse):
    points: list[TourPointResponse]
