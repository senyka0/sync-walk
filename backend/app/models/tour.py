import enum

from sqlalchemy import Boolean, Enum, Float, Integer, String, Text, func, select
from sqlalchemy.orm import Mapped, column_property, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.models.tour_point import TourPoint


class City(str, enum.Enum):
    KYIV = "kyiv"
    KHARKIV = "kharkiv"


class Tour(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tours"

    title: Mapped[str] = mapped_column(String(200))
    title_uk: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str] = mapped_column(Text)
    description_uk: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[City] = mapped_column(Enum(City))
    cover_image_url: Mapped[str] = mapped_column(String(500))
    duration_min: Mapped[int] = mapped_column(Integer)
    individual_price: Mapped[int] = mapped_column(Integer)
    group_price: Mapped[int] = mapped_column(Integer)
    max_participants: Mapped[int] = mapped_column(Integer, default=10)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    points = relationship(
        "TourPoint", back_populates="tour", order_by="TourPoint.order_index"
    )


stops_count_subquery = (
    select(func.count(TourPoint.id))
    .where(TourPoint.tour_id == Tour.id)
    .correlate_except(TourPoint)
    .scalar_subquery()
)

Tour.stops_count = column_property(stops_count_subquery)
