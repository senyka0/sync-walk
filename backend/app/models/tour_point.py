import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin


class TourPoint(Base, UUIDMixin):
    __tablename__ = "tour_points"

    tour_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tours.id", ondelete="CASCADE")
    )
    order_index: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    title_uk: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str] = mapped_column(Text)
    description_uk: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    audio_url: Mapped[str] = mapped_column(String(500), default="")
    audio_url_uk: Mapped[str | None] = mapped_column(
        String(500), nullable=True, default=None
    )

    @property
    def audio_by_language(self) -> dict[str, str]:
        en_audio = self.audio_url or ""
        uk_audio = self.audio_url_uk or en_audio
        return {"en": en_audio, "uk": uk_audio}

    tour = relationship("Tour", back_populates="points")
