from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo
from typing import Optional
import math

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from ..dependencies import db_dependency, user_dependency
from ..models import user, user_profile, dietary_goal, GoalType, WeeklyGoalRate

router = APIRouter(
    prefix="/dietary-goal",
    tags=["Dietary Goal"]
)

def sg_now() -> datetime:
    return datetime.now(ZoneInfo("Asia/Singapore"))

class GenerateDietaryGoalRequest(BaseModel):
    goal_type: GoalType
    weekly_goal_rate: WeeklyGoalRate
    target_weight_kg: float = Field(gt=0)

class EditPrimaryDietaryGoalRequest(BaseModel):
    goal_type: Optional[GoalType] = None
    weekly_goal_rate: Optional[WeeklyGoalRate] = None
    target_weight_kg: Optional[float] = Field(default=None, gt=0)

class EditSecondaryDietaryGoalRequest(BaseModel):
    daily_calorie_target: int
    target_weight_kg: Optional[float] = Field(default=None, gt=0)

class GenerateDietaryGoalResponse(BaseModel):
    goal_type: GoalType
    target_weight_kg: float = Field(gt=0)
    weekly_goal_rate: WeeklyGoalRate
    daily_calorie_target: int = Field(gt=0)
    daily_protein_g: float = Field(gt=0)
    daily_carb_g: float = Field(gt=0)
    daily_fat_g: float = Field(gt=0)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=sg_now)
    updated_at: datetime = Field(default_factory=sg_now)

class ViewDietaryGoalResponse(BaseModel):
    goal_id: int
    user_id: int
    goal_type: GoalType
    target_weight_kg: float 
    weekly_goal_rate: WeeklyGoalRate
    daily_calorie_target: int 
    daily_protein_g: float 
    daily_carb_g: float 
    daily_fat_g: float 
    projected_goal_date: date
    is_active: bool
    created_at: datetime 
    updated_at: datetime   

    """
    ==WeeklyGoalRate==
    Aggressive: 1kg per week
    Moderate: 0.5kg per week
    Conservative: 0.25kg per week

    following the rule 7700 kcal per week of deficit/surplus per 1kg weight loss/gain:
    aggressive => 1100kcal deficit/surplus daily
    moderate => 550kcal deficit/surplus daily
    conservative => 275kcal deficit/surplus daily
    """

def calorie_macro_helper_function(tdee, weekly_goal_rate, goal_type):

    if goal_type == GoalType.maintain:
        daily_cal = tdee
    
    elif goal_type == GoalType.lose:
        if weekly_goal_rate == WeeklyGoalRate.conservative:
            daily_cal = tdee - 275
            
        elif weekly_goal_rate == WeeklyGoalRate.moderate:
            daily_cal = tdee - 550
        
        else: 
            daily_cal = tdee - 1100
    
    else:
        if weekly_goal_rate == WeeklyGoalRate.conservative:
            daily_cal = tdee + 275
            
        elif weekly_goal_rate == WeeklyGoalRate.moderate:
            daily_cal = tdee + 550
        
        else: 
            daily_cal = tdee + 1100

    if daily_cal < 1200:
        daily_cal = 1200

    carb, protein, fat = macro_distribution(daily_cal)

    return daily_cal, carb, protein, fat

def goal_detail_helper_function(tdee, daily_calorie):
    
    diff = daily_calorie - tdee

    if abs(diff) < 50:
        goal_type = GoalType.maintain
    
    elif diff < 0:
        goal_type = GoalType.lose
    
    else:
        goal_type = GoalType.gain

    offset = abs(tdee - daily_calorie)

    if offset < 50:
        weekly_rate = WeeklyGoalRate.stagnant

    elif offset <= 400:
        weekly_rate = WeeklyGoalRate.conservative
    
    elif offset <= 825:
        weekly_rate = WeeklyGoalRate.moderate
    
    else: 
        weekly_rate = WeeklyGoalRate.aggressive

    return goal_type, weekly_rate
        
def projected_goal_duration(weekly_goal_rate, current_weight, target_weight):

    if current_weight == target_weight:
        return 0
    
    if weekly_goal_rate == WeeklyGoalRate.stagnant:
        return float('inf')
    
    elif weekly_goal_rate == WeeklyGoalRate.conservative:
        weekly_weight_change = 0.25
    
    elif weekly_goal_rate == WeeklyGoalRate.moderate:
        weekly_weight_change = 0.5

    else: 
        weekly_weight_change = 1

    weight_diff = abs(current_weight - target_weight)

    projected_duration_weeks = math.ceil(weight_diff/weekly_weight_change)
    
    return projected_duration_weeks

def projected_goal_date(updated_time, projected_weeks):

    projected_date = updated_time + timedelta(weeks=projected_weeks)
    return projected_date.date()

