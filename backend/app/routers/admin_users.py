from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import (
    user,
    meal,
    user_subscription,
    UserRole,
    SubscriptionPlan,
    SubscriptionStatus
)
from .auth import bcrypt_context


MONTHLY_PRICE = 9.90
ANNUAL_PRICE = 99.00


router = APIRouter(
    prefix="/admin/users",
    tags=["Admin Users"]
)


# =========================
# Helper functions
# =========================

def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))


def require_admin(current_user: user_dependency) -> dict:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user


def get_user_or_404(db: db_dependency, user_id: int) -> user:
    db_user = db.exec(
        select(user).where(user.user_id == user_id)
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return db_user


def map_role_for_frontend(db_user: user) -> Literal["admin", "nutritionist", "premium", "freemium"]:
    if db_user.role == UserRole.admin:
        return "admin"
    if db_user.role == UserRole.nutritionist:
        return "nutritionist"
    if db_user.role == UserRole.premium:
        return "premium"
    return "freemium"


def map_status_for_frontend(db_user: user) -> Literal["active", "suspended"]:
    return "suspended" if db_user.suspended else "active"


def get_last_active_for_user(
    db: db_dependency,
    user_id: int,
    fallback_dt: datetime
) -> datetime:
    # For convenience, last_active is defined as the most recent meal log time.
    latest_meal = db.exec(
        select(meal)
        .where(meal.user_id == user_id)
        .order_by(meal.consumed_at.desc())
    ).first()

    if latest_meal is not None:
        return latest_meal.consumed_at

    return fallback_dt


def build_user_response(db: db_dependency, db_user: user):
    return UserResponse(
        id=db_user.user_id,
        first_name=db_user.first_name,
        last_name=db_user.last_name,
        email=db_user.email,
        role=map_role_for_frontend(db_user),
        status=map_status_for_frontend(db_user),
        joined_at=db_user.created_at,
        last_active=get_last_active_for_user(
            db,
            db_user.user_id,
            db_user.created_at
        )
    )


def get_active_subscription(
    db: db_dependency,
    user_id: int
) -> user_subscription | None:
    return db.exec(
        select(user_subscription).where(
            user_subscription.user_id == user_id,
            user_subscription.status == SubscriptionStatus.active
        )
    ).first()


FrontendRole = Literal["admin", "nutritionist", "premium", "freemium"]
FrontendStatus = Literal["active", "suspended"]


# =========================
# Request / Response models
# =========================

class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    role: FrontendRole
    status: FrontendStatus
    joined_at: datetime
    last_active: datetime


class CreateAdminUserRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["admin", "nutritionist"]


class UpgradeUserRequest(BaseModel):
    role: Literal["premium"]
    plan: SubscriptionPlan


class DowngradeUserRequest(BaseModel):
    role: Literal["freemium"]


class ChangeRoleRequest(BaseModel):
    role: Literal["freemium"]


# =========================
# Endpoints
# =========================

@router.get(
    "/",
    response_model=list[UserResponse],
    status_code=status.HTTP_200_OK
)
async def get_admin_users(
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    users = db.exec(
        select(user).order_by(user.created_at.desc())
    ).all()

    return [build_user_response(db, u) for u in users]


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_admin_user(
    request: CreateAdminUserRequest,
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    existing_user = db.exec(
        select(user).where(user.email == request.email)
    ).first()

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists"
        )

    target_role = UserRole.admin if request.role == "admin" else UserRole.nutritionist

    new_user = user(
        first_name=request.first_name.strip(),
        last_name=request.last_name.strip(),
        email=request.email.strip().lower(),
        hashed_password=bcrypt_context.hash(request.password),
        role=target_role,
        suspended=False
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return build_user_response(db, new_user)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put(
    "/{user_id}/upgrade",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK
)
async def upgrade_user_to_premium(
    user_id: int,
    request: UpgradeUserRequest,
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    if request.role != "premium":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'premium'"
        )

    db_user = get_user_or_404(db, user_id)

    if db_user.user_id == int(current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot modify your own role with this endpoint"
        )

    if db_user.role == UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin user cannot be upgraded to premium"
        )

    existing_active_subscription = get_active_subscription(db, user_id)
    if existing_active_subscription is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an active subscription"
        )

    now = sg_now()

    subscription_price = MONTHLY_PRICE if request.plan == SubscriptionPlan.monthly else ANNUAL_PRICE


    # The admin user management page upgrades to monthly premium by default.
    new_subscription = user_subscription(
        user_id=user_id,
        plan=request.plan,
        status=SubscriptionStatus.active,
        price=subscription_price,
        currency="SGD",
        start_at=now,
        end_at=None,
        cancelled_at=None,
        created_at=now,
        updated_at=now
    )

    db_user.role = UserRole.premium
    db_user.premium_start = now
    db_user.premium_end = None

    try:
        db.add(new_subscription)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return build_user_response(db, db_user)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put(
    "/{user_id}/downgrade",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK
)
async def downgrade_user_to_freemium(
    user_id: int,
    request: DowngradeUserRequest,
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    if request.role != "freemium":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'freemium'"
        )

    db_user = get_user_or_404(db, user_id)

    if db_user.user_id == int(current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot modify your own role with this endpoint"
        )

    if db_user.role == UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin user cannot be downgraded"
        )

    now = sg_now()

    active_subscription = get_active_subscription(db, user_id)
    if active_subscription is not None:
        active_subscription.status = SubscriptionStatus.cancelled
        active_subscription.cancelled_at = now
        active_subscription.end_at = now
        active_subscription.updated_at = now
        db.add(active_subscription)

    db_user.role = UserRole.freemium
    db_user.premium_end = now

    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return build_user_response(db, db_user)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put(
    "/{user_id}/role",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK
)
async def change_user_role(
    user_id: int,
    request: ChangeRoleRequest,
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    if request.role != "freemium":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'freemium'"
        )

    db_user = get_user_or_404(db, user_id)

    if db_user.user_id == int(current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot modify your own role with this endpoint"
        )

    if db_user.role == UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin role cannot be changed using this endpoint"
        )

    # This endpoint is used specifically for removing the nutritionist role.
    if db_user.role != UserRole.nutritionist:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint can only remove the nutritionist role"
        )

    db_user.role = UserRole.freemium

    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return build_user_response(db, db_user)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put(
    "/{user_id}/suspend",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK
)
async def suspend_user(
    user_id: int,
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    db_user = get_user_or_404(db, user_id)

    if db_user.user_id == int(current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot suspend your own account"
        )

    db_user.suspended = True

    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return build_user_response(db, db_user)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put(
    "/{user_id}/unsuspend",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK
)
async def unsuspend_user(
    user_id: int,
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    db_user = get_user_or_404(db, user_id)
    db_user.suspended = False

    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return build_user_response(db, db_user)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_user_by_admin(
    user_id: int,
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    db_user = get_user_or_404(db, user_id)

    if db_user.user_id == int(current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )

    try:
        db.delete(db_user)
        db.commit()
        return

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )