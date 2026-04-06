import json

import redis.asyncio as aioredis

from app.config import settings

redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


class RoomStateManager:
    PREFIX = "room:"

    @staticmethod
    async def set_state(room_id: str, state: dict, ttl: int = 86400) -> None:
        key = f"{RoomStateManager.PREFIX}{room_id}"
        await redis_client.set(key, json.dumps(state), ex=ttl)

    @staticmethod
    async def get_state(room_id: str) -> dict | None:
        key = f"{RoomStateManager.PREFIX}{room_id}"
        data = await redis_client.get(key)
        if data:
            return json.loads(data)
        return None

    @staticmethod
    async def update_field(room_id: str, field: str, value) -> None:
        state = await RoomStateManager.get_state(room_id)
        if state:
            state[field] = value
            await RoomStateManager.set_state(room_id, state)

    @staticmethod
    async def delete_state(room_id: str) -> None:
        key = f"{RoomStateManager.PREFIX}{room_id}"
        await redis_client.delete(key)
