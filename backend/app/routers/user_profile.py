from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import (
    User,
    UserProfile,
    Gender,
    GoalType,
    WeeklyGoalRate,
    ActivityLevel
)


router = APIRouter(
    prefix='/profile',
    tags=['User Profile']
)


def get_weekly_goal_percentage(rate: WeeklyGoalRate) -> float:
    mapping = {
        WeeklyGoalRate.aggressive: 1.25,
        WeeklyGoalRate.moderate: 0.75,
        WeeklyGoalRate.conservative: 0.25
    }
    return mapping[rate]


def calculate_weekly_goal_values(
    weight_kg: float,
    goal_type: GoalType,
    weekly_goal_rate: WeeklyGoalRate
) -> tuple[float, float]:
    percentage = get_weekly_goal_percentage(weekly_goal_rate)
    change_kg = weight_kg * (percentage / 100)

    if goal_type == GoalType.lose:
        change_kg = -change_kg
    elif goal_type == GoalType.maintain:
        change_kg = 0.0

    return percentage, change_kg


class CreateUserProfileRequest(BaseModel):
    gender: Optional[Gender] = None
    age: Optional[int] = Field(default=None, ge=1, le=120)
    height_cm: Optional[float] = Field(default=None, gt=0)
    weight_kg: Optional[float] = Field(default=None, gt=0)

    goal_type: Optional[GoalType] = None
    goal_weight_kg: Optional[float] = Field(default=None, gt=0)
    weekly_goal_rate: Optional[WeeklyGoalRate] = None

    activity_level: Optional[ActivityLevel] = None

    health_conditions: Optional[list[str]] = None
    allergies: Optional[list[str]] = None
    dietary_restrictions: Optional[list[str]] = None

    body_fat_percentage: Optional[float] = Field(default=None, gt=0, le=100)
    avg_weekly_cardio_minutes: Optional[int] = Field(default=None, ge=0)


class UpdateUserProfileRequest(BaseModel):
    gender: Optional[Gender] = None
    age: Optional[int] = Field(default=None, ge=1, le=120)
    height_cm: Optional[float] = Field(default=None, gt=0)
    weight_kg: Optional[float] = Field(default=None, gt=0)

    goal_type: Optional[GoalType] = None
    goal_weight_kg: Optional[float] = Field(default=None, gt=0)
    weekly_goal_rate: Optional[WeeklyGoalRate] = None

    activity_level: Optional[ActivityLevel] = None

    health_conditions: Optional[list[str]] = None
    allergies: Optional[list[str]] = None
    dietary_restrictions: Optional[list[str]] = None

    body_fat_percentage: Optional[float] = Field(default=None, gt=0, le=100)
    avg_weekly_cardio_minutes: Optional[int] = Field(default=None, ge=0)


class UserProfileResponse(BaseModel):
    profile_id: int
    user_id: int

    gender: Optional[Gender]
    age: Optional[int]
    height_cm: Optional[float]
    weight_kg: Optional[float]

    goal_type: Optional[GoalType]
    goal_weight_kg: Optional[float]
    weekly_goal_rate: Optional[WeeklyGoalRate]
    weekly_goal_percentage: Optional[float]
    weekly_weight_change_kg: Optional[float]

    activity_level: Optional[ActivityLevel]

    health_conditions: Optional[list[str]]
    allergies: Optional[list[str]]
    dietary_restrictions: Optional[list[str]]

    body_fat_percentage: Optional[float]
    avg_weekly_cardio_minutes: Optional[int]

    created_at: datetime
    updated_at: datetime


@router.post('/', response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_user_profile(
    profile_data: CreateUserProfileRequest,
    db: db_dependency,
    user: user_dependency
):
    db_user = db.exec(
        select(User).where(User.user_id == int(user['id']))
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User not found'
        )

    existing_profile = db.exec(
        select(UserProfile).where(UserProfile.user_id == int(user['id']))
    ).first()

    if existing_profile is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='User profile already exists'
        )
    
    weekly_goal_percentage = None
    weekly_weight_change_kg = None

    if (
        profile_data.weight_kg is not None
        and profile_data.goal_type is not None
        and profile_data.weekly_goal_rate is not None
    ):
        weekly_goal_percentage, weekly_weight_change_kg = calculate_weekly_goal_values(
            weight_kg=profile_data.weight_kg,
            goal_type=profile_data.goal_type,
            weekly_goal_rate=profile_data.weekly_goal_rate
        )

    new_profile = UserProfile(
        user_id=int(user['id']),
        gender=profile_data.gender,
        age=profile_data.age,
        height_cm=profile_data.height_cm,
        weight_kg=profile_data.weight_kg,
        goal_type=profile_data.goal_type,
        goal_weight_kg=profile_data.goal_weight_kg,
        weekly_goal_rate=profile_data.weekly_goal_rate,
        weekly_goal_percentage=weekly_goal_percentage,
        weekly_weight_change_kg=weekly_weight_change_kg,
        activity_level=profile_data.activity_level,
        health_conditions=profile_data.health_conditions,
        allergies=profile_data.allergies,
        dietary_restrictions=profile_data.dietary_restrictions,
        body_fat_percentage=profile_data.body_fat_percentage,
        avg_weekly_cardio_minutes=profile_data.avg_weekly_cardio_minutes
    )

    try:
        db.add(new_profile)
        db.commit()
        db.refresh(new_profile)
        return new_profile
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get('/me', response_model=UserProfileResponse, status_code=status.HTTP_200_OK)
async def get_my_profile(
    db: db_dependency,
    user: user_dependency
):
    profile = db.exec(
        select(UserProfile).where(UserProfile.user_id == int(user['id']))
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User profile not found'
        )

    return profile


@router.put('/me', response_model=UserProfileResponse, status_code=status.HTTP_200_OK)
async def update_my_profile(
    profile_data: UpdateUserProfileRequest,
    db: db_dependency,
    user: user_dependency
):
    profile = db.exec(
        select(UserProfile).where(UserProfile.user_id == int(user['id']))
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User profile not found'
        )

    update_data = profile_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(profile, key, value)

    if (
        profile.weight_kg is not None
        and profile.goal_type is not None
        and profile.weekly_goal_rate is not None
    ):
        weekly_goal_percentage, weekly_weight_change_kg = calculate_weekly_goal_values(
            weight_kg=profile.weight_kg,
            goal_type=profile.goal_type,
            weekly_goal_rate=profile.weekly_goal_rate
        )
        profile.weekly_goal_percentage = weekly_goal_percentage
        profile.weekly_weight_change_kg = weekly_weight_change_kg
    else:
        profile.weekly_goal_percentage = None
        profile.weekly_weight_change_kg = None

    profile.updated_at = datetime.now(ZoneInfo('Asia/Singapore'))

    try:
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )