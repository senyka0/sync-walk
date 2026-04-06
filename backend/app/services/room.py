import random
import string
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.redis import RoomStateManager
from app.models.room import Room, RoomStatus
from app.models.room_participant import ParticipantRole, RoomParticipant
from app.models.user import User


def _generate_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


async def _generate_unique_code(db: AsyncSession, attempts: int = 10) -> str:
    for _ in range(attempts):
        code = _generate_code()
        result = await db.execute(select(Room.id).where(Room.access_code == code).limit(1))
        if result.scalar_one_or_none() is None:
            return code
    raise ValueError("Could not generate unique room code")


async def create_room(db: AsyncSession, user_id: uuid.UUID, tour_id: uuid.UUID) -> Room:
    user = await db.get(User, user_id)
    if not user:
        raise ValueError("User not found")

    code = await _generate_unique_code(db)
    room = Room(
        tour_id=tour_id,
        host_id=user_id,
        access_code=code,
        status=RoomStatus.WAITING,
    )
    db.add(room)
    await db.flush()

    host_participant = RoomParticipant(
        room_id=room.id,
        user_name=user.name,
        role=ParticipantRole.HOST,
        is_online=True,
    )
    db.add(host_participant)
    await db.flush()

    await RoomStateManager.set_state(str(room.id), {
        "room_id": str(room.id),
        "status": "waiting",
        "current_track_index": 0,
        "current_time_ms": 0,
        "is_playing": False,
        "host_id": str(user_id),
    })

    return room


async def get_room_by_code(db: AsyncSession, access_code: str) -> Room | None:
    result = await db.execute(
        select(Room)
        .where(Room.access_code == access_code)
        .options(selectinload(Room.participants), selectinload(Room.host))
    )
    return result.scalar_one_or_none()


async def join_room(
    db: AsyncSession, room_id: uuid.UUID, user_name: str, session_id: str | None = None
) -> RoomParticipant:
    participant = RoomParticipant(
        room_id=room_id,
        user_name=user_name,
        session_id=session_id,
        role=ParticipantRole.LISTENER,
        is_online=True,
    )
    db.add(participant)
    await db.flush()
    return participant


async def transfer_host(
    db: AsyncSession, room_id: uuid.UUID, new_host_id: uuid.UUID
) -> None:
    result = await db.execute(
        select(RoomParticipant).where(RoomParticipant.room_id == room_id)
    )
    participants = result.scalars().all()

    for p in participants:
        if p.id == new_host_id:
            p.role = ParticipantRole.HOST
        else:
            p.role = ParticipantRole.LISTENER

    await RoomStateManager.update_field(str(room_id), "host_id", str(new_host_id))
    await db.flush()


async def finish_room(db: AsyncSession, room_id: uuid.UUID) -> None:
    room = await db.get(Room, room_id)
    if room:
        room.status = RoomStatus.FINISHED
        await db.flush()
        await RoomStateManager.delete_state(str(room_id))
