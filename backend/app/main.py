import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.core.database import engine
from app.core.redis import redis_client
from app.sockets.server import sio
from app.sockets.sync import start_sync_loop
from app.api.v1.router import api_router
from app.services.payment import (
    start_pending_payment_status_monitors,
    stop_payment_status_monitors,
)

logger = logging.getLogger("uvicorn.error")
STARTUP_RETRIES = 20
STARTUP_RETRY_DELAY_SECONDS = 1


async def _wait_for_redis() -> None:
    last_error: Exception | None = None
    for _ in range(STARTUP_RETRIES):
        try:
            await redis_client.ping()
            return
        except Exception as exc:
            last_error = exc
            await asyncio.sleep(STARTUP_RETRY_DELAY_SECONDS)
    if last_error is not None:
        raise last_error


async def _wait_for_database() -> None:
    last_error: Exception | None = None
    for _ in range(STARTUP_RETRIES):
        try:
            async with engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
            return
        except Exception as exc:
            last_error = exc
            await asyncio.sleep(STARTUP_RETRY_DELAY_SECONDS)
    if last_error is not None:
        raise last_error


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _wait_for_redis()
    await _wait_for_database()
    start_sync_loop()
    await start_pending_payment_status_monitors()
    try:
        yield
    finally:
        await stop_payment_status_monitors()
        await redis_client.aclose()
        await engine.dispose()


app = FastAPI(
    title="SyncWalk API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://{settings.DOMAIN}",
        f"https://{settings.DOMAIN}",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


def _resolve_audio_dir() -> Path | None:
    if settings.AUDIO_DIR:
        p = Path(settings.AUDIO_DIR)
        return p if p.is_dir() else None
    root = Path(__file__).resolve().parent.parent.parent
    for candidate in (root / "audio", root.parent / "audio"):
        if candidate.is_dir():
            return candidate
    return None


_audio_dir = _resolve_audio_dir()
if _audio_dir:
    app.mount("/audio", StaticFiles(directory=str(_audio_dir)), name="audio")
else:
    logger.warning("AUDIO_DIR not set or not a directory; /audio mount skipped")


@app.get("/health")
async def health():
    return {"status": "ok"}


socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
