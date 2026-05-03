"""
Application configuration — loads environment variables via python-dotenv.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ── Database ──────────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/ecommerce_research",
    )

    # ── Supabase ──────────────────────────────────────────────────────
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # ── JWT / Auth ────────────────────────────────────────────────────
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )

    # ── CORS ──────────────────────────────────────────────────────────
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # ── General ───────────────────────────────────────────────────────
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"


settings = Settings()
