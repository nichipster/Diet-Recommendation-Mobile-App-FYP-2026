from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import (
    user,
    user_profile,
    user_preferences,
    Gender,
    ActivityLevel
)


router = APIRouter(
    prefix="/profile",
    tags=["User Profile"]
)


def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))


class CreateUserProfileRequest(BaseModel):
    gender: Optional[Gender] = None
    age: Optional[int] = Field(default=None, ge=1, le=120)
    height_cm: Optional[float] = Field(default=None, gt=0)
    weight_kg: Optional[float] = Field(default=None, gt=0)
    activity_level: Optional[ActivityLevel] = None
    body_fat_percentage: Optional[float] = Field(default=None, gt=0, le=100)

    is_vegetarian: bool = False
    is_vegan: bool = False
    is_halal: bool = False
    is_gluten_free: bool = False
    allergies: Optional[str] = None


class UpdateUserProfileRequest(BaseModel):
    gender: Optional[Gender] = None
    age: Optional[int] = Field(default=None, ge=1, le=120)
    height_cm: Optional[float] = Field(default=None, gt=0)
    weight_kg: Optional[float] = Field(default=None, gt=0)
    activity_level: Optional[ActivityLevel] = None
    body_fat_percentage: Optional[float] = Field(default=None, gt=0, le=100)

    is_vegetarian: Optional[bool] = None
    is_vegan: Optional[bool] = None
    is_halal: Optional[bool] = None
    is_gluten_free: Optional[bool] = None
    allergies: Optional[str] = None


class UserPreferencesResponse(BaseModel):
    preference_id: int
    user_id: int
    is_vegetarian: bool
    is_vegan: bool
    is_halal: bool
    is_gluten_free: bool
    allergies: Optional[str]
    created_at: datetime
    updated_at: datetime


class UserProfileResponse(BaseModel):
    profile_id: int
    user_id: int
    gender: Optional[Gender]
    age: Optional[int]
    height_cm: Optional[float]
    weight_kg: Optional[float]
    activity_level: Optional[ActivityLevel]
    body_fat_percentage: Optional[float]
    created_at: datetime
    updated_at: datetime
    preferences: Optional[UserPreferencesResponse] = None


@router.post("/", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_user_profile(
    profile_data: CreateUserProfileRequest,
    db: db_dependency,
    current_user: user_dependency
):
    db_user = db.exec(
        select(user).where(user.user_id == int(current_user["id"]))
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    existing_profile = db.exec(
        select(user_profile).where(user_profile.user_id == int(current_user["id"]))
    ).first()

    if existing_profile is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User profile already exists"
        )

    existing_preferences = db.exec(
        select(user_preferences).where(user_preferences.user_id == int(current_user["id"]))
    ).first()

    if existing_preferences is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User preferences already exist"
        )

    new_profile = user_profile(
        user_id=int(current_user["id"]),
        gender=profile_data.gender,
        age=profile_data.age,
        height_cm=profile_data.height_cm,
        weight_kg=profile_data.weight_kg,
        activity_level=profile_data.activity_level,
        body_fat_percentage=profile_data.body_fat_percentage
    )

    new_preferences = user_preferences(
        user_id=int(current_user["id"]),
        is_vegetarian=profile_data.is_vegetarian,
        is_vegan=profile_data.is_vegan,
        is_halal=profile_data.is_halal,
        is_gluten_free=profile_data.is_gluten_free,
        allergies=profile_data.allergies
    )

    try:
        db.add(new_profile)
        db.add(new_preferences)
        db.commit()
        db.refresh(new_profile)
        db.refresh(new_preferences)

        return UserProfileResponse(
            profile_id=new_profile.profile_id,
            user_id=new_profile.user_id,
            gender=new_profile.gender,
            age=new_profile.age,
            height_cm=new_profile.height_cm,
            weight_kg=new_profile.weight_kg,
            activity_level=new_profile.activity_level,
            body_fat_percentage=new_profile.body_fat_percentage,
            created_at=new_profile.created_at,
            updated_at=new_profile.updated_at,
            preferences=UserPreferencesResponse(
                preference_id=new_preferences.preference_id,
                user_id=new_preferences.user_id,
                is_vegetarian=new_preferences.is_vegetarian,
                is_vegan=new_preferences.is_vegan,
                is_halal=new_preferences.is_halal,
                is_gluten_free=new_preferences.is_gluten_free,
                allergies=new_preferences.allergies,
                created_at=new_preferences.created_at,
                updated_at=new_preferences.updated_at
            )
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/me", response_model=UserProfileResponse, status_code=status.HTTP_200_OK)
async def get_my_profile(
    db: db_dependency,
    current_user: user_dependency
):
    profile = db.exec(
        select(user_profile).where(user_profile.user_id == int(current_user["id"]))
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    preferences = db.exec(
        select(user_preferences).where(user_preferences.user_id == int(current_user["id"]))
    ).first()

    preferences_response = None
    if preferences is not None:
        preferences_response = UserPreferencesResponse(
            preference_id=preferences.preference_id,
            user_id=preferences.user_id,
            is_vegetarian=preferences.is_vegetarian,
            is_vegan=preferences.is_vegan,
            is_halal=preferences.is_halal,
            is_gluten_free=preferences.is_gluten_free,
            allergies=preferences.allergies,
            created_at=preferences.created_at,
            updated_at=preferences.updated_at
        )

    return UserProfileResponse(
        profile_id=profile.profile_id,
        user_id=profile.user_id,
        gender=profile.gender,
        age=profile.age,
        height_cm=profile.height_cm,
        weight_kg=profile.weight_kg,
        activity_level=profile.activity_level,
        body_fat_percentage=profile.body_fat_percentage,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        preferences=preferences_response
    )


@router.put("/me", response_model=UserProfileResponse, status_code=status.HTTP_200_OK)
async def update_my_profile(
    profile_data: UpdateUserProfileRequest,
    db: db_dependency,
    current_user: user_dependency
):
    profile = db.exec(
        select(user_profile).where(user_profile.user_id == int(current_user["id"]))
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    preferences = db.exec(
        select(user_preferences).where(user_preferences.user_id == int(current_user["id"]))
    ).first()

    if preferences is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User preferences not found"
        )

    profile_fields = {
        "gender",
        "age",
        "height_cm",
        "weight_kg",
        "activity_level",
        "body_fat_percentage"
    }

    preference_fields = {
        "is_vegetarian",
        "is_vegan",
        "is_halal",
        "is_gluten_free",
        "allergies"
    }

    update_data = profile_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        if key in profile_fields:
            setattr(profile, key, value)
        elif key in preference_fields:
            setattr(preferences, key, value)

    profile.updated_at = sg_now()
    preferences.updated_at = sg_now()

    try:
        db.add(profile)
        db.add(preferences)
        db.commit()
        db.refresh(profile)
        db.refresh(preferences)

        return UserProfileResponse(
            profile_id=profile.profile_id,
            user_id=profile.user_id,
            gender=profile.gender,
            age=profile.age,
            height_cm=profile.height_cm,
            weight_kg=profile.weight_kg,
            activity_level=profile.activity_level,
            body_fat_percentage=profile.body_fat_percentage,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
            preferences=UserPreferencesResponse(
                preference_id=preferences.preference_id,
                user_id=preferences.user_id,
                is_vegetarian=preferences.is_vegetarian,
                is_vegan=preferences.is_vegan,
                is_halal=preferences.is_halal,
                is_gluten_free=preferences.is_gluten_free,
                allergies=preferences.allergies,
                created_at=preferences.created_at,
                updated_at=preferences.updated_at
            )
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )