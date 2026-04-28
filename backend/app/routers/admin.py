"""
admin.py

All admin-panel endpoints. Every route in this router requires the
admin role, enforced per-endpoint via the admin_dependency injection.

Audit logging is automatic and backend-generated — the frontend
must not call any logging endpoint explicitly.
"""

from typing import Optional, Annotated
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, Request, status, Depends
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, admin_dependency
from ..models import (
    audit_log,
    AuditLogType,
    food_item,
    FoodSource,
    user,
    UserRole,
)
from ..services.audit_service import log_event

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


def _ip(request: Request) -> str:
    """Extracts the caller IP from the request, falling back to 'unknown'."""
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class AuditLogResponse(BaseModel):
    id: int
    action: str
    detail: str
    type: AuditLogType
    admin_email: str
    timestamp: datetime
    ip_address: Optional[str]

    class Config:
        from_attributes = True


class SendNotificationRequest(BaseModel):
    recipient_user_id: Optional[int] = None
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=1000)
    broadcast: bool = False


class AdminAddFoodRequest(BaseModel):
    name: str
    source: FoodSource
    brand: Optional[str] = None
    serving_size: float = Field(gt=0)
    serving_unit: str
    calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carb_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    sugar_g: float = Field(ge=0)
    fiber_g: float = Field(ge=0)
    sodium_mg: float = Field(ge=0)


class AdminUpdateFoodRequest(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    serving_size: Optional[float] = Field(default=None, gt=0)
    serving_unit: Optional[str] = None
    calories: Optional[float] = Field(default=None, ge=0)
    protein_g: Optional[float] = Field(default=None, ge=0)
    carb_g: Optional[float] = Field(default=None, ge=0)
    fat_g: Optional[float] = Field(default=None, ge=0)
    sugar_g: Optional[float] = Field(default=None, ge=0)
    fiber_g: Optional[float] = Field(default=None, ge=0)
    sodium_mg: Optional[float] = Field(default=None, ge=0)


# ---------------------------------------------------------------------------
# Audit log retrieval
# ---------------------------------------------------------------------------

@router.get("/audit-logs", response_model=list[AuditLogResponse], status_code=status.HTTP_200_OK)
async def list_audit_logs(
    db: db_dependency,
    current_user: admin_dependency,
    request: Request,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """
    Returns paginated audit log records sorted by timestamp descending.

    Accessing this endpoint is itself a data_access event and is logged.

    Args:
        limit (int): Page size, 1–200. Defaults to 50.
        offset (int): Number of records to skip. Defaults to 0.

    Returns:
        list[AuditLogResponse]: Audit log entries, newest first.
    """
    logs = db.exec(
        select(audit_log)
        .order_by(audit_log.timestamp.desc())
        .limit(limit)
        .offset(offset)
    ).all()

    log_event(
        db,
        action="audit_logs_viewed",
        detail=f"Admin viewed audit logs (limit={limit}, offset={offset})",
        log_type=AuditLogType.data_access,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )

    return logs

# ---------------------------------------------------------------------------
# Push notifications
# ---------------------------------------------------------------------------

@router.post("/notifications", status_code=status.HTTP_200_OK)
async def send_push_notification(
    payload: SendNotificationRequest,
    db: db_dependency,
    current_user: admin_dependency,
    request: Request,
):
    """
    Records and dispatches a push notification. The actual delivery
    must be wired to a push provider (FCM/APNS) in the notification
    service layer. This endpoint logs the event regardless of delivery
    outcome. Logged as system.

    Args:
        payload (SendNotificationRequest): Notification content and targeting.

    Returns:
        dict: Confirmation with targeting summary.
    """
    target = "all users" if payload.broadcast else f"user {payload.recipient_user_id}"

    if not payload.broadcast and payload.recipient_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide recipient_user_id or set broadcast=true",
        )

    log_event(
        db,
        action="push_notification_sent",
        detail=f"Admin sent notification to {target}: '{payload.title}'",
        log_type=AuditLogType.system,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )

    return {"status": "dispatched", "target": target, "title": payload.title}


# ---------------------------------------------------------------------------
# Food database management
# ---------------------------------------------------------------------------

@router.post("/food", status_code=status.HTTP_201_CREATED)
async def admin_add_food(
    payload: AdminAddFoodRequest,
    db: db_dependency,
    current_user: admin_dependency,
    request: Request,
):
    """
    Manually adds a food item to the food_item catalogue. Logged as system.

    Args:
        payload (AdminAddFoodRequest): Full nutritional specification.

    Returns:
        dict: Created food_id and name.
    """
    new_food = food_item(
        name=payload.name,
        source=FoodSource.manual,
        brand=payload.brand,
        serving_size=payload.serving_size,
        serving_unit=payload.serving_unit,
        calories=payload.calories,
        protein_g=payload.protein_g,
        carb_g=payload.carb_g,
        fat_g=payload.fat_g,
        sugar_g=payload.sugar_g,
        fiber_g=payload.fiber_g,
        sodium_mg=payload.sodium_mg,
    )

    try:
        db.add(new_food)
        db.commit()
        db.refresh(new_food)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    log_event(
        db,
        action="food_item_added",
        detail=f"Admin added food item {new_food.food_id} ('{new_food.name}')",
        log_type=AuditLogType.system,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )

    return {"food_id": new_food.food_id, "name": new_food.name}


@router.put("/food/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_update_food(
    food_id: int,
    payload: AdminUpdateFoodRequest,
    db: db_dependency,
    current_user: admin_dependency,
    request: Request,
):
    """
    Updates an existing food_item row. Only supplied fields are changed.
    Logged as system.

    Args:
        food_id (int): Target food_item primary key.
        payload (AdminUpdateFoodRequest): Fields to update.
    """
    db_food = db.exec(select(food_item).where(food_item.food_id == food_id)).first()
    if db_food is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food item not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_food, field, value)

    try:
        db.add(db_food)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    log_event(
        db,
        action="food_item_updated",
        detail=f"Admin updated food item {food_id} ('{db_food.name}'): {list(update_data.keys())}",
        log_type=AuditLogType.system,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )


@router.delete("/food/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_food(
    food_id: int,
    db: db_dependency,
    current_user: admin_dependency,
    request: Request,
):
    """
    Removes a food_item row. Logged as system.

    Args:
        food_id (int): Target food_item primary key.
    """
    db_food = db.exec(select(food_item).where(food_item.food_id == food_id)).first()
    if db_food is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food item not found")

    deleted_name = db_food.name

    try:
        db.delete(db_food)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    log_event(
        db,
        action="food_item_deleted",
        detail=f"Admin deleted food item {food_id} ('{deleted_name}')",
        log_type=AuditLogType.system,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )


# ---------------------------------------------------------------------------
# Bulk data export
# ---------------------------------------------------------------------------

@router.get("/export", status_code=status.HTTP_200_OK)
async def bulk_export_users(
    db: db_dependency,
    current_user: admin_dependency,
    request: Request,
):
    """
    Exports all user records as structured data. Logged as warning
    because bulk data exports carry the highest data-exposure risk.

    Returns:
        dict: Total count and user records.
    """
    users = db.exec(select(user)).all()

    log_event(
        db,
        action="bulk_data_export",
        detail=f"Admin exported all user records ({len(users)} records)",
        log_type=AuditLogType.warning,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )

    return {
        "total": len(users),
        "records": [
            {
                "user_id": u.user_id,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "role": u.role,
                "suspended": u.suspended,
                "created_at": u.created_at,
            }
            for u in users
        ],
    }