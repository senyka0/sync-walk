import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.tour import City, Tour


async def get_tours(
    db: AsyncSession,
    city: str | None = None,
) -> list[Tour]:
    query = select(Tour).where(Tour.is_published.is_(True))

    if city:
        query = query.where(Tour.city == City(city))

    query = query.order_by(Tour.title.asc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_tour_by_id(db: AsyncSession, tour_id: uuid.UUID) -> Tour | None:
    result = await db.execute(
        select(Tour).where(Tour.id == tour_id).options(selectinload(Tour.points))
    )
    return result.scalar_one_or_none()
