from fastapi import APIRouter

from app.api.v1 import auth, payments, rooms, tours

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(tours.router, prefix="/tours", tags=["tours"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["rooms"])
