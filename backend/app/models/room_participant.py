import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class ParticipantRole(str, enum.Enum):
    HOST = "host"
    LISTENER = "listener"


class RoomParticipant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "room_participants"

    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE")
    )
    user_name: Mapped[str] = mapped_column(String(100))
    session_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    role: Mapped[ParticipantRole] = mapped_column(
        Enum(ParticipantRole), default=ParticipantRole.LISTENER
    )
    is_online: Mapped[bool] = mapped_column(Boolean, default=True)

    room = relationship("Room", back_populates="participants")
