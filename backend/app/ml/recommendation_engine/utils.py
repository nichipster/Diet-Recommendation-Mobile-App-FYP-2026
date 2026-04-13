from datetime import date
from zoneinfo import ZoneInfo
from typing import Optional

from sqlmodel import Session, select

from app.models import dietary_goal, dietary_entry, user_preferences, GoalType
from .schemas import UserGoalContext, UserPreferenceContext


def get_active_goal(db: Session, user_id: int) -> Optional[dietary_goal]:
    """
    Fetches the single active dietary goal for a user.

    Args:
        db (Session): SQLModel database session.
        user_id (int): The authenticated user's ID.

    Returns:
        Optional[dietary_goal]: The active goal, or None if not set.
    """
    return db.exec(
        select(dietary_goal).where(
            dietary_goal.user_id == user_id,
            dietary_goal.is_active == True
        )
    ).first()


def get_today_entry(db: Session, user_id: int) -> Optional[dietary_entry]:
    """
    Fetches today's dietary_entry row for a user (Singapore timezone).

    Args:
        db (Session): SQLModel database session.
        user_id (int): The authenticated user's ID.

    Returns:
        Optional[dietary_entry]: Today's entry, or None if no meals logged yet.
    """
    today = date.today()   # Already correct since server uses SG tz
    return db.exec(
        select(dietary_entry).where(
            dietary_entry.user_id == user_id,
            dietary_entry.entry_date == today
        )
    ).first()


def build_goal_context(
    db: Session,
    user_id: int
) -> Optional[UserGoalContext]:
    """
    Computes the user's remaining macro budget for today.

    Subtracts today's consumed totals from the active daily targets.
    Returns None if the user has no active dietary goal — the engine
    caller must handle this as a cold-start/no-goal scenario.

    Args:
        db (Session): SQLModel database session.
        user_id (int): The authenticated user's ID.

    Returns:
        Optional[UserGoalContext]: Remaining budget snapshot, or None.
    """
    goal = get_active_goal(db, user_id)
    if goal is None:
        return None

    today_entry = get_today_entry(db, user_id)

    consumed_cal = today_entry.total_calories_consumed if today_entry else 0.0
    consumed_pro = today_entry.total_protein_g if today_entry else 0.0
    consumed_carb = today_entry.total_carb_g if today_entry else 0.0
    consumed_fat = today_entry.total_fat_g if today_entry else 0.0

    return UserGoalContext(
        user_id=user_id,
        remaining_calories=goal.daily_calorie_target - consumed_cal,
        remaining_protein_g=goal.daily_protein_g - consumed_pro,
        remaining_carb_g=goal.daily_carb_g - consumed_carb,
        remaining_fat_g=goal.daily_fat_g - consumed_fat,
        goal_type=goal.goal_type.value
    )


def build_preference_context(
    db: Session,
    user_id: int
) -> UserPreferenceContext:
    """
    Fetches the user's dietary preferences and allergy flags.

    Returns a default (all-False) context if the user has no preferences row,
    which means no hard exclusions will be applied.

    Args:
        db (Session): SQLModel database session.
        user_id (int): The authenticated user's ID.

    Returns:
        UserPreferenceContext: Preference snapshot.
    """
    prefs = db.exec(
        select(user_preferences).where(user_preferences.user_id == user_id)
    ).first()

    if prefs is None:
        return UserPreferenceContext()

    return UserPreferenceContext(
        is_vegetarian=prefs.is_vegetarian,
        is_vegan=prefs.is_vegan,
        is_halal=prefs.is_halal,
        is_gluten_free=prefs.is_gluten_free,
        has_peanut_allergy=prefs.has_peanut_allergy,
        has_tree_nut_allergy=prefs.has_tree_nut_allergy,
        has_milk_allergy=prefs.has_milk_allergy,
        has_egg_allergy=prefs.has_egg_allergy,
        has_fish_allergy=prefs.has_fish_allergy,
        has_shellfish_allergy=prefs.has_shellfish_allergy,
        has_soy_allergy=prefs.has_soy_allergy,
        has_wheat_allergy=prefs.has_wheat_allergy,
        has_sesame_allergy=prefs.has_sesame_allergy,
        has_sulfite_allergy=prefs.has_sulfite_allergy,
    )