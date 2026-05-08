"""
test_services.py

Unit tests for the NutriTrack backend service layer:

  - services/audit_service.py    — log_event() happy path + error swallowing
  - services/email_service.py    — send_verification_email() with mocked Resend
  - services/push_notification_service.py — send_expo_push_notifications()
  - services/spoonacular_service.py — pure mapping functions + mocked HTTP

All external I/O (Resend API, Expo Push API, Spoonacular API) is mocked.
No database is required for the pure-function tests; DB-touching helpers
use the shared db_session fixture from conftest.py.
"""

import json
import pytest
from unittest.mock import MagicMock, patch, call


# ===========================================================================
# audit_service.log_event()
# ===========================================================================

class TestAuditService:
    """Unit tests for services/audit_service.py :: log_event()."""

    def test_happy_path_persists_entry(self, db_session):
        """
        A successful call should add an audit_log row and commit it
        without raising any exception.
        """
        from app.services.audit_service import log_event
        from app.models import audit_log, AuditLogType
        from sqlmodel import select

        before = len(db_session.exec(select(audit_log)).all())

        log_event(
            db_session,
            action="test_action",
            detail="Unit test entry",
            log_type=AuditLogType.system,
            admin_email="tester@test.com",
            ip_address="127.0.0.1",
        )

        after = len(db_session.exec(select(audit_log)).all())
        assert after == before + 1

    def test_persisted_entry_has_correct_fields(self, db_session):
        """Persisted audit log entry should have all provided field values."""
        from app.services.audit_service import log_event
        from app.models import audit_log, AuditLogType
        from sqlmodel import select

        log_event(
            db_session,
            action="check_fields",
            detail="Checking field values",
            log_type=AuditLogType.warning,
            admin_email="admin@example.com",
            ip_address="10.0.0.1",
        )

        entry = db_session.exec(
            select(audit_log)
            .where(audit_log.action == "check_fields")
            .order_by(audit_log.timestamp.desc())
        ).first()

        assert entry is not None
        assert entry.action == "check_fields"
        assert entry.detail == "Checking field values"
        assert entry.type == AuditLogType.warning
        assert entry.admin_email == "admin@example.com"
        assert entry.ip_address == "10.0.0.1"

    def test_null_ip_address_is_allowed(self, db_session):
        """ip_address=None (system events) should not cause failures."""
        from app.services.audit_service import log_event
        from app.models import audit_log, AuditLogType
        from sqlmodel import select

        log_event(
            db_session,
            action="system_event",
            detail="Automated cron job",
            log_type=AuditLogType.system,
            admin_email="system",
            ip_address=None,
        )

        entry = db_session.exec(
            select(audit_log).where(audit_log.action == "system_event")
        ).first()
        assert entry is not None
        assert entry.ip_address is None

    def test_db_commit_failure_is_swallowed(self):
        """
        If db.commit() raises, log_event() should swallow the exception,
        call db.rollback(), and log the error — but NOT propagate.
        """
        from app.services.audit_service import log_event
        from app.models import AuditLogType
        import logging

        mock_db = MagicMock()
        mock_db.commit.side_effect = RuntimeError("DB down")

        # Should NOT raise
        with patch("app.services.audit_service.logger") as mock_logger:
            log_event(
                mock_db,
                action="fail_action",
                detail="Should be swallowed",
                log_type=AuditLogType.user_action,
                admin_email="admin@test.com",
            )

        mock_db.rollback.assert_called_once()
        mock_logger.error.assert_called_once()

    def test_all_audit_log_type_values_accepted(self, db_session):
        """Every AuditLogType enum value should be storable without error."""
        from app.services.audit_service import log_event
        from app.models import AuditLogType

        for log_type in AuditLogType:
            log_event(
                db_session,
                action=f"type_test_{log_type.value}",
                detail=f"Testing {log_type.value}",
                log_type=log_type,
                admin_email="admin@test.com",
            )  # Should not raise


# ===========================================================================
# email_service.send_verification_email()
# ===========================================================================

class TestEmailService:
    """Unit tests for services/email_service.py :: send_verification_email()."""

    @patch("app.services.email_service.resend.Emails.send")
    def test_send_verification_email_calls_resend(self, mock_send):
        """send_verification_email() should invoke resend.Emails.send exactly once."""
        from app.services.email_service import send_verification_email

        send_verification_email("user@example.com", "123456")

        mock_send.assert_called_once()

    @patch("app.services.email_service.resend.Emails.send")
    def test_send_verification_email_uses_correct_recipient(self, mock_send):
        """The 'to' field in the Resend payload must match the given email address."""
        from app.services.email_service import send_verification_email

        send_verification_email("recipient@test.com", "654321")

        call_payload = mock_send.call_args[0][0]
        assert call_payload["to"] == "recipient@test.com"

    @patch("app.services.email_service.resend.Emails.send")
    def test_send_verification_email_includes_code_in_body(self, mock_send):
        """The verification code must appear in the HTML body."""
        from app.services.email_service import send_verification_email

        send_verification_email("someone@test.com", "999888")

        call_payload = mock_send.call_args[0][0]
        assert "999888" in call_payload["html"]

    @patch("app.services.email_service.resend.Emails.send")
    def test_send_verification_email_has_verification_subject(self, mock_send):
        """Subject line should indicate it is a verification email."""
        from app.services.email_service import send_verification_email

        send_verification_email("check@test.com", "111222")

        call_payload = mock_send.call_args[0][0]
        assert "verif" in call_payload["subject"].lower() or "code" in call_payload["subject"].lower()


# ===========================================================================
# push_notification_service.send_expo_push_notifications()
# ===========================================================================

class TestPushNotificationService:
    """Unit tests for services/push_notification_service.py :: send_expo_push_notifications()."""

    def test_empty_token_list_returns_early_with_zero_count(self):
        """Empty token list must return immediately without making HTTP calls."""
        from app.services.push_notification_service import send_expo_push_notifications

        result = send_expo_push_notifications(tokens=[], title="Hi", message="World")

        assert result["success_count"] == 0
        assert result["failed_tokens"] == []
        assert result["raw_responses"] == []

    @patch("app.services.push_notification_service.requests.post")
    def test_successful_batch_increments_success_count(self, mock_post):
        """All OK statuses in Expo response should increment success_count."""
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "data": [
                {"status": "ok"},
                {"status": "ok"},
            ]
        }
        mock_post.return_value = mock_response

        from app.services.push_notification_service import send_expo_push_notifications

        result = send_expo_push_notifications(
            tokens=["ExponentPushToken[abc]", "ExponentPushToken[def]"],
            title="Hello",
            message="World",
        )

        assert result["success_count"] == 2
        assert result["failed_tokens"] == []
        mock_post.assert_called_once()

    @patch("app.services.push_notification_service.requests.post")
    def test_failed_expo_status_appends_to_failed_tokens(self, mock_post):
        """An Expo 'error' status should add the token to failed_tokens."""
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "data": [
                {"status": "error", "message": "DeviceNotRegistered"},
                {"status": "ok"},
            ]
        }
        mock_post.return_value = mock_response

        from app.services.push_notification_service import send_expo_push_notifications

        result = send_expo_push_notifications(
            tokens=["ExponentPushToken[bad]", "ExponentPushToken[good]"],
            title="Test",
            message="Body",
        )

        assert len(result["failed_tokens"]) == 1
        assert result["success_count"] == 1

    @patch("app.services.push_notification_service.requests.post")
    def test_http_error_propagates(self, mock_post):
        """An HTTP error (non-2xx) from Expo should propagate as an exception."""
        import requests
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = requests.HTTPError("500 Server Error")
        mock_post.return_value = mock_response

        from app.services.push_notification_service import send_expo_push_notifications

        with pytest.raises(requests.HTTPError):
            send_expo_push_notifications(
                tokens=["ExponentPushToken[any]"],
                title="Fail",
                message="Test",
            )

    @patch("app.services.push_notification_service.requests.post")
    def test_large_batch_is_chunked_into_multiple_requests(self, mock_post):
        """More than 100 tokens should result in multiple HTTP calls (batches of 100)."""
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"data": [{"status": "ok"}] * 100}
        mock_post.return_value = mock_response

        from app.services.push_notification_service import send_expo_push_notifications

        tokens = [f"ExponentPushToken[tok{i}]" for i in range(150)]
        send_expo_push_notifications(tokens=tokens, title="Bulk", message="Send")

        # 150 tokens → 2 batches (100 + 50)
        assert mock_post.call_count == 2


# ===========================================================================
# spoonacular_service.py — pure mapping functions (no HTTP)
# ===========================================================================

class TestSpoonacularMappings:
    """Unit tests for SpoonacularService pure mapping methods."""

    def _make_service(self):
        """Return a SpoonacularService instance with a dummy API key."""
        with patch.dict("os.environ", {"SPOONACULAR_API_KEY": "test_key"}):
            from app.services.spoonacular_service import SpoonacularService
            return SpoonacularService(db=None)

    # ------------------------------------------------------------------
    # map_complex_search_recipe_to_local()
    # ------------------------------------------------------------------

    def test_map_complex_search_basic_fields(self):
        """Essential fields should be extracted from the Spoonacular raw payload."""
        svc = self._make_service()
        raw = {
            "id": 12345,
            "title": "Spicy Tofu Stir Fry",
            "dishTypes": ["lunch", "main course"],
            "cuisines": ["Asian"],
            "diets": ["vegetarian", "vegan"],
            "nutrition": {
                "nutrients": [
                    {"name": "Calories", "amount": 420.0},
                    {"name": "Protein", "amount": 18.0},
                    {"name": "Carbohydrates", "amount": 55.0},
                    {"name": "Fat", "amount": 12.0},
                ]
            },
            "servings": 2,
            "readyInMinutes": 30,
        }
        result = svc.map_complex_search_recipe_to_local(raw)

        assert result["title"] == "Spicy Tofu Stir Fry"
        assert result["spoonacular_id"] == 12345
        assert result["cuisine_type"] == "Asian"
        assert result["total_calories"] == pytest.approx(420.0)
        assert result["total_protein_g"] == pytest.approx(18.0)
        assert result["is_vegetarian"] is True
        assert result["is_vegan"] is True
        assert result["is_gluten_free"] is False
        assert result["servings"] == 2
        assert result["cook_time_min"] == 30

    def test_map_complex_search_missing_optional_fields(self):
        """Missing optional fields should produce safe defaults."""
        svc = self._make_service()
        raw = {
            "id": 99,
            "title": "Minimal Recipe",
        }
        result = svc.map_complex_search_recipe_to_local(raw)

        assert result["title"] == "Minimal Recipe"
        assert result["cuisine_type"] is None
        assert result["total_calories"] == 0.0
        assert result["is_vegetarian"] is False
        assert result["is_halal"] is False  # stub returns False

    def test_map_complex_search_infers_meal_type_from_dish_types(self):
        """meal_type should be inferred from Spoonacular dishTypes list."""
        svc = self._make_service()

        breakfast_raw = {"id": 1, "title": "Pancakes", "dishTypes": ["breakfast"]}
        assert svc.map_complex_search_recipe_to_local(breakfast_raw)["meal_type"] == "breakfast"

        dinner_raw = {"id": 2, "title": "Steak", "dishTypes": ["dinner", "main course"]}
        assert svc.map_complex_search_recipe_to_local(dinner_raw)["meal_type"] == "dinner"

        # Unknown dish type defaults to dinner
        unknown_raw = {"id": 3, "title": "Unknown", "dishTypes": ["appetizer"]}
        assert svc.map_complex_search_recipe_to_local(unknown_raw)["meal_type"] == "dinner"

    def test_map_complex_search_no_cuisines_returns_none(self):
        """Empty cuisines list should produce cuisine_type=None."""
        svc = self._make_service()
        raw = {"id": 5, "title": "Plain", "cuisines": []}
        result = svc.map_complex_search_recipe_to_local(raw)
        assert result["cuisine_type"] is None

    # ------------------------------------------------------------------
    # map_ingredient_to_food_item_payload()
    # ------------------------------------------------------------------

    def test_map_ingredient_extracts_all_nutrients(self):
        """All seven nutrient fields should be extracted correctly."""
        svc = self._make_service()
        ingredient = {
            "name": "brown rice",
            "amount": 100,
            "unit": "g",
            "nutrition": {
                "nutrients": [
                    {"name": "Calories", "amount": 216.0},
                    {"name": "Protein", "amount": 4.5},
                    {"name": "Carbohydrates", "amount": 45.0},
                    {"name": "Fat", "amount": 1.8},
                    {"name": "Sugar", "amount": 0.7},
                    {"name": "Fiber", "amount": 3.5},
                    {"name": "Sodium", "amount": 10.0},
                ]
            }
        }
        result = svc.map_ingredient_to_food_item_payload(ingredient)

        assert result["name"] == "brown rice"
        assert result["calories"] == pytest.approx(216.0)
        assert result["protein_g"] == pytest.approx(4.5)
        assert result["carb_g"] == pytest.approx(45.0)
        assert result["fat_g"] == pytest.approx(1.8)
        assert result["sugar_g"] == pytest.approx(0.7)
        assert result["fiber_g"] == pytest.approx(3.5)
        assert result["sodium_mg"] == pytest.approx(10.0)
        assert result["barcode"] is None
        assert result["brand"] is None

    def test_map_ingredient_missing_nutrition_returns_zeros(self):
        """Ingredient with no nutrition dict should default all nutrients to 0.0."""
        svc = self._make_service()
        result = svc.map_ingredient_to_food_item_payload({"name": "mystery ingredient"})

        assert result["calories"] == 0.0
        assert result["protein_g"] == 0.0
        assert result["name"] == "mystery ingredient"

    def test_map_ingredient_missing_name_returns_unknown(self):
        """Missing 'name' key should fall back to 'Unknown ingredient'."""
        svc = self._make_service()
        result = svc.map_ingredient_to_food_item_payload({})
        assert result["name"] == "Unknown ingredient"

    # ------------------------------------------------------------------
    # map_product_to_food_item_payload()
    # ------------------------------------------------------------------

    def test_map_product_extracts_title_and_nutrients(self):
        """Product title, UPC barcode, and nutrients should be mapped correctly."""
        svc = self._make_service()
        product = {
            "title": "Greek Yogurt",
            "brand": "Chobani",
            "upc": "818290001234",
            "servings": {"size": 150, "unit": "g"},
            "nutrition": {
                "nutrients": [
                    {"name": "Calories", "amount": 130},
                    {"name": "Protein", "amount": 12},
                    {"name": "Carbohydrates", "amount": 8},
                    {"name": "Fat", "amount": 4},
                    {"name": "Sugar", "amount": 7},
                    {"name": "Fiber", "amount": 0},
                    {"name": "Sodium", "amount": 65},
                ]
            }
        }
        result = svc.map_product_to_food_item_payload(product)

        assert result["name"] == "Greek Yogurt"
        assert result["brand"] == "Chobani"
        assert result["barcode"] == "818290001234"
        assert result["serving_size"] == 150.0
        assert result["serving_unit"] == "g"
        assert result["calories"] == pytest.approx(130.0)
        assert result["protein_g"] == pytest.approx(12.0)

    def test_map_product_missing_servings_uses_defaults(self):
        """Product without servings info should default to (1, 'serving')."""
        svc = self._make_service()
        result = svc.map_product_to_food_item_payload({"title": "Plain Product"})
        assert result["serving_size"] == 1
        assert result["serving_unit"] == "serving"

    def test_map_product_missing_title_returns_unknown(self):
        """Missing 'title' should fall back to 'Unknown product'."""
        svc = self._make_service()
        result = svc.map_product_to_food_item_payload({})
        assert result["name"] == "Unknown product"


