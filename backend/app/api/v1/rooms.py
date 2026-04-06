import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.room import (
    ParticipantResponse,
    RoomCreateRequest,
    RoomCreateResponse,
    RoomJoinResponse,
    TransferHostRequest,
)
from app.services.room import create_room, finish_room, get_room_by_code, transfer_host

router = APIRouter()


@router.post("/create", response_model=RoomCreateResponse)
async def create(
    data: RoomCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room = await create_room(db, user.id, data.tour_id)
    return RoomCreateResponse(
        id=room.id,
        tour_id=room.tour_id,
        access_code=room.access_code,
        host_name=user.name,
    )


@router.get("/{access_code}", response_model=RoomJoinResponse)
async def get_room(access_code: str, db: AsyncSession = Depends(get_db)):
    room = await get_room_by_code(db, access_code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return RoomJoinResponse(
        id=room.id,
        tour_id=room.tour_id,
        access_code=room.access_code,
        host_name=room.host.name,
        status=room.status.value,
    )


@router.get("/{access_code}/participants", response_model=list[ParticipantResponse])
async def get_participants(access_code: str, db: AsyncSession = Depends(get_db)):
    room = await get_room_by_code(db, access_code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return [ParticipantResponse.model_validate(p) for p in room.participants]


@router.post("/transfer-host")
async def transfer(
    data: TransferHostRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await transfer_host(db, data.room_id, data.new_host_id)
    return {"status": "ok"}


@router.post("/{room_id}/finish")
async def finish(
    room_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await finish_room(db, room_id)
    return {"status": "ok"}
