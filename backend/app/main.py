"""
Neural E-commerce — FastAPI application entry point.

Research data collection platform for capturing demographic
and sequential behavioral data in a simulated e-commerce environment.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, products, cart, orders, events, reviews, coupons, scenario, surveys

# ── App instance ──────────────────────────────────────────────────────
app = FastAPI(
    title="Neural E-commerce API",
    description="Research data collection backend for tech-gadget e-commerce simulation.",
    version="0.1.0",
)

# ── CORS ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
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


# ── Health check ──────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health_check():
    """Simple health check endpoint for monitoring and deployment probes."""
    return {"status": "ok", "service": "neural-ecommerce-api"}