# ===========================================================================
# spoonacular_service.py — HTTP-dependent methods (mocked)
# ===========================================================================

class TestSpoonacularServiceHTTP:
    """Unit tests for SpoonacularService HTTP methods with mocked requests."""

    def _make_service(self):
        with patch.dict("os.environ", {"SPOONACULAR_API_KEY": "test_key"}):
            from app.services.spoonacular_service import SpoonacularService
            return SpoonacularService(db=None)

    def test_missing_api_key_raises_http_exception(self):
        """SpoonacularService without API key should raise HTTPException on init."""
        from fastapi import HTTPException
        with patch.dict("os.environ", {}, clear=True):
            # Remove SPOONACULAR_API_KEY from env
            import os
            env_backup = os.environ.pop("SPOONACULAR_API_KEY", None)
            try:
                with pytest.raises(HTTPException):
                    from app.services.spoonacular_service import SpoonacularService
                    SpoonacularService(db=None)
            finally:
                if env_backup:
                    os.environ["SPOONACULAR_API_KEY"] = env_backup

    def test_search_ingredients_empty_query_raises_400(self):
        """Empty query should raise HTTPException 400."""
        from fastapi import HTTPException
        svc = self._make_service()
        with pytest.raises(HTTPException) as exc_info:
            svc.search_ingredients("")
        assert exc_info.value.status_code == 400

    def test_search_ingredients_whitespace_only_raises_400(self):
        """Whitespace-only query should raise HTTPException 400."""
        from fastapi import HTTPException
        svc = self._make_service()
        with pytest.raises(HTTPException) as exc_info:
            svc.search_ingredients("   ")
        assert exc_info.value.status_code == 400

    @patch("app.services.spoonacular_service.requests.get")
    def test_search_ingredients_success(self, mock_get):
        """Successful search should return the parsed JSON body."""
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "results": [{"id": 1, "name": "apple"}],
            "totalResults": 1
        }
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        svc = self._make_service()
        result = svc.search_ingredients("apple")
        assert "results" in result

    def test_search_products_empty_query_raises_400(self):
        """Empty product search query should raise HTTPException 400."""
        from fastapi import HTTPException
        svc = self._make_service()
        with pytest.raises(HTTPException) as exc_info:
            svc.search_products("")
        assert exc_info.value.status_code == 400

    def test_search_products_by_barcode_empty_raises_400(self):
        """Empty barcode should raise HTTPException 400."""
        from fastapi import HTTPException
        svc = self._make_service()
        with pytest.raises(HTTPException) as exc_info:
            svc.search_products_by_barcode("")
        assert exc_info.value.status_code == 400

    @patch("app.services.spoonacular_service.requests.get")
    def test_get_raises_502_on_http_error(self, mock_get):
        """HTTP errors from Spoonacular should raise HTTPException 502."""
        import requests
        from fastapi import HTTPException

        mock_response = MagicMock()
        mock_response.status_code = 402
        mock_response.json.return_value = {"message": "Payment required"}
        mock_response.raise_for_status.side_effect = requests.HTTPError("402")
        mock_get.return_value = mock_response

        svc = self._make_service()
        with pytest.raises(HTTPException) as exc_info:
            svc.search_ingredients("chicken")
        assert exc_info.value.status_code == 502

    @patch("app.services.spoonacular_service.requests.get")
    def test_get_raises_502_on_connection_error(self, mock_get):
        """Network-level errors should raise HTTPException 502."""
        import requests
        from fastapi import HTTPException

        mock_get.side_effect = requests.ConnectionError("unreachable")

        svc = self._make_service()
        with pytest.raises(HTTPException) as exc_info:
            svc.search_recipes_complex("lunch")
        assert exc_info.value.status_code == 502
