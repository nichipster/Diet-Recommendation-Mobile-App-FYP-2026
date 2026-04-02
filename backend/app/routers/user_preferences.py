from datetime import datetime, date
from zoneinfo import ZoneInfo
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import (
    user,
    user_preferences
)


router = APIRouter(
    prefix="/preferences",
    tags=["User Preferences"]
)

def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))

class CreateUserPreferencesRequest(BaseModel):
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_halal: bool = False
    is_gluten_free: bool = False

    # allergens
    has_peanut_allergy: bool = False
    has_tree_nut_allergy: bool = False
    has_milk_allergy: bool = False
    has_egg_allergy: bool = False
    has_fish_allergy: bool = False
    has_shellfish_allergy: bool = False
    has_soy_allergy: bool = False
    has_wheat_allergy: bool = False
    has_sesame_allergy: bool = False
    has_sulfite_allergy: bool = False 
    allergy_notes: Optional[str] = None

class UpdateUserPreferencesRequest(BaseModel):
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_halal: bool = False
    is_gluten_free: bool = False
    
    has_peanut_allergy: bool = False
    has_tree_nut_allergy: bool = False
    has_milk_allergy: bool = False
    has_egg_allergy: bool = False
    has_fish_allergy: bool = False
    has_shellfish_allergy: bool = False
    has_soy_allergy: bool = False
    has_wheat_allergy: bool = False
    has_sesame_allergy: bool = False
    has_sulfite_allergy: bool = False

    allergy_notes: Optional[str] = None

class CreateUserPreferencesResponse(BaseModel):
    preference_id: int
    user_id: int
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_halal: bool = False
    is_gluten_free: bool = False
    has_peanut_allergy: bool = False
    has_tree_nut_allergy: bool = False
    has_milk_allergy: bool = False
    has_egg_allergy: bool = False
    has_fish_allergy: bool = False
    has_shellfish_allergy: bool = False
    has_soy_allergy: bool = False
    has_wheat_allergy: bool = False
    has_sesame_allergy: bool = False
    has_sulfite_allergy: bool = False 
    created_at: datetime
    updated_at: datetime

class ViewUserPreferencesResponse(BaseModel):
    preference_id: int
    user_id: int
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_halal: bool = False
    is_gluten_free: bool = False
    has_peanut_allergy: bool = False
    has_tree_nut_allergy: bool = False
    has_milk_allergy: bool = False
    has_egg_allergy: bool = False
    has_fish_allergy: bool = False
    has_shellfish_allergy: bool = False
    has_soy_allergy: bool = False
    has_wheat_allergy: bool = False
    has_sesame_allergy: bool = False
    has_sulfite_allergy: bool = False 
    allergy_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

@router.post("/create-preferences", response_model=CreateUserPreferencesResponse, status_code=status.HTTP_201_CREATED)
async def create_user_preferences(
    preferences_data: CreateUserPreferencesRequest,
    db: db_dependency,
    current_user: user_dependency
):

    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token'
        )  
    
    db_user = db.exec(
        select(user).where(user.user_id == int(current_user["id"]))
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    existing_preferences = db.exec(
        select(user_preferences).where(user_preferences.user_id == int(current_user["id"]))
    ).first()

    if existing_preferences is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User preferences already exist"
        )


    new_preferences = user_preferences(
        user_id=int(current_user["id"]),
        is_vegetarian=preferences_data.is_vegetarian,
        is_vegan=preferences_data.is_vegan,
        is_halal=preferences_data.is_halal,
        is_gluten_free=preferences_data.is_gluten_free,
        has_peanut_allergy=preferences_data.has_peanut_allergy,
        has_tree_nut_allergy=preferences_data.has_tree_nut_allergy,
        has_milk_allergy=preferences_data.has_milk_allergy,
        has_egg_allergy=preferences_data.has_egg_allergy,
        has_fish_allergy=preferences_data.has_fish_allergy,
        has_shellfish_allergy=preferences_data.has_shellfish_allergy,
        has_soy_allergy=preferences_data.has_soy_allergy,
        has_wheat_allergy=preferences_data.has_wheat_allergy,
        has_sesame_allergy=preferences_data.has_sesame_allergy,
        has_sulfite_allergy=preferences_data.has_sulfite_allergy,
        allergy_notes=preferences_data.allergy_notes
    )

    try:
        db.add(new_preferences)
        db.commit()
        db.refresh(new_preferences)

        return new_preferences
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
@router.get("/view-preferences", response_model=ViewUserPreferencesResponse, status_code=status.HTTP_200_OK)
async def view_user_preferences(
    db: db_dependency,
    current_user: user_dependency
):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token'
        )  
    
    db_user = db.exec(
        select(user).where(user.user_id == int(current_user["id"]))
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    existing_preferences = db.exec(
        select(user_preferences).where(user_preferences.user_id == int(current_user["id"]))
    ).first()

    if existing_preferences is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User preferences not found"
        )
    
    return {
        "preference_id": existing_preferences.preference_id,
        "user_id": existing_preferences.user_id,
        "is_vegetarian": existing_preferences.is_vegetarian,
        "is_vegan": existing_preferences.is_vegan,
        "is_halal": existing_preferences.is_halal,
        "is_gluten_free": existing_preferences.is_gluten_free,
        "has_peanut_allergy": existing_preferences.has_peanut_allergy,
        "has_tree_nut_allergy": existing_preferences.has_tree_nut_allergy,
        "has_milk_allergy": existing_preferences.has_milk_allergy,
        "has_egg_allergy": existing_preferences.has_egg_allergy,
        "has_fish_allergy": existing_preferences.has_fish_allergy,
        "has_shellfish_allergy": existing_preferences.has_shellfish_allergy,
        "has_soy_allergy": existing_preferences.has_soy_allergy,
        "has_wheat_allergy": existing_preferences.has_wheat_allergy,
        "has_sesame_allergy": existing_preferences.has_sesame_allergy,
        "has_sulfite_allergy": existing_preferences.has_sulfite_allergy,
        "allergy_notes": existing_preferences.allergy_notes,
        "created_at": existing_preferences.created_at,
        "updated_at": existing_preferences.updated_at 
    }

@router.put("/update-preferences", status_code=status.HTTP_204_NO_CONTENT)
async def update_user_preferences(
    update_preferences_data: UpdateUserPreferencesRequest,
    current_user: user_dependency,
    db: db_dependency
):
    
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token'
        )  
    
    db_user = db.exec(
        select(user).where(user.user_id == int(current_user["id"]))
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    db_preferences = db.exec(
        select(user_preferences).where(user_preferences.user_id == int(current_user["id"]))
    ).first()

    if db_preferences is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User preferences not found"
        )

    updates = update_preferences_data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(db_preferences, field, value)
    
    db_preferences.updated_at = sg_now()
    
    try:
        db.add(db_preferences)
        db.commit()
        db.refresh(db_preferences)
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )