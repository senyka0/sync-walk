import socketio

from app.config import settings

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=[
        f"http://{settings.DOMAIN}",
        f"https://{settings.DOMAIN}",
        "http://localhost:3000",
    ],
    logger=False,
    engineio_logger=False,
)
