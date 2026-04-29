import uuid
import re
import time

import httpx
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import TokenResponse, UserRegister, UserResponse

GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
_google_jwks_cache: dict | None = None
_google_jwks_cache_until: float = 0


def _token_response_for_user(user: User) -> TokenResponse:
    token_data = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserResponse.model_validate(user),
    )


def _parse_max_age(cache_control: str | None) -> int:
    if not cache_control:
        return 3600
    match = re.search(r"max-age=(\d+)", cache_control)
    if not match:
        return 3600
    return int(match.group(1))


async def _get_google_jwks() -> dict:
    global _google_jwks_cache, _google_jwks_cache_until
    now = time.time()
    if _google_jwks_cache is not None and now < _google_jwks_cache_until:
        return _google_jwks_cache

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(GOOGLE_JWKS_URL)
        response.raise_for_status()
        jwks = response.json()
        ttl = _parse_max_age(response.headers.get("cache-control"))

    _google_jwks_cache = jwks
    _google_jwks_cache_until = now + ttl
    return jwks


async def _verify_google_id_token(id_token: str) -> dict:
    if not settings.GOOGLE_CLIENT_ID:
        raise ValueError("Google auth is not configured")

    try:
        header = jwt.get_unverified_header(id_token)
    except JWTError as exc:
        raise ValueError("Invalid Google token") from exc

    kid = header.get("kid")
    if not kid:
        raise ValueError("Invalid Google token")

    try:
        jwks = await _get_google_jwks()
    except httpx.HTTPError as exc:
        raise ValueError("Google token verification is unavailable") from exc

    key = next((item for item in jwks.get("keys", []) if item.get("kid") == kid), None)
    if key is None:
        raise ValueError("Invalid Google token")

    try:
        payload = jwt.decode(
            id_token,
            key,
            algorithms=[header.get("alg", "RS256")],
            audience=settings.GOOGLE_CLIENT_ID,
        )
    except JWTError as exc:
        raise ValueError("Invalid Google token") from exc

    email = payload.get("email")
    sub = payload.get("sub")
    iss = payload.get("iss")
    if not email or not sub:
        raise ValueError("Google account is missing required data")
    if iss not in {"accounts.google.com", "https://accounts.google.com"}:
        raise ValueError("Invalid Google token")
    if payload.get("email_verified") in (False, "false"):
        raise ValueError("Google email is not verified")

    return {
        "email": email,
        "google_id": sub,
        "name": payload.get("name") or email.split("@")[0],
        "picture": payload.get("picture"),
    }


async def register_user(db: AsyncSession, data: UserRegister) -> TokenResponse:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise ValueError("Email already registered")

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    await db.flush()
    return _token_response_for_user(user)

async def login_user(db: AsyncSession, email: str, password: str) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise ValueError("Invalid credentials")

    return _token_response_for_user(user)


async def google_auth_user(db: AsyncSession, id_token: str) -> TokenResponse:
    google_data = await _verify_google_id_token(id_token)
    google_id = google_data["google_id"]
    email = google_data["email"]
    name = google_data["name"]

    existing_google = await db.execute(select(User).where(User.google_id == google_id))
    user = existing_google.scalar_one_or_none()
    if user:
        return _token_response_for_user(user)

    existing_email = await db.execute(select(User).where(User.email == email))
    user = existing_email.scalar_one_or_none()
    if user:
        if user.google_id and user.google_id != google_id:
            raise ValueError("This email is already linked to another Google account")
        user.google_id = google_id
        return _token_response_for_user(user)

    user = User(
        name=name,
        email=email,
        google_id=google_id,
        password_hash=hash_password(uuid.uuid4().hex),
    )
    db.add(user)
    await db.flush()
    return _token_response_for_user(user)


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
