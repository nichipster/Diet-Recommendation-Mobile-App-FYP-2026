from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import food_item, FoodSource, AuditLogType
from ..services.audit_service import log_event

from sqlalchemy.exc import IntegrityError
import logging

router = APIRouter(
    prefix="/admin/food-database",
    tags=["Admin Food Database"]
)

logger = logging.getLogger(__name__)

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


def get_food_or_404(db: db_dependency, food_id: int) -> food_item:
    db_food = db.exec(
        select(food_item).where(food_item.food_id == food_id)
    ).first()

    if db_food is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food item not found"
        )

    return db_food


class AdminFoodItemRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    brand: str | None = None
    barcode: str | None = None
    source: FoodSource = FoodSource.admin
    serving_size: float = Field(gt=0)
    serving_unit: str = Field(min_length=1, max_length=50)
    calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carb_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    sugar_g: float = Field(default=0, ge=0)
    fiber_g: float = Field(default=0, ge=0)
    sodium_mg: float = Field(default=0, ge=0)


class AdminFoodItemResponse(BaseModel):
    food_id: int
    external_id: int | None = None
    name: str
    brand: str | None = None
    barcode: str | None = None
    source: FoodSource
    serving_size: float
    serving_unit: str
    calories: float
    protein_g: float
    carb_g: float
    fat_g: float
    sugar_g: float
    fiber_g: float
    sodium_mg: float

class AdminFoodItemUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    brand: str | None = None
    barcode: str | None = None
    serving_size: float | None = Field(default=None, gt=0)
    serving_unit: str | None = Field(default=None, min_length=1, max_length=50)
    calories: float | None = Field(default=None, ge=0)
    protein_g: float | None = Field(default=None, ge=0)
    carb_g: float | None = Field(default=None, ge=0)
    fat_g: float | None = Field(default=None, ge=0)
    sugar_g: float | None = Field(default=None, ge=0)
    fiber_g: float | None = Field(default=None, ge=0)
    sodium_mg: float | None = Field(default=None, ge=0)


def build_food_response(db_food: food_item) -> AdminFoodItemResponse:
    return AdminFoodItemResponse(
        food_id=db_food.food_id,
        external_id=db_food.external_id,
        name=db_food.name,
        brand=db_food.brand,
        barcode=db_food.barcode,
        source=db_food.source,
        serving_size=db_food.serving_size,
        serving_unit=db_food.serving_unit,
        calories=db_food.calories,
        protein_g=db_food.protein_g,
        carb_g=db_food.carb_g,
        fat_g=db_food.fat_g,
        sugar_g=db_food.sugar_g,
        fiber_g=db_food.fiber_g,
        sodium_mg=db_food.sodium_mg
    )

def _normalize_payload(payload: AdminFoodItemRequest) -> dict:
    """
    Strips leading/trailing whitespace from string fields in the payload.

    Args:
        payload (AdminFoodItemRequest): Raw validated request payload.

    Returns:
        dict: Normalized string field values ready for model construction.
    """
    return {
        "name": payload.name.strip(),
        "brand": payload.brand.strip() if payload.brand else None,
        "barcode": payload.barcode.strip() if payload.barcode else None,
        "serving_unit": payload.serving_unit.strip(),
    }

def _normalize_update_payload(payload: AdminFoodItemUpdateRequest) -> dict:
    """
    Returns a dict of only the fields explicitly set in the request body,
    with string fields stripped of whitespace.

    Uses model_fields_set to distinguish fields the caller explicitly
    provided (including nulls) from fields they omitted entirely.

    Args:
        payload (AdminFoodItemUpdateRequest): Raw validated partial payload.

    Returns:
        dict: Mapping of field name → normalised value, for provided
              fields only. Omitted fields are absent from the dict.
    """
    updates: dict = {}
    sent = payload.model_fields_set

    if "name" in sent:
        updates["name"] = payload.name.strip()
    if "brand" in sent:
        updates["brand"] = payload.brand.strip() if payload.brand else None
    if "barcode" in sent:
        updates["barcode"] = payload.barcode.strip() if payload.barcode else None
    if "serving_unit" in sent:
        updates["serving_unit"] = payload.serving_unit.strip()

    # Numeric and non-string fields need no normalisation — include as-is
    for field in ("serving_size", "calories", "protein_g", "carb_g", "fat_g",
                  "sugar_g", "fiber_g", "sodium_mg"):
        if field in sent:
            updates[field] = getattr(payload, field)

    return updates

@router.get(
    "/",
    response_model=list[AdminFoodItemResponse],
    status_code=status.HTTP_200_OK
)
async def get_admin_food_database(
    db: db_dependency,
    current_user: user_dependency
):
    require_admin(current_user)

    foods = db.exec(
        select(food_item)
        .order_by(food_item.food_id.asc())
    ).all()

    return [build_food_response(food) for food in foods]


