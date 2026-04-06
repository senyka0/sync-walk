import asyncio
import logging

from app.core.redis import RoomStateManager
from app.sockets.server import sio

logger = logging.getLogger(__name__)

connected_users: dict[str, dict] = {}


@sio.event
async def connect(sid, environ, auth):
    logger.info("Client connected: %s", sid)
    connected_users[sid] = {"room_id": None, "user_name": None}


@sio.event
async def disconnect(sid):
    logger.info("Client disconnected: %s", sid)
    user_data = connected_users.pop(sid, {})
    room_id = user_data.get("room_id")
    if room_id:
        await sio.leave_room(sid, room_id)
        await sio.emit(
            "participant_left",
            {"sid": sid, "name": user_data.get("user_name")},
            room=room_id,
        )


@sio.on("join_room")
async def handle_join_room(sid, data):
    room_id = data.get("room_id")
    user_name = data.get("user_name", "Guest")

    await sio.enter_room(sid, room_id)
    connected_users[sid] = {"room_id": room_id, "user_name": user_name}

    await sio.emit(
        "participant_joined",
        {"sid": sid, "name": user_name},
        room=room_id,
        skip_sid=sid,
    )

    state = await RoomStateManager.get_state(room_id)
    if state:
        await sio.emit("sync_state", state, to=sid)


@sio.on("leave_room")
async def handle_leave_room(sid, data):
    room_id = data.get("room_id")
    user_data = connected_users.get(sid, {})

    await sio.leave_room(sid, room_id)
    connected_users[sid] = {"room_id": None, "user_name": None}

    await sio.emit(
        "participant_left",
        {"sid": sid, "name": user_data.get("user_name")},
        room=room_id,
    )


@sio.on("cmd_play")
async def handle_play(sid, data):
    room_id = data.get("room_id")
    timestamp_ms = data.get("timestamp_ms", 0)

    await RoomStateManager.update_field(room_id, "is_playing", True)
    await RoomStateManager.update_field(room_id, "current_time_ms", timestamp_ms)

    await sio.emit(
        "sync_play",
        {"timestamp_ms": timestamp_ms},
        room=room_id,
        skip_sid=sid,
    )


@sio.on("cmd_pause")
async def handle_pause(sid, data):
    room_id = data.get("room_id")
    timestamp_ms = data.get("timestamp_ms", 0)

    await RoomStateManager.update_field(room_id, "is_playing", False)
    await RoomStateManager.update_field(room_id, "current_time_ms", timestamp_ms)

    await sio.emit(
        "sync_pause",
        {"timestamp_ms": timestamp_ms},
        room=room_id,
        skip_sid=sid,
    )


@sio.on("cmd_seek")
async def handle_seek(sid, data):
    room_id = data.get("room_id")
    timestamp_ms = data.get("timestamp_ms", 0)

    await RoomStateManager.update_field(room_id, "current_time_ms", timestamp_ms)

    await sio.emit(
        "sync_seek",
        {"timestamp_ms": timestamp_ms},
        room=room_id,
        skip_sid=sid,
    )


@sio.on("cmd_next_track")
async def handle_next_track(sid, data):
    room_id = data.get("room_id")
    track_index = data.get("track_index")

    await RoomStateManager.update_field(room_id, "is_playing", False)
    await RoomStateManager.update_field(room_id, "current_track_index", track_index)
    await RoomStateManager.update_field(room_id, "current_time_ms", 0)

    await sio.emit(
        "sync_track_change",
        {"track_index": track_index, "timestamp_ms": 0},
        room=room_id,
        skip_sid=sid,
    )


@sio.on("host_busy")
async def handle_host_busy(sid, data):
    room_id = data.get("room_id")
    reason = data.get("reason", "unknown")

    await RoomStateManager.update_field(room_id, "is_playing", False)

    await sio.emit(
        "ui_notify",
        {"type": "host_busy", "reason": reason, "message": "Host is busy. Transfer control?"},
        room=room_id,
        skip_sid=sid,
    )


@sio.on("transfer_host")
async def handle_transfer_host(sid, data):
    room_id = data.get("room_id")
    new_host_sid = data.get("new_host_sid")

    await RoomStateManager.update_field(room_id, "host_id", new_host_sid)

    await sio.emit(
        "host_transferred",
        {"new_host_sid": new_host_sid},
        room=room_id,
    )


@sio.on("request_sync")
async def handle_request_sync(sid, data):
    room_id = data.get("room_id")
    state = await RoomStateManager.get_state(room_id)
    if state:
        await sio.emit("sync_state", state, to=sid)


@sio.on("start_tour")
async def handle_start_tour(sid, data):
    room_id = data.get("room_id")

    await RoomStateManager.update_field(room_id, "status", "active")

    await sio.emit(
        "tour_started",
        {"room_id": room_id},
        room=room_id,
    )
