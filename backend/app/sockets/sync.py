import asyncio
import logging

from app.core.redis import RoomStateManager
from app.sockets.server import sio

logger = logging.getLogger(__name__)

SYNC_INTERVAL_SECONDS = 1


async def sync_loop():
    while True:
        try:
            rooms = sio.manager.rooms.get("/", {})
            for room_id in rooms:
                if room_id is None:
                    continue
                state = await RoomStateManager.get_state(room_id)
                if state and state.get("is_playing"):
                    state["current_time_ms"] = state.get("current_time_ms", 0) + (
                        SYNC_INTERVAL_SECONDS * 1000
                    )
                    await RoomStateManager.set_state(room_id, state)
                    await sio.emit("sync_state", state, room=room_id)
        except Exception:
            logger.exception("Error in sync loop")

        await asyncio.sleep(SYNC_INTERVAL_SECONDS)


def start_sync_loop():
    asyncio.ensure_future(sync_loop())
