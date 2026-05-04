from pathlib import Path

from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.core.database import engine
from app.core.redis import redis_client
from app.sockets.server import sio
from app.sockets import events  # noqa: F401
from app.sockets.sync import start_sync_loop
from app.api.v1.router import api_router
from app.services.payment import (
    start_pending_payment_status_monitors,
    stop_payment_status_monitors,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await redis_client.ping()
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
    import logging
    logging.getLogger("uvicorn.error").warning("AUDIO_DIR not set or not a directory; /audio mount skipped")


@app.get("/health")
async def health():
    return {"status": "ok"}


socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
