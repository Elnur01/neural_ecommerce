"""
Authentication router — signup, login, and current user profile.
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.database import get_db
from app.models.models import User, Cart
from app.schemas.schemas import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
    UserProfile,
)
from app.services.segmentation import compute_segments, parse_device_from_user_agent

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Helpers ───────────────────────────────────────────────────────────
def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: DBSession = Depends(get_db)
) -> User:
    """FastAPI dependency — extracts and validates the current user from JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        customer_id: str = payload.get("sub")
        if customer_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.customer_id == customer_id).first()
    if user is None:
        raise credentials_exception
    return user


# ── Endpoints ─────────────────────────────────────────────────────────
@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, request: Request, db: DBSession = Depends(get_db)):
    """
    Register a new user.  Runs the segmentation engine on signup inputs
    to populate all demographic fields immediately.
    """
    # Check for existing email
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    customer_id = uuid.uuid4()

    # Parse device from User-Agent
    ua_string = request.headers.get("user-agent", "")
    preferred_device = parse_device_from_user_agent(ua_string)

    # Compute all derived demographic segments
    segments = compute_segments(
        age=body.age,
        gender=body.gender,
        city=body.city,
        monthly_shopping_frequency=body.monthly_shopping_frequency,
        last_online_purchase_date=body.last_online_purchase_date,
        save_card=body.save_card,
        preferred_device=preferred_device,
        customer_id_seed=str(customer_id),
    )

    # Create user record
    user = User(
        customer_id=customer_id,
        email=body.email,
        password_hash=_hash_password(body.password),
        credit_balance=12000.00,
        **segments,
    )
    db.add(user)

    # Create empty cart for the user
    cart = Cart(customer_id=customer_id)
    db.add(cart)

    db.commit()
    db.refresh(user)

    token = _create_access_token({"sub": str(user.customer_id)})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: DBSession = Depends(get_db)):
    """Authenticate and return a JWT access token."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not _verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    token = _create_access_token({"sub": str(user.customer_id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserProfile)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's full profile (all demographic fields)."""
    return current_user
