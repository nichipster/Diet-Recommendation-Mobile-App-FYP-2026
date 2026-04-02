from datetime import datetime, date
from zoneinfo import ZoneInfo
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import (
    user,
    user_profile,
    Gender,
    ActivityLevel,
    weight_log
)


router = APIRouter(
    prefix="/profile",
    tags=["User Profile"]
)


def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))


class CreateUserProfileRequest(BaseModel):
    gender: Gender
    dob: date 
    height_cm: float = Field(gt=0)
    weight_kg: float = Field(gt=0)
    activity_level: ActivityLevel
    body_fat_percentage: Optional[float] = Field(default=None, gt=0, le=100)

class CreateUserProfileResponse(BaseModel):
    profile_id: int
    user_id: int
    gender: Optional[Gender]
    dob: Optional[date]
    height_cm: Optional[float]
    weight_kg: Optional[float]
    activity_level: Optional[ActivityLevel]
    body_fat_percentage: Optional[float]
    created_at: datetime
    updated_at: datetime

class ViewUserProfileResponse(BaseModel):
    profile_id: int
    user_id: int
    gender: Optional[Gender]
    dob: Optional[date]
    height_cm: Optional[float]
    weight_kg: Optional[float]
    activity_level: Optional[ActivityLevel]
    body_fat_percentage: Optional[float]

class UpdateUserProfileRequest(BaseModel):
    new_gender: Optional[Gender] = None
    new_dob: Optional[date] = None
    new_height_cm: Optional[float] = Field(default=None, gt=0)
    new_activity_level: Optional[ActivityLevel] = None
    new_body_fat_percentage: Optional[float] = Field(default=None, gt=0, le=100)

class UpdateWeightLogRequest(BaseModel):
    new_weight: float = Field(gt=0)

class UpdateWeightLogResponse(BaseModel):
    weight_log_id: int
    user_id: int
    weight_kg: float
    recorded_at: datetime

@router.post("/create-profile", response_model=CreateUserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_user_profile(
    profile_data: CreateUserProfileRequest,
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

    existing_profile = db.exec(
        select(user_profile).where(user_profile.user_id == int(current_user["id"]))
    ).first()

    if existing_profile is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User profile already exists"
        )

    new_profile = user_profile(
        user_id=int(current_user["id"]),
        gender=profile_data.gender,
        dob=profile_data.dob,
        height_cm=profile_data.height_cm,
        weight_kg=profile_data.weight_kg,
        activity_level=profile_data.activity_level,
        body_fat_percentage=profile_data.body_fat_percentage
    )

    new_weight_log = weight_log(
        user_id=int(current_user["id"]),
        weight_kg=profile_data.weight_kg
    )

    try:
        db.add(new_profile)
        db.add(new_weight_log)
        db.commit()
        db.refresh(new_profile)
        db.refresh(new_weight_log)

        return new_profile
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/me", response_model=ViewUserProfileResponse, status_code=status.HTTP_200_OK)
async def view_user_profile(
    db: db_dependency,
    current_user: user_dependency
):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token'
        )  
    
    db_profile = db.exec(
        select(user_profile).where(user_profile.user_id == int(current_user["id"]))
    ).first()

    if db_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    return {
        "profile_id": db_profile.profile_id,
        "user_id": db_profile.user_id,
        "gender": db_profile.gender,
        "dob": db_profile.dob,
        "height_cm": db_profile.height_cm,
        "weight_kg": db_profile.weight_kg,
        "activity_level": db_profile.activity_level,
        "body_fat_percentage": db_profile.body_fat_percentage
    }
    
@router.put("/update-profile", status_code=status.HTTP_204_NO_CONTENT)
async def update_profile(
    profile_data: UpdateUserProfileRequest,
    db: db_dependency,
    current_user: user_dependency
):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token'
        )  
    
    db_profile = db.exec(
        select(user_profile).where(user_profile.user_id == int(current_user["id"]))
    ).first()

    if db_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    updates = profile_data.model_dump(exclude_unset=True)
    
    for field, value in updates.items():
        setattr(db_profile, field, value)

    db_profile.updated_at = sg_now()

    try:
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# this function directly adds new row to weight log table and auto triggers update to weight_kg column in profile

@router.post("/update-weight-log", response_model=UpdateWeightLogResponse, status_code=status.HTTP_201_CREATED)
async def update_weight_log(
    weight_data: UpdateWeightLogRequest,
    db: db_dependency,
    current_user: user_dependency
):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token'
        )  
    
    db_profile = db.exec(
        select(user_profile).where(user_profile.user_id == int(current_user["id"]))
    ).first()

    if db_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    new_weight_log = weight_log(
        user_id=int(current_user["id"]),
        weight_kg=weight_data.new_weight
    )

    try:
        db.add(new_weight_log)
        db.add(new_weight_log)
        db.commit()
        db.refresh(new_weight_log)
        db.refresh(new_weight_log)

        return new_weight_log
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )