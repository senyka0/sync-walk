from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://syncwalk:changeme@localhost:5432/syncwalk"
    REDIS_URL: str = "redis://localhost:6379"

    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    GOOGLE_CLIENT_ID: str = ""

    WAYFORPAY_MERCHANT_ACCOUNT: str = ""
    WAYFORPAY_MERCHANT_SECRET: str = ""
    WAYFORPAY_MERCHANT_DOMAIN: str = "sync-walk.sbs"
    WAYFORPAY_MERCHANT_AUTH_TYPE: str = "SimpleSignature"
    WAYFORPAY_MERCHANT_TRANSACTION_SECURE_TYPE: str = "AUTO"
    WAYFORPAY_ORDER_TIMEOUT: int = 86400
    WAYFORPAY_LANGUAGE: str = "UA"

    DOMAIN: str = "sync-walk.sbs"
    FRONTEND_PUBLIC_URL: str = "https://sync-walk.sbs"
    BACKEND_PUBLIC_URL: str = "https://sync-walk.sbs"

    AUDIO_BASE_URL: str = "/audio"
    AUDIO_DIR: str | None = None

    class Config:
        env_file = Path(__file__).resolve().parents[2] / ".env"


settings = Settings()
