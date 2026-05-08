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
    WAYFORPAY_MERCHANT_DOMAIN: str = "syncwalk.app"
    WAYFORPAY_MERCHANT_AUTH_TYPE: str = "SimpleSignature"
    WAYFORPAY_MERCHANT_TRANSACTION_SECURE_TYPE: str = "AUTO"
    WAYFORPAY_ORDER_TIMEOUT: int = 86400
    WAYFORPAY_STATUS_CHECK_INTERVAL_SECONDS: int = 30
    WAYFORPAY_LANGUAGE: str = "UA"

    DOMAIN: str = "syncwalk.app"
    FRONTEND_PUBLIC_URL: str = "https://syncwalk.app"
    BACKEND_PUBLIC_URL: str = "https://syncwalk.app"

    AUDIO_BASE_URL: str = "/audio"
    AUDIO_DIR: str | None = None

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_FEEDBACK_CHAT_IDS: str = ""

    class Config:
        env_file = Path(__file__).resolve().parents[2] / ".env"

    @property
    def telegram_feedback_chat_ids(self) -> list[str]:
        return [
            chat_id.strip()
            for chat_id in self.TELEGRAM_FEEDBACK_CHAT_IDS.split(",")
            if chat_id.strip()
        ]


settings = Settings()
