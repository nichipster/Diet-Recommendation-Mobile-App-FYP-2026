"""
test_image_recognition_router.py

Unit and integration tests for routers/image_recognition.py.

Coverage targets:
Endpoint integration:
  - POST /image-recognition/analyze   MIME rejection (400), empty file (400),
                                      file > 5MB (400), ML model not ready (503),
                                      low confidence → needs_confirmation=True (mocked),
                                      high confidence → full result returned (mocked)
  - POST /image-recognition/log       success with portion_multiplier applied,
                                      nutrition aggregation correct,
                                      dietary_entry updated after log,
                                      empty ingredients list returns zeros,
                                      unauthenticated (401)

Helper unit tests:
  - _update_dietary_entry()   creates new entry, updates existing totals
"""

import io
import pytest
from datetime import datetime, date
from zoneinfo import ZoneInfo
from unittest.mock import patch, MagicMock
from fastapi import status

from app.models import meal, dietary_entry, FoodSource
from app.routers.image_recognition import _update_dietary_entry

from .utils import create_test_user, get_auth_headers

SG_TZ = ZoneInfo("Asia/Singapore")

# ---------------------------------------------------------------------------
# Shared image fixtures
# ---------------------------------------------------------------------------

def _make_jpeg_bytes(size: int = 1024) -> bytes:
    """Returns a minimal JPEG-like byte sequence (header only for MIME matching)."""
    # Real JPEG magic bytes so content_type is set correctly in the UploadFile
    # The TestClient reads content_type from the multipart headers, not the bytes.
    return b"\xff\xd8\xff\xe0" + b"\x00" * (size - 4)


def _make_image_file(size: int = 1024, content_type: str = "image/jpeg") -> tuple:
    """Returns (filename, bytes_io, content_type) for multipart upload."""
    data = _make_jpeg_bytes(size)
    return ("image.jpg", io.BytesIO(data), content_type)


# ---------------------------------------------------------------------------
# Shared mock analyze_image responses
# ---------------------------------------------------------------------------

LOW_CONFIDENCE_RESULT = {
    "detected_dish": "unknown_food",
    "confidence": 0.35,
    "needs_confirmation": True,
    "top_alternatives": [
        {"name": "pizza", "confidence": 0.20},
        {"name": "pasta", "confidence": 0.10},
        {"name": "rice", "confidence": 0.05},
    ],
    "ingredients": [],
    "nutrition_total": None,
    "quality_warning": "Low confidence detection",
}

HIGH_CONFIDENCE_RESULT = {
    "detected_dish": "fried_rice",
    "confidence": 0.92,
    "needs_confirmation": False,
    "top_alternatives": [
        {"name": "nasi_goreng", "confidence": 0.05},
        {"name": "egg_fried_rice", "confidence": 0.02},
        {"name": "plain_rice", "confidence": 0.01},
    ],
    "ingredients": [
        {
            "name": "rice",
            "amount_g": 180.0,
            "calories": 240.0,
            "protein_g": 5.0,
            "carb_g": 50.0,
            "fat_g": 1.0,
            "sugar_g": 0.0,
            "fiber_g": 1.0,
            "sodium_mg": 10.0,
        },
        {
            "name": "egg",
            "amount_g": 50.0,
            "calories": 78.0,
            "protein_g": 6.0,
            "carb_g": 1.0,
            "fat_g": 5.0,
            "sugar_g": 0.5,
            "fiber_g": 0.0,
            "sodium_mg": 70.0,
        },
    ],
    "nutrition_total": {
        "calories": 318.0,
        "protein_g": 11.0,
        "carb_g": 51.0,
        "fat_g": 6.0,
    },
    "quality_warning": None,
}


# ===========================================================================
# 1.  _update_dietary_entry() — pure helper (DB-integrated)
# ===========================================================================

class TestUpdateDietaryEntry:

    def test_creates_new_entry_when_none_exists(self, db_session):
        from sqlmodel import select

        db_user = create_test_user(db_session, email="ude_create@test.com")
        consumed_at = datetime.now(SG_TZ)
        today = consumed_at.date()

        # Seed a meal first
        m = meal(
            user_id=db_user.user_id,
            meal_name="Test",
            consumed_at=consumed_at,
            source=FoodSource.manual,
            amount=100.0,
            unit="g",
            calories=300.0,
            protein_g=20.0,
            carb_g=30.0,
            fat_g=10.0,
        )
        db_session.add(m)
        db_session.commit()

        _update_dietary_entry(db_session, db_user.user_id, today)

        entry = db_session.exec(
            select(dietary_entry).where(
                dietary_entry.user_id == db_user.user_id,
                dietary_entry.entry_date == today
            )
        ).first()
        assert entry is not None
        assert entry.total_calories_consumed == pytest.approx(300.0)

    def test_updates_existing_entry(self, db_session):
        from sqlmodel import select

        db_user = create_test_user(db_session, email="ude_update@test.com")
        today = datetime.now(SG_TZ).date()

        # Pre-existing entry
        existing = dietary_entry(
            user_id=db_user.user_id,
            entry_date=today,
            total_calories_consumed=100.0,
            total_protein_g=5.0,
            total_carb_g=15.0,
            total_fat_g=3.0,
        )
        db_session.add(existing)
        db_session.commit()

        # Add a meal and update
        m = meal(
            user_id=db_user.user_id,
            meal_name="New Meal",
            consumed_at=datetime.now(SG_TZ),
            source=FoodSource.manual,
            amount=100.0,
            unit="g",
            calories=200.0,
            protein_g=10.0,
            carb_g=20.0,
            fat_g=5.0,
        )
        db_session.add(m)
        db_session.commit()

        _update_dietary_entry(db_session, db_user.user_id, today)

        updated = db_session.exec(
            select(dietary_entry).where(
                dietary_entry.user_id == db_user.user_id,
                dietary_entry.entry_date == today
            )
        ).first()
        # Should now reflect the actual meal (200 cal), not old + new
        assert updated.total_calories_consumed == pytest.approx(200.0)


