import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.tour import TourDetailResponse, TourListResponse
from app.services.tour import get_tour_by_id, get_tours

router = APIRouter()


@router.get("", response_model=list[TourListResponse])
async def list_tours(
    city: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    tours = await get_tours(db, city=city)
    return [TourListResponse.model_validate(t) for t in tours]


@router.get("/{tour_id}", response_model=TourDetailResponse)
async def get_tour(tour_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    tour = await get_tour_by_id(db, tour_id)
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    return TourDetailResponse.model_validate(tour)
