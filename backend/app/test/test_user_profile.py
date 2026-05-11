"""
test_user_profile.py

Unit and integration tests for routers/user_profile.py.

Coverage targets:
- calculate_age()           birthday today, day before, far-future edge case
- tdee_calculator()         all gender × activity_level combos; Mifflin-St Jeor formula verification
- POST /profile/create-profile  success, already exists (409), user not found, invalid inputs
- GET  /profile/me              success, not found (404), no token (401)
- PUT  /profile/update-profile  success, partial update, TDEE recalculation, not found
- POST /profile/update-weight-log  success, TDEE updated, no profile (404), negative weight (422)
"""

import pytest
from datetime import date, timedelta
from fastapi import status

from app.routers.user_profile import calculate_age, tdee_calculator
from app.models import user_profile, weight_log, Gender, ActivityLevel

from .utils import create_test_user, get_auth_headers


# ---------------------------------------------------------------------------
# Shared profile creation payload
# ---------------------------------------------------------------------------

VALID_PROFILE_PAYLOAD = {
    "gender": "male",
    "dob": "1995-06-15",
    "height_cm": 175.0,
    "weight_kg": 70.0,
    "activity_level": "sedentary",
}


def _create_profile(client, db_session, email: str = "prof@test.com", payload: dict | None = None):
    """Helper: create a user and their profile via the API."""
    db_user = create_test_user(db_session, email=email)
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    body = payload or VALID_PROFILE_PAYLOAD
    resp = client.post("/profile/create-profile", json=body, headers=headers)
    return db_user, headers, resp


# ===========================================================================
# calculate_age()
# ===========================================================================

def test_calculate_age_normal():
    """Standard date of birth returns correct age."""
    dob = date(1990, 1, 1)
    today = date.today()
    expected = today.year - 1990 - ((today.month, today.day) < (1, 1))
    assert calculate_age(dob) == expected


def test_calculate_age_birthday_today():
    """Birthday today — age is the full year count without subtraction."""
    today = date.today()
    dob = date(today.year - 25, today.month, today.day)
    assert calculate_age(dob) == 25


def test_calculate_age_day_before_birthday():
    """Day before birthday — still the previous year's age."""
    today = date.today()
    tomorrow = today + timedelta(days=1)
    # If tomorrow is the birthday, today is the day before
    dob = date(today.year - 30, tomorrow.month, tomorrow.day)
    assert calculate_age(dob) == 29


# ===========================================================================
# tdee_calculator()
# ===========================================================================

# Reference: Mifflin-St Jeor
# Male BMR   = 10w + 6.25h - 5a + 5
# Female BMR = 10w + 6.25h - 5a - 161
# Multipliers: sedentary=1.2, lightly_active=1.375, active=1.55, very_active=1.7

_MALE_BMR_PARAMS = dict(weight_kg=70, height_cm=175, age=25)  # dob derived below

def _dob_for_age(age: int) -> date:
    today = date.today()
    return date(today.year - age, today.month, today.day)


@pytest.mark.parametrize("activity_level,multiplier", [
    ("sedentary", 1.2),
    ("lightly_active", 1.375),
    ("active", 1.55),
    ("very_active", 1.7),
])
def test_tdee_male_all_activity_levels(activity_level, multiplier):
    """Male TDEE = int(multiplier × (10w + 6.25h − 5a + 5)) for all activity levels."""
    w, h, a = 70, 175, 25
    bmr = 10 * w + 6.25 * h - 5 * a + 5
    expected = int(multiplier * bmr)
    result = tdee_calculator(
        gender=Gender.male,
        weight_kg=w,
        height_cm=h,
        dob=_dob_for_age(a),
        activity_level=activity_level,
    )
    assert result == expected


@pytest.mark.parametrize("activity_level,multiplier", [
    ("sedentary", 1.2),
    ("lightly_active", 1.375),
    ("active", 1.55),
    ("very_active", 1.7),
])
def test_tdee_female_all_activity_levels(activity_level, multiplier):
    """Female TDEE = int(multiplier × (10w + 6.25h − 5a − 161)) for all activity levels."""
    w, h, a = 60, 165, 30
    bmr = 10 * w + 6.25 * h - 5 * a - 161
    expected = int(multiplier * bmr)
    result = tdee_calculator(
        gender=Gender.female,
        weight_kg=w,
        height_cm=h,
        dob=_dob_for_age(a),
        activity_level=activity_level,
    )
    assert result == expected


def test_tdee_returns_integer():
    """Return type must be int (no float leakage)."""
    result = tdee_calculator(
        gender=Gender.male,
        weight_kg=80,
        height_cm=180,
        dob=_dob_for_age(28),
        activity_level="active",
    )
    assert isinstance(result, int)


def test_tdee_minimum_is_positive():
    """TDEE should always be a positive integer for realistic inputs."""
    result = tdee_calculator(
        gender=Gender.female,
        weight_kg=40,
        height_cm=145,
        dob=_dob_for_age(18),
        activity_level="sedentary",
    )
    assert result > 0


# ===========================================================================
# POST /profile/create-profile
# ===========================================================================

def test_create_profile_success(client, db_session):
    """Successful profile creation returns 201 with correct fields."""
    db_user, headers, resp = _create_profile(client, db_session, email="cp_ok@test.com")
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["user_id"] == db_user.user_id
    assert data["gender"] == "male"
    assert data["height_cm"] == 175.0
    assert data["weight_kg"] == 70.0
    assert data["tdee"] > 0


def test_create_profile_tdee_matches_formula(client, db_session):
    """TDEE returned by the endpoint matches the manual Mifflin-St Jeor calculation."""
    db_user = create_test_user(db_session, email="cp_tdee@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    resp = client.post("/profile/create-profile", json=VALID_PROFILE_PAYLOAD, headers=headers)
    assert resp.status_code == status.HTTP_201_CREATED

    age = calculate_age(date(1995, 6, 15))
    expected_tdee = int(1.2 * (10 * 70 + 6.25 * 175 - 5 * age + 5))
    assert resp.json()["tdee"] == expected_tdee


def test_create_profile_already_exists(client, db_session):
    """Creating a second profile for the same user returns 409."""
    db_user, headers, _ = _create_profile(client, db_session, email="cp_dup@test.com")
    resp = client.post("/profile/create-profile", json=VALID_PROFILE_PAYLOAD, headers=headers)
    assert resp.status_code == status.HTTP_409_CONFLICT


def test_create_profile_no_token(client):
    """Missing token returns 401."""
    resp = client.post("/profile/create-profile", json=VALID_PROFILE_PAYLOAD)
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_create_profile_user_not_found(client):
    """Token for non-existent user returns 404."""
    headers = get_auth_headers(user_id=99999, email="ghost@test.com")
    resp = client.post("/profile/create-profile", json=VALID_PROFILE_PAYLOAD, headers=headers)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_create_profile_invalid_height_zero(client, db_session):
    """height_cm = 0 fails Pydantic validation → 422."""
    db_user = create_test_user(db_session, email="cp_h0@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    bad_payload = {**VALID_PROFILE_PAYLOAD, "height_cm": 0}
    resp = client.post("/profile/create-profile", json=bad_payload, headers=headers)
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_create_profile_invalid_weight_negative(client, db_session):
    """Negative weight_kg fails Pydantic validation → 422."""
    db_user = create_test_user(db_session, email="cp_wneg@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    bad_payload = {**VALID_PROFILE_PAYLOAD, "weight_kg": -5}
    resp = client.post("/profile/create-profile", json=bad_payload, headers=headers)
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_create_profile_creates_weight_log_entry(client, db_session):
    """Profile creation inserts an initial weight_log row."""
    from sqlmodel import select as sq_select

    db_user, headers, resp = _create_profile(client, db_session, email="cp_wlog@test.com")
    assert resp.status_code == status.HTTP_201_CREATED

    log_entries = db_session.exec(
        sq_select(weight_log).where(weight_log.user_id == db_user.user_id)
    ).all()
    assert len(log_entries) == 1
    assert log_entries[0].weight_kg == 70.0


# ===========================================================================
# GET /profile/me
# ===========================================================================

def test_get_profile_success(client, db_session):
    """Authenticated user with a profile receives their profile data."""
    db_user, headers, _ = _create_profile(client, db_session, email="gp_ok@test.com")
    resp = client.get("/profile/me", headers=headers)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["user_id"] == db_user.user_id
    assert data["gender"] == "male"
    assert "tdee" in data


def test_get_profile_not_found(client, db_session):
    """Authenticated user without a profile returns 404."""
    db_user = create_test_user(db_session, email="gp_noprof@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    resp = client.get("/profile/me", headers=headers)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_get_profile_no_token(client):
    """Missing token returns 401."""
    resp = client.get("/profile/me")
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# PUT /profile/update-profile
# ===========================================================================

def test_update_profile_success(client, db_session):
    """Updating a single field returns 204 and persists the change."""
    db_user, headers, _ = _create_profile(client, db_session, email="up_ok@test.com")
    resp = client.put(
        "/profile/update-profile",
        json={"activity_level": "active"},
        headers=headers,
    )
    assert resp.status_code == status.HTTP_204_NO_CONTENT

    from sqlmodel import select as sq_select
    profile = db_session.exec(
        sq_select(user_profile).where(user_profile.user_id == db_user.user_id)
    ).first()
    assert profile.activity_level == ActivityLevel.active


def test_update_profile_tdee_recalculated(client, db_session):
    """TDEE is recalculated when activity level changes."""
    db_user, headers, create_resp = _create_profile(client, db_session, email="up_tdee@test.com")
    original_tdee = create_resp.json()["tdee"]

    resp = client.put(
        "/profile/update-profile",
        json={"activity_level": "very_active"},
        headers=headers,
    )
    assert resp.status_code == status.HTTP_204_NO_CONTENT

    from sqlmodel import select as sq_select
    profile = db_session.exec(
        sq_select(user_profile).where(user_profile.user_id == db_user.user_id)
    ).first()
    db_session.refresh(profile)
    assert profile.tdee != original_tdee
    assert profile.tdee > original_tdee  # very_active > sedentary


def test_update_profile_not_found(client, db_session):
    """Updating profile when none exists returns 404."""
    db_user = create_test_user(db_session, email="up_noprof@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    resp = client.put("/profile/update-profile", json={"activity_level": "active"}, headers=headers)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_update_profile_no_token(client):
    """Missing token returns 401."""
    resp = client.put("/profile/update-profile", json={"activity_level": "active"})
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================================================
# POST /profile/update-weight-log
# ===========================================================================

def test_update_weight_log_success(client, db_session):
    """Adding a weight log entry returns 201 with the new weight."""
    db_user, headers, _ = _create_profile(client, db_session, email="wl_ok@test.com")
    resp = client.post("/profile/update-weight-log", json={"weight": 72.0}, headers=headers)
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["weight_kg"] == 72.0
    assert data["user_id"] == db_user.user_id


def test_update_weight_log_tdee_updated(client, db_session):
    """TDEE in the profile is updated after a weight log entry."""
    db_user, headers, create_resp = _create_profile(client, db_session, email="wl_tdee@test.com")
    original_tdee = create_resp.json()["tdee"]

    resp = client.post("/profile/update-weight-log", json={"weight": 90.0}, headers=headers)
    assert resp.status_code == status.HTTP_201_CREATED

    from sqlmodel import select as sq_select
    profile = db_session.exec(
        sq_select(user_profile).where(user_profile.user_id == db_user.user_id)
    ).first()
    db_session.refresh(profile)
    assert profile.tdee != original_tdee  # heavier → higher TDEE


def test_update_weight_log_no_profile(client, db_session):
    """User without a profile gets 404."""
    db_user = create_test_user(db_session, email="wl_noprof@test.com")
    headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)
    resp = client.post("/profile/update-weight-log", json={"weight": 70.0}, headers=headers)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_update_weight_log_zero_weight_rejected(client, db_session):
    """weight = 0 is rejected by Pydantic (gt=0) → 422."""
    db_user, headers, _ = _create_profile(client, db_session, email="wl_zero@test.com")
    resp = client.post("/profile/update-weight-log", json={"weight": 0}, headers=headers)
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_update_weight_log_negative_weight_rejected(client, db_session):
    """Negative weight is rejected by Pydantic → 422."""
    db_user, headers, _ = _create_profile(client, db_session, email="wl_neg@test.com")
    resp = client.post("/profile/update-weight-log", json={"weight": -5.0}, headers=headers)
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