# ===========================================================================
# 2.  POST /image-recognition/analyze
# ===========================================================================

class TestAnalyzeFoodImage:

    def test_unsupported_mime_type_returns_400(self, client, db_session):
        db_user = create_test_user(db_session, email="ira_mime@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.post(
            "/image-recognition/analyze",
            files={"image": ("photo.gif", io.BytesIO(b"GIF89a"), "image/gif")},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Unsupported file type" in resp.json()["detail"]

    def test_empty_file_returns_400(self, client, db_session):
        db_user = create_test_user(db_session, email="ira_empty@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.post(
            "/image-recognition/analyze",
            files={"image": ("empty.jpg", io.BytesIO(b""), "image/jpeg")},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "empty" in resp.json()["detail"].lower()

    def test_file_too_large_returns_400(self, client, db_session):
        """Files exceeding 5MB must be rejected."""
        db_user = create_test_user(db_session, email="ira_large@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        big_bytes = b"\x00" * (5 * 1024 * 1024 + 1)  # 5MB + 1 byte
        resp = client.post(
            "/image-recognition/analyze",
            files={"image": ("big.jpg", io.BytesIO(big_bytes), "image/jpeg")},
            headers=headers,
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "5MB" in resp.json()["detail"]

    def test_model_not_ready_returns_503(self, client, db_session):
        """FileNotFoundError from ML pipeline must map to 503 Service Unavailable."""
        db_user = create_test_user(db_session, email="ira_503@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        with patch(
            "app.routers.image_recognition.analyze_image",
            side_effect=FileNotFoundError("ONNX model file not found"),
        ):
            resp = client.post(
                "/image-recognition/analyze",
                files={"image": _make_image_file()},
                headers=headers,
            )

        assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert "ML model not ready" in resp.json()["detail"]

    def test_low_confidence_returns_needs_confirmation(self, client, db_session):
        """When confidence < 0.55, needs_confirmation must be True and ingredients empty."""
        db_user = create_test_user(db_session, email="ira_low@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        with patch(
            "app.routers.image_recognition.analyze_image",
            return_value=LOW_CONFIDENCE_RESULT,
        ):
            resp = client.post(
                "/image-recognition/analyze",
                files={"image": _make_image_file()},
                headers=headers,
            )

        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["needs_confirmation"] is True
        assert data["ingredients"] == []
        assert data["nutrition_total"] is None

    def test_high_confidence_returns_full_result(self, client, db_session):
        """High confidence detection must return ingredients and nutrition_total."""
        db_user = create_test_user(db_session, email="ira_high@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        with patch(
            "app.routers.image_recognition.analyze_image",
            return_value=HIGH_CONFIDENCE_RESULT,
        ):
            resp = client.post(
                "/image-recognition/analyze",
                files={"image": _make_image_file()},
                headers=headers,
            )

        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["needs_confirmation"] is False
        assert data["confidence"] == pytest.approx(0.92)
        assert data["detected_dish"] == "fried_rice"
        assert len(data["ingredients"]) == 2
        assert data["nutrition_total"]["calories"] == pytest.approx(318.0)

    def test_unauthenticated_returns_401(self, client):
        resp = client.post(
            "/image-recognition/analyze",
            files={"image": _make_image_file()},
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_value_error_from_pipeline_returns_400(self, client, db_session):
        """ValueError raised by preprocess (e.g. invalid image bytes) → 400."""
        db_user = create_test_user(db_session, email="ira_val@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        with patch(
            "app.routers.image_recognition.analyze_image",
            side_effect=ValueError("Cannot decode image bytes"),
        ):
            resp = client.post(
                "/image-recognition/analyze",
                files={"image": _make_image_file()},
                headers=headers,
            )

        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ===========================================================================
# 3.  POST /image-recognition/log
# ===========================================================================

class TestLogConfirmedMeal:

    VALID_INGREDIENTS = [
        {
            "name": "rice",
            "amount_g": 180.0,
            "calories": 240.0,
            "protein_g": 5.0,
            "carb_g": 50.0,
            "fat_g": 1.0,
        },
        {
            "name": "egg",
            "amount_g": 50.0,
            "calories": 78.0,
            "protein_g": 6.0,
            "carb_g": 1.0,
            "fat_g": 5.0,
        },
    ]

    def test_success_nutrition_aggregation(self, client, db_session):
        """Calories and macros must sum across all ingredients (portion_multiplier=1)."""
        db_user = create_test_user(db_session, email="log_success@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.post("/image-recognition/log", json={
            "meal_name": "Fried Rice",
            "ingredients": self.VALID_INGREDIENTS,
            "portion_multiplier": 1.0,
        }, headers=headers)

        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data["meal_name"] == "Fried Rice"
        # 240 + 78 = 318 calories
        assert data["calories"] == pytest.approx(318.0)
        # 5 + 6 = 11 protein
        assert data["protein_g"] == pytest.approx(11.0)

    def test_portion_multiplier_applied(self, client, db_session):
        """Nutrition must be scaled by the portion_multiplier."""
        db_user = create_test_user(db_session, email="log_mult@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.post("/image-recognition/log", json={
            "meal_name": "Double Portion",
            "ingredients": self.VALID_INGREDIENTS,
            "portion_multiplier": 2.0,
        }, headers=headers)

        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        # (240 + 78) * 2 = 636
        assert data["calories"] == pytest.approx(636.0)

    def test_dietary_entry_updated_after_log(self, client, db_session):
        """After logging, the dietary_entry aggregate must reflect the meal calories."""
        from sqlmodel import select

        db_user = create_test_user(db_session, email="log_entry@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        client.post("/image-recognition/log", json={
            "meal_name": "Smoothie Bowl",
            "ingredients": [
                {
                    "name": "banana",
                    "amount_g": 100.0,
                    "calories": 89.0,
                    "protein_g": 1.1,
                    "carb_g": 23.0,
                    "fat_g": 0.3,
                }
            ],
            "portion_multiplier": 1.0,
        }, headers=headers)

        today = datetime.now(SG_TZ).date()
        entry = db_session.exec(
            select(dietary_entry).where(
                dietary_entry.user_id == db_user.user_id,
                dietary_entry.entry_date == today
            )
        ).first()
        assert entry is not None
        assert entry.total_calories_consumed == pytest.approx(89.0)

    def test_empty_ingredients_logs_zero_nutrition(self, client, db_session):
        """An empty ingredients list must log a meal with all-zero nutrition."""
        db_user = create_test_user(db_session, email="log_empty@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.post("/image-recognition/log", json={
            "meal_name": "Empty Meal",
            "ingredients": [],
            "portion_multiplier": 1.0,
        }, headers=headers)

        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data["calories"] == pytest.approx(0.0)
        assert data["protein_g"] == pytest.approx(0.0)

    def test_portion_multiplier_above_5_rejected(self, client, db_session):
        """portion_multiplier has le=5.0; values above that must fail validation."""
        db_user = create_test_user(db_session, email="log_mult_over@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.post("/image-recognition/log", json={
            "meal_name": "Over Portion",
            "ingredients": self.VALID_INGREDIENTS,
            "portion_multiplier": 5.1,
        }, headers=headers)
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_zero_portion_multiplier_rejected(self, client, db_session):
        """portion_multiplier has gt=0; zero must be rejected."""
        db_user = create_test_user(db_session, email="log_mult_zero@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.post("/image-recognition/log", json={
            "meal_name": "Zero Portion",
            "ingredients": self.VALID_INGREDIENTS,
            "portion_multiplier": 0.0,
        }, headers=headers)
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/image-recognition/log", json={
            "meal_name": "Anon Meal",
            "ingredients": [],
            "portion_multiplier": 1.0,
        })
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_meal_row_persisted_in_db(self, client, db_session):
        """A meal row with source=manual must be created in the DB after log."""
        from sqlmodel import select

        db_user = create_test_user(db_session, email="log_persist@test.com")
        headers = get_auth_headers(user_id=db_user.user_id, email=db_user.email)

        resp = client.post("/image-recognition/log", json={
            "meal_name": "Persisted Dish",
            "ingredients": [
                {
                    "name": "noodles",
                    "amount_g": 200.0,
                    "calories": 350.0,
                    "protein_g": 10.0,
                    "carb_g": 65.0,
                    "fat_g": 5.0,
                }
            ],
            "portion_multiplier": 1.0,
        }, headers=headers)

        assert resp.status_code == status.HTTP_201_CREATED
        meal_id = resp.json()["meal_id"]

        db_meal = db_session.exec(
            select(meal).where(meal.meal_id == meal_id)
        ).first()
        assert db_meal is not None
        assert db_meal.meal_name == "Persisted Dish"
        assert db_meal.source == FoodSource.manual
        assert db_meal.unit == "g"
