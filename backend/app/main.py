"""
Neural E-commerce — FastAPI application entry point.

Research data collection platform for capturing demographic
and sequential behavioral data in a simulated e-commerce environment.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

from app.routers import auth, products, cart, orders, events, reviews, coupons, scenario, surveys, inference, agent, websocket_router, admin
from app.services import lstm_inference, agent_service

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup."""
    # Ensure any new SQLAlchemy models (e.g. InterventionLog) exist in the DB
    from app.database import engine, Base
    import app.models.models  # noqa: F401 — registers all models with Base
    Base.metadata.create_all(bind=engine)

    # Store the running event loop so BackgroundTask threads can push via WebSocket
    websocket_router.manager.set_loop(asyncio.get_running_loop())

    if settings.LSTM_CHECKPOINT_PATH and settings.LSTM_SESSIONS_CSV and settings.LSTM_DEMOGRAPHICS_CSV:
        try:
            lstm_inference.initialize(
                checkpoint_path=settings.LSTM_CHECKPOINT_PATH,
                sessions_csv=settings.LSTM_SESSIONS_CSV,
                demographics_csv=settings.LSTM_DEMOGRAPHICS_CSV,
            )
        except Exception as exc:
            logger.warning("LSTM model failed to load: %s — inference endpoints will return 503", exc)
    else:
        logger.warning(
            "LSTM paths not configured. Set LSTM_CHECKPOINT_PATH, LSTM_SESSIONS_CSV, "
            "LSTM_DEMOGRAPHICS_CSV in .env to enable inference."
        )

    # Initialize LangGraph agent
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "YOUR_GEMINI_API_KEY_HERE":
        try:
            agent_service.initialize(settings.GEMINI_API_KEY)
        except Exception as exc:
            logger.warning("LangGraph agent failed to load: %s — agent endpoints will return 503", exc)
    else:
        logger.warning(
            "GEMINI_API_KEY not set. Add your key to backend/.env to enable the agent."
        )
    yield


# ── App instance ──────────────────────────────────────────────────────
app = FastAPI(
    title="Neural E-commerce API",
    description="Research data collection backend for tech-gadget e-commerce simulation.",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(products.router, prefix="/products", tags=["Products"])
app.include_router(cart.router, prefix="/cart", tags=["Cart"])
app.include_router(orders.router, prefix="/orders", tags=["Orders"])
app.include_router(events.router, prefix="/events", tags=["Events"])
app.include_router(reviews.router, prefix="/reviews", tags=["Reviews"])
app.include_router(coupons.router, prefix="/coupons", tags=["Coupons"])
app.include_router(scenario.router, prefix="/scenario", tags=["Scenario"])
app.include_router(surveys.router, prefix="/surveys", tags=["Surveys"])
app.include_router(inference.router, prefix="/inference", tags=["Inference"])
app.include_router(agent.router, prefix="/agent", tags=["Agent"])
app.include_router(websocket_router.router, tags=["WebSocket"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])


# ── Health check ──────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health_check():
    """Simple health check endpoint for monitoring and deployment probes."""
    return {"status": "ok", "service": "neural-ecommerce-api"}
