from datetime import datetime, date
from zoneinfo import ZoneInfo
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import user, dietary_goal, GoalType, WeeklyGoalRate

router = APIRouter(
    prefix="/dietary-goal",
    tags=["Dietary Goal"]
)

def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))

class CreateDietaryGoalRequest(BaseModel):
    goal_type: GoalType
    target_weight_kg: float = Field(gt=0)
    weekly_goal_rate: WeeklyGoalRate
    daily_calorie_target: int = Field(gt=0)
    daily_protein_g: float = Field(gt=0)
    daily_carb_g: float = Field(gt=0)
    daily_fat_g: float = Field(gt=0)

class CreateDietaryGoalResponse(BaseModel):
    goal_type: GoalType
    target_weight_kg: WeeklyGoalRate
    daily_calorie_target: int = Field(gt=0)
    daily_protein_g: float = Field(gt=0)
    daily_carb_g: float = Field(gt=0)
    daily_fat_g: float = Field(gt=0)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=sg_now)
    updated_at: datetime = Field(default_factory=sg_now)

@router.post('/create-dietary-goal', response_model=CreateDietaryGoalResponse, status_code=status.HTTP_201_CREATED)
def create_dietary_goal(
    dietary_goal_data:CreateDietaryGoalRequest,
    db:db_dependency,
    current_user:user_dependency
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

    existing_dietary_goal = db.exec(
        select(dietary_goal).where(user.user_id == int(current_user["id"]))
    ).first()

    if existing_dietary_goal is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Dietary Goal already exists'
        )
    
    new_dietary_goal = dietary_goal(
        user_id = int(current_user["id"]),
        goal_type=dietary_goal_data.goal_type,
        target_weight_kg=dietary_goal_data.target_weight_kg,
        weekly_goal_rate=dietary_goal_data.weekly_goal_rate,
        daily_calorie_target=dietary_goal_data.daily_calorie_target,
        daily_protein_g=dietary_goal_data.daily_protein_g,
        daily_carb_g=dietary_goal_data.daily_carb_g,
        daily_fat_g=dietary_goal_data.daily_fat_g,
        is_active=True
    )

    try:
        db.add(new_dietary_goal)
        db.commit()
        db.refresh(new_dietary_goal)

        return new_dietary_goal
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )