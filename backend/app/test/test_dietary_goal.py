"""
test_dietary_goal.py

Unit and integration tests for routers/dietary_goal.py.

Coverage targets:
Pure helpers:
- calorie_macro_helper_function()   all 9 goal_type × weekly_goal_rate combos, 1200 kcal floor
- macro_distribution()              known input → expected macro split
- goal_detail_helper_function()     all classification thresholds (maintain/lose/gain, all rates)
- projected_goal_duration()         same weight (0 weeks), stagnant (inf), all 3 rates
- projected_goal_date()             known duration → known date

Endpoint integration:
- POST /dietary-goal/generate-dietary-goal — all valid combos, constraint violations, no profile
- PUT  /dietary-goal/edit-dietary-goal-primary    — success, constraint violations, no goal (404)
- PUT  /dietary-goal/edit-dietary-goal-secondary  — success, same calorie (400), below 1200 (400)
- GET  /dietary-goal/view-dietary-goal            — success with projected_goal_date, no goal (404)
"""

import pytest
import math
from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo

from fastapi import status
from app.routers.dietary_goal import (
    calorie_macro_helper_function,
    macro_distribution,
    goal_detail_helper_function,
    projected_goal_duration,
    projected_goal_date,
)
from app.models import GoalType, WeeklyGoalRate

from .utils import create_test_user, get_auth_headers

SG_TZ = ZoneInfo("Asia/Singapore")

# ---------------------------------------------------------------------------
# Shared test fixtures / helpers
# ---------------------------------------------------------------------------

VALID_PROFILE_PAYLOAD = {
    "gender": "male",
    "dob": "1995-06-15",
    "height_cm": 175.0,
    "weight_kg": 70.0,
    "activity_level": "sedentary",
}


def _setup_user_with_profile(client, db_session, email: str):
    """Create a user + profile; return (db_user, headers)."""
    db_user = create_test_user(db_session, email=email)
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    client.post("/profile/create-profile", json=VALID_PROFILE_PAYLOAD, headers=headers)
    return db_user, headers


def _get_profile_weight(client, headers) -> float:
    return client.get("/profile/me", headers=headers).json()["weight_kg"]


def _generate_goal(client, headers, goal_type, rate, target_weight):
    return client.post("/dietary-goal/generate-dietary-goal", json={
        "goal_type": goal_type,
        "weekly_goal_rate": rate,
        "target_weight_kg": target_weight,
    }, headers=headers)


# ===========================================================================
# calorie_macro_helper_function()
# ===========================================================================

@pytest.mark.parametrize("goal_type,rate,expected_offset", [
    (GoalType.maintain, WeeklyGoalRate.stagnant, 0),
    (GoalType.lose, WeeklyGoalRate.conservative, -275),
    (GoalType.lose, WeeklyGoalRate.moderate, -550),
    (GoalType.lose, WeeklyGoalRate.aggressive, -1100),
    (GoalType.gain, WeeklyGoalRate.conservative, +275),
    (GoalType.gain, WeeklyGoalRate.moderate, +550),
    (GoalType.gain, WeeklyGoalRate.aggressive, +1100),
])
def test_calorie_macro_helper_correct_calorie(goal_type, rate, expected_offset):
    """Daily calorie target = TDEE + expected_offset (before floor application)."""
    tdee = 2000
    daily_cal, carb, protein, fat = calorie_macro_helper_function(tdee, rate, goal_type)
    assert daily_cal == max(2000 + expected_offset, 1200)


def test_calorie_macro_helper_applies_1200_floor():
    """Very low TDEE + aggressive deficit is floored at 1200 kcal."""
    tdee = 1000  # 1000 - 1100 = -100 → floor to 1200
    daily_cal, _, _, _ = calorie_macro_helper_function(tdee, WeeklyGoalRate.aggressive, GoalType.lose)
    assert daily_cal == 1200


def test_calorie_macro_helper_returns_macros():
    """Returns a 4-tuple: (daily_cal, carb_g, protein_g, fat_g)."""
    result = calorie_macro_helper_function(2000, WeeklyGoalRate.stagnant, GoalType.maintain)
    assert len(result) == 4
    daily_cal, carb, protein, fat = result
    assert daily_cal == 2000
    assert carb > 0
    assert protein > 0
    assert fat > 0


# ===========================================================================
# macro_distribution()
# ===========================================================================

def test_macro_distribution_known_input():
    """2000 kcal → 40/30/30 split in grams (carb 200g, protein 150g, fat ~66.7g)."""
    carb, protein, fat = macro_distribution(2000)
    assert carb == round((0.4 * 2000) / 4, 1)   # 200.0g
    assert protein == round((0.3 * 2000) / 4, 1) # 150.0g
    assert fat == round((0.3 * 2000) / 9, 1)     # 66.7g


def test_macro_distribution_sums_approximately_to_calories():
    """Reconstructed calorie total from macros is within 5% of input."""
    for cal in [1200, 1800, 2500]:
        carb, protein, fat = macro_distribution(cal)
        reconstructed = carb * 4 + protein * 4 + fat * 9
        assert abs(reconstructed - cal) / cal < 0.05


# ===========================================================================
# goal_detail_helper_function()
# ===========================================================================

@pytest.mark.parametrize("offset,expected_goal,expected_rate", [
    (0, GoalType.maintain, WeeklyGoalRate.stagnant),           # diff = 0 → maintain
    (40, GoalType.maintain, WeeklyGoalRate.stagnant),          # diff = 40 < 50 → maintain
    (-49, GoalType.maintain, WeeklyGoalRate.stagnant),         # abs(diff) = 49 < 50 → maintain
    (-300, GoalType.lose, WeeklyGoalRate.conservative),        # offset 300 ≤ 400
    (-600, GoalType.lose, WeeklyGoalRate.moderate),            # offset 600 ≤ 825
    (-1100, GoalType.lose, WeeklyGoalRate.aggressive),         # offset 1100 > 825
    (300, GoalType.gain, WeeklyGoalRate.conservative),
    (600, GoalType.gain, WeeklyGoalRate.moderate),
    (1100, GoalType.gain, WeeklyGoalRate.aggressive),
])
def test_goal_detail_helper_classification(offset, expected_goal, expected_rate):
    """Classifies goal_type and weekly_rate correctly based on calorie offset from TDEE."""
    tdee = 2000
    daily_cal = tdee + offset
    goal_type, weekly_rate = goal_detail_helper_function(tdee, daily_cal)
    assert goal_type == expected_goal
    assert weekly_rate == expected_rate


# ===========================================================================
# projected_goal_duration()
# ===========================================================================

def test_projected_duration_same_weight():
    """Same current and target weight → 0 weeks."""
    assert projected_goal_duration(WeeklyGoalRate.conservative, 70.0, 70.0) == 0


def test_projected_duration_stagnant_rate():
    """Stagnant rate with different weights → infinity."""
    result = projected_goal_duration(WeeklyGoalRate.stagnant, 70.0, 65.0)
    assert result == float("inf")


@pytest.mark.parametrize("rate,weekly_change", [
    (WeeklyGoalRate.conservative, 0.25),
    (WeeklyGoalRate.moderate, 0.5),
    (WeeklyGoalRate.aggressive, 1.0),
])
def test_projected_duration_all_rates(rate, weekly_change):
    """Duration = ceil(weight_diff / weekly_change)."""
    current, target = 80.0, 70.0
    expected = math.ceil((current - target) / weekly_change)
    assert projected_goal_duration(rate, current, target) == expected


def test_projected_duration_fractional_rounds_up():
    """Fractional result is rounded up to the nearest whole week."""
    # diff = 0.3 kg at 0.25 kg/week → 1.2 weeks → ceiled to 2
    result = projected_goal_duration(WeeklyGoalRate.conservative, 70.3, 70.0)
    assert result == 2


# ===========================================================================
# projected_goal_date()
# ===========================================================================

def test_projected_goal_date_known_input():
    """Result is exactly `weeks` weeks after the reference datetime."""
    ref = datetime(2026, 1, 1, 0, 0, 0, tzinfo=SG_TZ)
    result = projected_goal_date(ref, 4)
    assert result == date(2026, 1, 29)  # 4 weeks = 28 days


def test_projected_goal_date_zero_weeks():
    """Zero weeks means the goal date is today (the date part of the reference)."""
    ref = datetime(2026, 6, 15, 12, 0, 0, tzinfo=SG_TZ)
    result = projected_goal_date(ref, 0)
    assert result == date(2026, 6, 15)


# ===========================================================================
# POST /dietary-goal/generate-dietary-goal
# ===========================================================================

def test_generate_goal_lose_success(client, db_session):
    """Lose goal with valid target returns 201."""
    _, headers = _setup_user_with_profile(client, db_session, "dg_lose@test.com")
    resp = _generate_goal(client, headers, "lose", "moderate", 65.0)
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["goal_type"] == "lose"
    assert data["daily_calorie_target"] > 0
    assert data["daily_carb_g"] > 0
    assert data["is_active"] is True


def test_generate_goal_gain_success(client, db_session):
    """Gain goal with valid target returns 201."""
    _, headers = _setup_user_with_profile(client, db_session, "dg_gain@test.com")
    resp = _generate_goal(client, headers, "gain", "conservative", 80.0)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json()["goal_type"] == "gain"


def test_generate_goal_maintain_success(client, db_session):
    """Maintain goal with target == current weight returns 201."""
    _, headers = _setup_user_with_profile(client, db_session, "dg_maint@test.com")
    current_weight = _get_profile_weight(client, headers)
    resp = _generate_goal(client, headers, "maintain", "stagnant", current_weight)
    assert resp.status_code == status.HTTP_201_CREATED


def test_generate_goal_deactivates_previous_goal(client, db_session):
    """Generating a second goal deactivates the first one."""
    from sqlmodel import select as sq_select
    from app.models import dietary_goal

    db_user, headers = _setup_user_with_profile(client, db_session, "dg_deact@test.com")
    _generate_goal(client, headers, "lose", "moderate", 65.0)
    _generate_goal(client, headers, "gain", "conservative", 80.0)

    all_goals = db_session.exec(
        sq_select(dietary_goal).where(dietary_goal.user_id == db_user.user_id)
    ).all()
    active_goals = [g for g in all_goals if g.is_active]
    assert len(active_goals) == 1


def test_generate_goal_maintain_with_non_stagnant_rate(client, db_session):
    """maintain + non-stagnant rate returns 400."""
    _, headers = _setup_user_with_profile(client, db_session, "dg_maint_bad@test.com")
    current = _get_profile_weight(client, headers)
    resp = _generate_goal(client, headers, "maintain", "moderate", current)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_generate_goal_lose_with_stagnant_rate(client, db_session):
    """lose + stagnant rate returns 400."""
    _, headers = _setup_user_with_profile(client, db_session, "dg_lose_stag@test.com")
    resp = _generate_goal(client, headers, "lose", "stagnant", 65.0)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_generate_goal_lose_target_above_current_weight(client, db_session):
    """lose + target_weight >= current_weight returns 400."""
    _, headers = _setup_user_with_profile(client, db_session, "dg_lose_hi@test.com")
    resp = _generate_goal(client, headers, "lose", "moderate", 80.0)  # current is 70
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_generate_goal_gain_target_below_current_weight(client, db_session):
    """gain + target_weight <= current_weight returns 400."""
    _, headers = _setup_user_with_profile(client, db_session, "dg_gain_lo@test.com")
    resp = _generate_goal(client, headers, "gain", "moderate", 60.0)  # current is 70
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_generate_goal_maintain_wrong_target_weight(client, db_session):
    """maintain + target != current_weight returns 400."""
    _, headers = _setup_user_with_profile(client, db_session, "dg_maint_tw@test.com")
    resp = _generate_goal(client, headers, "maintain", "stagnant", 75.0)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_generate_goal_no_profile_returns_404(client, db_session):
    """User without a profile returns 404."""
    db_user = create_test_user(db_session, email="dg_noprof@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    resp = _generate_goal(client, headers, "lose", "moderate", 65.0)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_generate_goal_no_token(client):
    """Missing token returns 401."""
    resp = client.post("/dietary-goal/generate-dietary-goal", json={
        "goal_type": "lose",
        "weekly_goal_rate": "moderate",
        "target_weight_kg": 65.0,
    })
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# PUT /dietary-goal/edit-dietary-goal-primary
# ===========================================================================

def test_edit_primary_goal_success(client, db_session):
    """Changing weekly_goal_rate on an existing goal returns 204."""
    _, headers = _setup_user_with_profile(client, db_session, "ep_ok@test.com")
    _generate_goal(client, headers, "lose", "moderate", 65.0)

    resp = client.put("/dietary-goal/edit-dietary-goal-primary", json={
        "goal_type": "lose",
        "weekly_goal_rate": "conservative",
        "target_weight_kg": 65.0,
    }, headers=headers)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_edit_primary_goal_no_active_goal(client, db_session):
    """No active goal → 404."""
    _, headers = _setup_user_with_profile(client, db_session, "ep_nogoal@test.com")
    resp = client.put("/dietary-goal/edit-dietary-goal-primary", json={
        "goal_type": "lose",
        "weekly_goal_rate": "moderate",
        "target_weight_kg": 65.0,
    }, headers=headers)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_edit_primary_goal_invalid_constraint(client, db_session):
    """maintain + moderate rate returns 400."""
    _, headers = _setup_user_with_profile(client, db_session, "ep_bad@test.com")
    _generate_goal(client, headers, "lose", "moderate", 65.0)
    current_weight = _get_profile_weight(client, headers)

    resp = client.put("/dietary-goal/edit-dietary-goal-primary", json={
        "goal_type": "maintain",
        "weekly_goal_rate": "moderate",
        "target_weight_kg": current_weight,
    }, headers=headers)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_edit_primary_goal_no_token(client):
    """Missing token returns 401."""
    resp = client.put("/dietary-goal/edit-dietary-goal-primary", json={
        "goal_type": "lose",
        "weekly_goal_rate": "moderate",
        "target_weight_kg": 65.0,
    })
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# PUT /dietary-goal/edit-dietary-goal-secondary
# ===========================================================================

def _generate_lose_goal(client, headers):
    """Convenience: seed a lose/moderate/65kg goal."""
    return _generate_goal(client, headers, "lose", "moderate", 65.0)


def test_edit_secondary_goal_success(client, db_session):
    """Valid new calorie target (different, above 1200) returns 204."""
    _, headers = _setup_user_with_profile(client, db_session, "es_ok@test.com")
    _generate_lose_goal(client, headers)

    resp = client.put("/dietary-goal/edit-dietary-goal-secondary", json={
        "daily_calorie_target": 1600,
        "target_weight_kg": 65.0,
    }, headers=headers)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_edit_secondary_goal_same_calorie_target(client, db_session):
    """Same calorie target as current returns 400."""
    _, headers = _setup_user_with_profile(client, db_session, "es_same@test.com")
    create_resp = _generate_lose_goal(client, headers)
    current_cal = create_resp.json()["daily_calorie_target"]

    resp = client.put("/dietary-goal/edit-dietary-goal-secondary", json={
        "daily_calorie_target": current_cal,
        "target_weight_kg": 65.0,
    }, headers=headers)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_edit_secondary_goal_below_1200(client, db_session):
    """Calorie target < 1200 returns 400."""
    _, headers = _setup_user_with_profile(client, db_session, "es_low@test.com")
    _generate_lose_goal(client, headers)

    resp = client.put("/dietary-goal/edit-dietary-goal-secondary", json={
        "daily_calorie_target": 1000,
        "target_weight_kg": 65.0,
    }, headers=headers)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_edit_secondary_goal_no_active_goal(client, db_session):
    """No active goal returns 404."""
    _, headers = _setup_user_with_profile(client, db_session, "es_nogoal@test.com")
    resp = client.put("/dietary-goal/edit-dietary-goal-secondary", json={
        "daily_calorie_target": 1600,
        "target_weight_kg": 65.0,
    }, headers=headers)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_edit_secondary_goal_no_token(client):
    """Missing token returns 401."""
    resp = client.put("/dietary-goal/edit-dietary-goal-secondary", json={
        "daily_calorie_target": 1600,
    })
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# GET /dietary-goal/view-dietary-goal
# ===========================================================================

def test_view_dietary_goal_success(client, db_session):
    """Active goal is returned with all required fields including projected_goal_date."""
    _, headers = _setup_user_with_profile(client, db_session, "vdg_ok@test.com")
    _generate_lose_goal(client, headers)

    resp = client.get("/dietary-goal/view-dietary-goal", headers=headers)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()

    required_fields = {
        "goal_id", "user_id", "goal_type", "target_weight_kg", "weekly_goal_rate",
        "daily_calorie_target", "daily_protein_g", "daily_carb_g", "daily_fat_g",
        "projected_goal_date", "is_active", "created_at", "updated_at",
    }
    assert required_fields.issubset(data.keys())
    assert data["is_active"] is True


def test_view_dietary_goal_projected_date_is_in_future(client, db_session):
    """projected_goal_date should be after today for a lose goal with valid target."""
    _, headers = _setup_user_with_profile(client, db_session, "vdg_future@test.com")
    _generate_lose_goal(client, headers)

    resp = client.get("/dietary-goal/view-dietary-goal", headers=headers)
    assert resp.status_code == status.HTTP_200_OK
    projected = date.fromisoformat(resp.json()["projected_goal_date"])
    assert projected > date.today()


def test_view_dietary_goal_not_found(client, db_session):
    """No active goal returns 404."""
    _, headers = _setup_user_with_profile(client, db_session, "vdg_nogoal@test.com")
    resp = client.get("/dietary-goal/view-dietary-goal", headers=headers)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_view_dietary_goal_no_token(client):
    """Missing token returns 401."""
    resp = client.get("/dietary-goal/view-dietary-goal")
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_view_dietary_goal_no_profile_returns_404(client, db_session):
    """User without a profile returns 404 on view."""
    db_user = create_test_user(db_session, email="vdg_noprof@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    resp = client.get("/dietary-goal/view-dietary-goal", headers=headers)
    assert resp.status_code == status.HTTP_404_NOT_FOUND