@router.post(
    "/",
    response_model=AdminFoodItemResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_admin_food_item(
    payload: AdminFoodItemRequest,
    db: db_dependency,
    current_user: user_dependency,
    request: Request
):
    require_admin(current_user)

    if payload.source != FoodSource.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source must be 'admin'"
        )

    normalized_name = payload.name.strip()
    normalized_brand = payload.brand.strip() if payload.brand else None
    normalized_barcode = payload.barcode.strip() if payload.barcode else None
    normalized_serving_unit = payload.serving_unit.strip()

    if normalized_barcode:
        existing_barcode = db.exec(
            select(food_item).where(food_item.barcode == normalized_barcode)
        ).first()

        if existing_barcode is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Barcode already exists"
            )

    new_food = food_item(
        external_id=None,
        name=normalized_name,
        brand=normalized_brand,
        barcode=normalized_barcode,
        source=FoodSource.admin,
        serving_size=payload.serving_size,
        serving_unit=normalized_serving_unit,
        calories=payload.calories,
        protein_g=payload.protein_g,
        carb_g=payload.carb_g,
        fat_g=payload.fat_g,
        sugar_g=payload.sugar_g,
        fiber_g=payload.fiber_g,
        sodium_mg=payload.sodium_mg
    )

    try:
        db.add(new_food)
        db.commit()
        db.refresh(new_food)
        

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    log_event(
    db,
    action="food_item_added",
    detail=f"Admin added food item {new_food.food_id} ('{new_food.name}')",
    log_type=AuditLogType.system,
    admin_email=current_user["username"],
    ip_address=_ip(request),
)
    return build_food_response(new_food)


@router.patch(
    "/{food_id}",
    response_model=AdminFoodItemResponse,
    status_code=status.HTTP_200_OK,
)
async def update_admin_food_item(
    food_id: int,
    payload: AdminFoodItemUpdateRequest,
    db: db_dependency,
    current_user: user_dependency,
    request: Request,
) -> AdminFoodItemResponse:
    """
    Partially updates an admin-managed food item.

    Only fields present in the request body are applied; omitted fields
    retain their current database values. Validates all provided values
    against the same constraints as creation, checks barcode uniqueness
    when a new barcode is supplied, and diffs the old vs new state so
    the audit log records only what genuinely changed.

    Args:
        food_id (int): Primary key of the food item to update.
        payload (AdminFoodItemUpdateRequest): Fields to update (all optional).
        db (db_dependency): Active database session.
        current_user (user_dependency): Authenticated user (must be admin).
        request (Request): FastAPI request, used to extract caller IP.

    Returns:
        AdminFoodItemResponse: The updated food item reflecting all changes.

    Raises:
        HTTPException 400: If the request body is empty.
        HTTPException 400: If the item was not admin-created.
        HTTPException 403: If the caller is not an admin.
        HTTPException 404: If the food item does not exist.
        HTTPException 409: If the new barcode already belongs to another item.
        HTTPException 500: On unexpected persistence failure.
    """
    require_admin(current_user)

    db_food = get_food_or_404(db, food_id)

    if db_food.source != FoodSource.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only admin-added food items can be edited here.",
        )

    updates = _normalize_update_payload(payload)

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update.",
        )

    if "barcode" in updates and updates["barcode"] is not None:
        # Reason: Pre-flight check gives a cleaner 409; IntegrityError
        # below is still the safety net for race conditions.
        existing = db.exec(
            select(food_item).where(
                food_item.barcode == updates["barcode"],
                food_item.food_id != food_id,
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Barcode already exists.",
            )

    # Reason: Diff computed before mutation so the audit log records
    # only fields that genuinely changed value.
    changed_fields = [
        field for field, value in updates.items()
        if getattr(db_food, field) != value
    ]

    for field, value in updates.items():
        setattr(db_food, field, value)

    try:
        db.add(db_food)
        db.commit()
        db.refresh(db_food)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A food item with these details already exists.",
        )
    except Exception:
        db.rollback()
        logger.exception("Unexpected error updating food item %d", food_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred.",
        )

    log_event(
        db,
        action="food_item_updated",
        detail=(
            f"Admin updated food item {food_id} ('{db_food.name}'): "
            f"{changed_fields if changed_fields else 'no changes detected'}"
        ),
        log_type=AuditLogType.system,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )

    return build_food_response(db_food)

@router.delete(
    "/{food_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_admin_food_item(
    food_id: int,
    db: db_dependency,
    current_user: user_dependency,
    request:Request
):
    require_admin(current_user)

    db_food = get_food_or_404(db, food_id)

    deleted_name = db_food.name

    if db_food.source != FoodSource.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only admin-added food items can be deleted here"
        )

    try:
        db.delete(db_food)
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    log_event(
        db,
        action="food_item_deleted",
        detail=f"Admin deleted food item {food_id} ('{deleted_name}')",
        log_type=AuditLogType.system,
        admin_email=current_user["username"],
        ip_address=_ip(request),
    )