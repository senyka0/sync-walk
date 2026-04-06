import uuid

from pydantic import BaseModel


class RoomCreateRequest(BaseModel):
    tour_id: uuid.UUID


class RoomCreateResponse(BaseModel):
    id: uuid.UUID
    tour_id: uuid.UUID
    access_code: str
    host_name: str

    model_config = {"from_attributes": True}


class RoomJoinResponse(BaseModel):
    id: uuid.UUID
    tour_id: uuid.UUID
    access_code: str
    host_name: str
    status: str

    model_config = {"from_attributes": True}


class ParticipantResponse(BaseModel):
    id: uuid.UUID
    user_name: str
    role: str
    is_online: bool

    model_config = {"from_attributes": True}


class TransferHostRequest(BaseModel):
    room_id: uuid.UUID
    new_host_id: uuid.UUID