def macro_distribution(daily_calorie):

    carb = (0.4*daily_calorie)/4
    protein = (0.3*daily_calorie)/4
    fat = (0.3*daily_calorie)/9

    return round(carb, 1), round(protein, 1), round(fat, 1)

# calculated goals by system
# inputs: goal_type, target_weight, tdee from user_profile
# outputs: daily_calorie_target, daily_protein_g, daily_carb_g, daily_fat_g
@router.post('/generate-dietary-goal', response_model=GenerateDietaryGoalResponse, status_code=status.HTTP_201_CREATED)
async def generate_dietary_goal(
    dietary_goal_data:GenerateDietaryGoalRequest,
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

    db_profile = db.exec(
        select(user_profile).where(user_profile.user_id == int(current_user["id"]))
    ).first()

    if db_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User profile not found'
        )
    
    if dietary_goal_data.goal_type == GoalType.maintain and dietary_goal_data.weekly_goal_rate != WeeklyGoalRate.stagnant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Weekly goal rate must be stagnant if goal type is maintain'
        )

    if dietary_goal_data.goal_type != GoalType.maintain and dietary_goal_data.weekly_goal_rate == WeeklyGoalRate.stagnant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Weekly goal rate cannot be stagnant if goal type is lose or gain'
        )

    if dietary_goal_data.goal_type == GoalType.maintain and dietary_goal_data.target_weight_kg != db_profile.weight_kg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Target weight must be the same as current weight if goal type is maintain'
        )
    
    if dietary_goal_data.goal_type == GoalType.lose and dietary_goal_data.target_weight_kg >= db_profile.weight_kg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Target weight must be lower than current weight if goal type is lose'
        )

    if dietary_goal_data.goal_type == GoalType.gain and dietary_goal_data.target_weight_kg <= db_profile.weight_kg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Target weight must be higher than current weight if goal type is gain'
        )

    existing_dietary_goal = db.exec(
        select(dietary_goal).where(
            dietary_goal.user_id == int(current_user["id"]),
            dietary_goal.is_active == True
            )
    ).first()

    if existing_dietary_goal:
        existing_dietary_goal.is_active = False
    

    daily_cal, carb, protein, fat = calorie_macro_helper_function(
        db_profile.tdee, 
        dietary_goal_data.weekly_goal_rate, 
        dietary_goal_data.goal_type
        )

    new_dietary_goal = dietary_goal(
        user_id=int(current_user["id"]),
        goal_type=dietary_goal_data.goal_type,
        target_weight_kg=dietary_goal_data.target_weight_kg,
        weekly_goal_rate=dietary_goal_data.weekly_goal_rate,
        daily_calorie_target=daily_cal,
        daily_protein_g=protein,
        daily_carb_g=carb,
        daily_fat_g=fat,
        is_active=True
    )

    try:
        db.add(new_dietary_goal)
        if existing_dietary_goal:
            db.add(existing_dietary_goal)

        db.commit()
        db.refresh(new_dietary_goal)

        if existing_dietary_goal:
            db.refresh(existing_dietary_goal)

        return new_dietary_goal
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# edit goal via goal type, weekly rate, and target weight
@router.put('/edit-dietary-goal-primary', status_code=status.HTTP_204_NO_CONTENT)
async def edit_dietary_goal_primary(
    edit_dietary_goal_data:EditPrimaryDietaryGoalRequest,
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

    db_profile = db.exec(
        select(user_profile).where(user_profile.user_id == int(current_user["id"]))
    ).first()

    if db_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User profile not found'
        )
    
    db_dietary_goal = db.exec(
        select(dietary_goal).where(
            dietary_goal.user_id == int(current_user['id']),
            dietary_goal.is_active == True           
        )
    ).first()

    if db_dietary_goal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Active dietary goal not found'
        )
    
    updates = edit_dietary_goal_data.model_dump(exclude_unset=True)
    
    for field, value in updates.items():
        setattr(db_dietary_goal, field, value)

    db_dietary_goal.updated_at = sg_now()

    if db_dietary_goal.goal_type == GoalType.maintain and db_dietary_goal.weekly_goal_rate != WeeklyGoalRate.stagnant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Weekly goal rate must be stagnant if goal type is maintain'
        )

    if db_dietary_goal.goal_type != GoalType.maintain and db_dietary_goal.weekly_goal_rate == WeeklyGoalRate.stagnant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Weekly goal rate cannot be stagnant if goal type is lose or gain'
        )

    if db_dietary_goal.goal_type == GoalType.maintain and db_dietary_goal.target_weight_kg != db_profile.weight_kg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Target weight must be the same as current weight if goal type is maintain'
        )
    
    if db_dietary_goal.goal_type == GoalType.lose and db_dietary_goal.target_weight_kg >= db_profile.weight_kg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Target weight must be lower than current weight if goal type is lose'
        )

    if db_dietary_goal.goal_type == GoalType.gain and db_dietary_goal.target_weight_kg <= db_profile.weight_kg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Target weight must be higher than current weight if goal type is gain'
        )
    daily_cal, carb, protein, fat = calorie_macro_helper_function(
        db_profile.tdee, 
        edit_dietary_goal_data.weekly_goal_rate, 
        edit_dietary_goal_data.goal_type
        )
    
    db_dietary_goal.daily_calorie_target = daily_cal
    db_dietary_goal.daily_carb_g = carb
    db_dietary_goal.daily_protein_g = protein
    db_dietary_goal.daily_fat_g = fat

    try:
        db.add(db_dietary_goal)

        db.commit()
        db.refresh(db_dietary_goal)
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
@router.put('/edit-dietary-goal-secondary', status_code=status.HTTP_204_NO_CONTENT)
async def edit_dietary_goal_secondary(
    edit_dietary_goal_data: EditSecondaryDietaryGoalRequest,
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

    db_profile = db.exec(
        select(user_profile).where(user_profile.user_id == int(current_user["id"]))
    ).first()

    if db_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User profile not found'
        )
    
    db_dietary_goal = db.exec(
        select(dietary_goal).where(
            dietary_goal.user_id == int(current_user['id']),
            dietary_goal.is_active == True           
        )
    ).first()

    if db_dietary_goal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Active dietary goal not found'
        )

    if edit_dietary_goal_data.daily_calorie_target == db_dietary_goal.daily_calorie_target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='New daily calorie target cannot be same as current daily calorie target'
        )   
    
    if edit_dietary_goal_data.daily_calorie_target < 1200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Daily calorie target cannot be too low'
        )

    
    updates = edit_dietary_goal_data.model_dump(exclude_unset=True)
    
    for field, value in updates.items():
        setattr(db_dietary_goal, field, value)

    goal_type, weekly_goal_rate = goal_detail_helper_function(db_profile.tdee, edit_dietary_goal_data.daily_calorie_target)

    if goal_type == GoalType.maintain and db_dietary_goal.target_weight_kg != db_profile.weight_kg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Target weight must be same as current weight if goal type is maintain'
        )
    
    if goal_type != GoalType.maintain and db_dietary_goal.target_weight_kg == db_profile.weight_kg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Target weight cannot be same as current weight if goal type is gain or lose'
        )
    
    if goal_type == GoalType.lose and db_dietary_goal.target_weight_kg >= db_profile.weight_kg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Target weight must be lower than current weight if goal type is lose'
        )
    
    if goal_type == GoalType.gain and db_dietary_goal.target_weight_kg <= db_profile.weight_kg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Target weight must be higher than current weight if goal type is gain'
        )

    carb, protein, fat = macro_distribution(edit_dietary_goal_data.daily_calorie_target)

    db_dietary_goal.goal_type = goal_type
    db_dietary_goal.weekly_goal_rate = weekly_goal_rate
    db_dietary_goal.daily_carb_g = carb
    db_dietary_goal.daily_protein_g = protein
    db_dietary_goal.daily_fat_g = fat

    db_dietary_goal.updated_at = sg_now()

    try:
        db.add(db_dietary_goal)

        db.commit()
        db.refresh(db_dietary_goal)
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get('/view-dietary-goal', response_model=ViewDietaryGoalResponse, status_code=status.HTTP_200_OK)
async def view_active_dietary_goal(
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

    db_profile = db.exec(
        select(user_profile).where(user_profile.user_id == int(current_user["id"]))
    ).first()

    if db_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='User profile not found'
        )
    
    db_dietary_goal = db.exec(
        select(dietary_goal).where(
            dietary_goal.user_id == int(current_user['id']),
            dietary_goal.is_active == True           
        )
    ).first()

    if db_dietary_goal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Active dietary goal not found'
        )
    
    projected_goal_duration_weeks = projected_goal_duration(
        db_dietary_goal.weekly_goal_rate, 
        db_profile.weight_kg, 
        db_dietary_goal.target_weight_kg
        )
    
    goal_date = projected_goal_date(db_dietary_goal.updated_at, projected_goal_duration_weeks)

    return {
        "goal_id": db_dietary_goal.goal_id,
        "user_id": db_dietary_goal.user_id,
        "goal_type": db_dietary_goal.goal_type,
        "target_weight_kg": db_dietary_goal.target_weight_kg,
        "weekly_goal_rate": db_dietary_goal.weekly_goal_rate,
        "daily_calorie_target": db_dietary_goal.daily_calorie_target,
        "daily_protein_g": db_dietary_goal.daily_protein_g,
        "daily_carb_g": db_dietary_goal.daily_carb_g,
        "daily_fat_g": db_dietary_goal.daily_fat_g,
        "projected_goal_date": goal_date,
        "is_active": db_dietary_goal.is_active,
        "created_at": db_dietary_goal.created_at,
        "updated_at": db_dietary_goal.updated_at
    }