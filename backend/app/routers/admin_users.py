from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Literal

from fastapi import APIRouter, HTTPException, status, Request, Query
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency, admin_dependency
from ..services.audit_service import log_event
from ..models import (
    user,
    meal,
    user_subscription,
    UserRole,
    SubscriptionPlan,
    SubscriptionStatus,
    AuditLogType
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

def _ip(request: Request) -> str:
    """Extracts the caller IP from the request, falling back to 'unknown'."""
    return request.client.host if request.client else "unknown"

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

class AdminUserResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: str
    role: UserRole
    suspended: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AdminCreateUserRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    role: UserRole = UserRole.freemium


class UpgradeUserRequest(BaseModel):
    role: Literal["premium"]
    plan: SubscriptionPlan


class DowngradeUserRequest(BaseModel):
    role: Literal["freemium"]


class ChangeRoleRequest(BaseModel):
    role: Literal["freemium"]

class AdminChangeRoleRequest(BaseModel):
    new_role: UserRole

# =========================
# Endpoints
# =========================

@router.get("", response_model=list[AdminUserResponse], status_code=status.HTTP_200_OK)
async def list_all_users(
    db: db_dependency,
    current_user: admin_dependency,
    request: Request,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """
    Returns a paginated list of all users. Logged as a warning because
    bulk access to user records is an elevated-risk operation.

    Returns:
        list[AdminUserResponse]: User records.
    """
    users = db.exec(
        select(user).limit(limit).offset(offset)
    ).all()

    log_event(
        db,
        action="bulk_user_access",
        detail=f"Admin accessed user list (limit={limit}, offset={offset}, returned={len(users)})",
        log_type=AuditLogType.warning,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )

    return users


@router.get("/{user_id}", response_model=AdminUserResponse, status_code=status.HTTP_200_OK)
async def view_user_profile(
    user_id: int,
    db: db_dependency,
    current_user: admin_dependency,
    request: Request,
):
    """
    Returns a single user's record. Logged as data_access because
    the admin is opening personal user data.

    Args:
        user_id (int): Target user's primary key.

    Returns:
        AdminUserResponse: User record.
    """
    db_user = db.exec(select(user).where(user.user_id == user_id)).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    log_event(
        db,
        action="user_profile_viewed",
        detail=f"Admin viewed profile of user {user_id} ({db_user.email})",
        log_type=AuditLogType.data_access,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )

    return db_user


@router.post("", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_user(
    payload: AdminCreateUserRequest,
    db: db_dependency,
    current_user: admin_dependency,
    request: Request,
):
    """
    Creates a new user account. Logged as user_action.

    Args:
        payload (AdminCreateUserRequest): New user details including role.

    Returns:
        AdminUserResponse: Created user record.
    """
    from ..routers.auth import bcrypt_context

    exists = db.exec(select(user).where(user.email == payload.email)).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    new_user = user(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        hashed_password=bcrypt_context.hash(payload.password),
        role=payload.role,
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    log_event(
        db,
        action="user_created",
        detail=f"Admin created user {new_user.user_id} ({new_user.email}) with role {new_user.role}",
        log_type=AuditLogType.user_action,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )

    return new_user

@router.put("/{user_id}/role", status_code=status.HTTP_204_NO_CONTENT)
async def change_user_role(
    user_id: int,
    payload: AdminChangeRoleRequest,
    db: db_dependency,
    current_user: admin_dependency,
    request: Request,
):
    """
    Changes a user's role. Covers upgrade, downgrade, and nutritionist
    role removal. Logged as user_action.

    Args:
        user_id (int): Target user's primary key.
        payload (AdminChangeRoleRequest): new_role value.
    """
    db_user = db.exec(select(user).where(user.user_id == user_id)).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if db_user.role == payload.new_role:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already has that role")

    previous_role = db_user.role
    db_user.role = payload.new_role

    try:
        db.add(db_user)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    log_event(
        db,
        action="user_role_changed",
        detail=(
            f"Admin changed role of user {user_id} ({db_user.email}) "
            f"from {previous_role} to {payload.new_role}"
        ),
        log_type=AuditLogType.user_action,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )


@router.put("/{user_id}/suspend", status_code=status.HTTP_204_NO_CONTENT)
async def suspend_user(
    user_id: int,
    db: db_dependency,
    current_user: admin_dependency,
    request: Request,
):
    """
    Sets suspended=True on a user account. Logged as user_action.

    Args:
        user_id (int): Target user's primary key.
    """
    db_user = db.exec(select(user).where(user.user_id == user_id)).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if db_user.suspended:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already suspended")

    db_user.suspended = True
    try:
        db.add(db_user)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    log_event(
        db,
        action="user_suspended",
        detail=f"Admin suspended user {user_id} ({db_user.email})",
        log_type=AuditLogType.user_action,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )


@router.put("/{user_id}/unsuspend", status_code=status.HTTP_204_NO_CONTENT)
async def unsuspend_user(
    user_id: int,
    db: db_dependency,
    current_user: admin_dependency,
    request: Request,
):
    """
    Sets suspended=False on a user account. Logged as user_action.

    Args:
        user_id (int): Target user's primary key.
    """
    db_user = db.exec(select(user).where(user.user_id == user_id)).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not db_user.suspended:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is not suspended")

    db_user.suspended = False
    try:
        db.add(db_user)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    log_event(
        db,
        action="user_unsuspended",
        detail=f"Admin unsuspended user {user_id} ({db_user.email})",
        log_type=AuditLogType.user_action,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_user(
    user_id: int,
    db: db_dependency,
    current_user: admin_dependency,
    request: Request,
):
    """
    Hard-deletes a user account and all associated profile/preferences rows.
    Logged as user_action.

    Args:
        user_id (int): Target user's primary key.
    """
    from ..models import user_profile, user_preferences

    db_user = db.exec(select(user).where(user.user_id == user_id)).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    deleted_email = db_user.email

    profile = db.exec(select(user_profile).where(user_profile.user_id == user_id)).first()
    prefs = db.exec(select(user_preferences).where(user_preferences.user_id == user_id)).first()

    try:
        if prefs:
            db.delete(prefs)
        if profile:
            db.delete(profile)
        db.delete(db_user)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    log_event(
        db,
        action="user_deleted",
        detail=f"Admin deleted user {user_id} ({deleted_email})",
        log_type=AuditLogType.user_action,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )