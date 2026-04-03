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

class CreateUserProfileResponse(BaseModel):
    profile_id: int
    user_id: int
    gender: Gender
    dob: date
    height_cm: float
    weight_kg: float
    activity_level: ActivityLevel
    tdee: int
    created_at: datetime
    updated_at: datetime

class ViewUserProfileResponse(BaseModel):
    profile_id: int
    user_id: int
    gender: Gender
    dob: date
    height_cm: float
    weight_kg: float
    tdee: int
    activity_level: ActivityLevel

class UpdateUserProfileRequest(BaseModel):
    gender: Optional[Gender] = None
    dob: Optional[date] = None
    height_cm: Optional[float] = Field(default=None, gt=0)
    activity_level: Optional[ActivityLevel] = None

class UpdateWeightLogRequest(BaseModel):
    weight: float = Field(gt=0)

class UpdateWeightLogResponse(BaseModel):
    weight_log_id: int
    user_id: int
    weight_kg: float
    recorded_at: datetime

def calculate_age(dob):

    today = date.today()
    age = today.year - dob.year

    if (today.month, today.day) < (dob.month, dob.day):
        age -= 1

    return age

def tdee_calculator(
        gender,
        weight_kg,
        height_cm,
        dob,
        activity_level
        ):
    
    if gender == 'male':
        bmr = (10*weight_kg) + (6.25*height_cm) - (5*calculate_age(dob)) + 5
    
    else:
        bmr = (10*weight_kg) + (6.25*height_cm) - (5*calculate_age(dob)) - 161
    
    if activity_level=='sedentary':
        return int(1.2*bmr)
    
    elif activity_level=='lightly_active':
        return int(1.375*bmr)
    
    elif activity_level=='active':
        return int(1.55*bmr
)    
    else:
        return int(1.7*bmr
 )   

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

    new_tdee = tdee_calculator(
        profile_data.gender,
        profile_data.weight_kg,
        profile_data.height_cm,
        profile_data.dob,
        profile_data.activity_level
    )

    new_profile = user_profile(
        user_id=int(current_user["id"]),
        gender=profile_data.gender,
        dob=profile_data.dob,
        height_cm=profile_data.height_cm,
        weight_kg=profile_data.weight_kg,
        activity_level=profile_data.activity_level,
        tdee=new_tdee
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
        "tdee": db_profile.tdee,
        "activity_level": db_profile.activity_level
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

    try:
        db_profile.tdee = tdee_calculator(
            gender=db_profile.gender,
            weight_kg=db_profile.weight_kg,
            height_cm=db_profile.height_cm,
            dob=db_profile.dob,
            activity_level=db_profile.activity_level
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"TDEE calculation failed: {str(e)}"
        )
    
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
        weight_kg=weight_data.weight
    )

    try:
        db_profile.tdee = tdee_calculator(
            gender=db_profile.gender,
            weight_kg=weight_data.weight,
            height_cm=db_profile.height_cm,
            dob=db_profile.dob,
            activity_level=db_profile.activity_level
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"TDEE calculation failed: {str(e)}"
        )
    
    try:
        db.add(new_weight_log)
        db.add(db_profile)
        db.commit()
        db.refresh(new_weight_log)
        db.refresh(db_profile)

        return new_weight_log
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )