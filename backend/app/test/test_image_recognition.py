"""
Unit tests for the image recognition pipeline.

Covers: preprocessing, classifier interface, service orchestration,
barcode service, and the /log endpoint.
"""

import json
from unittest.mock import MagicMock, patch
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestPreprocessor:
    def test_valid_jpeg_produces_correct_shape(self):
        """Preprocessing a valid JPEG should return (1, 3, 224, 224) float32."""
        from PIL import Image
        import io
        from app.ml.image_recognition.preprocessor import preprocess

        # Reason: use a noisy image so Laplacian variance > _BLUR_THRESHOLD (80.0).
        # A uniform solid-color image has zero variance and triggers the blur warning.
        rng = np.random.default_rng(seed=42)
        noisy = (rng.integers(0, 256, (300, 400, 3), dtype=np.uint8))
        img = Image.fromarray(noisy, mode="RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")

        tensor, warning = preprocess(buf.getvalue())

        assert tensor.shape == (1, 3, 224, 224)
        assert tensor.dtype == np.float32
        assert warning is None

    def test_invalid_bytes_raises_value_error(self):
        """Corrupt bytes should raise ValueError."""
        from app.ml.image_recognition.preprocessor import preprocess

        with pytest.raises(ValueError, match="Could not decode image"):
            preprocess(b"not_an_image")

    def test_normalization_range(self):
        """Normalized values should not be in [0, 1] range (ImageNet shift applied)."""
        from PIL import Image
        import io
        from app.ml.image_recognition.preprocessor import preprocess

        img = Image.new("RGB", (300, 300), color=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format="PNG")

        tensor, _ = preprocess(buf.getvalue())
        assert tensor.max() > 2.0 or tensor.min() < -1.0


class TestSoftmax:
    def test_output_sums_to_one(self):
        from app.ml.image_recognition.classifier import _softmax

        logits = np.array([2.0, 1.0, 0.1])
        probs = _softmax(logits)
        assert abs(probs.sum() - 1.0) < 1e-6

    def test_highest_logit_gives_highest_probability(self):
        from app.ml.image_recognition.classifier import _softmax

        logits = np.array([0.0, 5.0, 1.0])
        probs = _softmax(logits)
        assert probs.argmax() == 1


class TestPortionDefaults:
    def test_known_class_returns_correct_value(self):
        from app.ml.image_recognition.portion_defaults import get_portion_g

        assert get_portion_g("fried_rice") == 300.0

    def test_unknown_class_returns_fallback(self):
        from app.ml.image_recognition.portion_defaults import get_portion_g, _DEFAULT_G

        assert get_portion_g("nonexistent_dish_xyz") == _DEFAULT_G


class TestUSDAService:
    @patch("app.services.usda_service.requests.get")
    @patch("app.services.usda_service._get_redis", return_value=None)
    def test_valid_response_returns_nutrition(self, mock_redis, mock_get):
        """A successful USDA API response should return scaled nutritional data."""
        from app.services.usda_service import get_nutrition_scaled

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "foods": [{
                "foodNutrients": [
                    {"nutrientName": "Energy", "value": 130.0},
                    {"nutrientName": "Protein", "value": 2.7},
                    {"nutrientName": "Carbohydrate, by difference", "value": 28.2},
                    {"nutrientName": "Total lipid (fat)", "value": 0.3},
                    {"nutrientName": "Sugars, total including NLEA", "value": 0.0},
                    {"nutrientName": "Fiber, total dietary", "value": 0.4},
                    {"nutrientName": "Sodium, Na", "value": 1.0},
                ]
            }]
        }
        mock_get.return_value = mock_response

        with patch.dict("os.environ", {"USDA_API_KEY": "test_key"}):
            result = get_nutrition_scaled("cooked white rice", 200.0)

        assert result["calories"] == pytest.approx(260.0, rel=0.01)
        assert result["protein_g"] == pytest.approx(5.4, rel=0.01)

    @patch("app.services.usda_service.requests.get")
    @patch("app.services.usda_service._get_redis", return_value=None)
    def test_empty_usda_response_returns_zeros(self, mock_redis, mock_get):
        """If USDA returns no foods, the result should be all zeros."""
        from app.services.usda_service import get_nutrition_scaled

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"foods": []}
        mock_get.return_value = mock_response

        with patch.dict("os.environ", {"USDA_API_KEY": "test_key"}):
            result = get_nutrition_scaled("unknown_ingredient_xyz", 100.0)

        assert result["calories"] == 0.0

    @patch("app.services.usda_service.requests.get")
    @patch("app.services.usda_service._get_redis")
    def test_redis_cache_hit_returns_cached_value(self, mock_get_redis, mock_requests_get):
        """A Redis cache hit should return cached data without calling USDA API."""
        import json
        from app.services.usda_service import get_nutrition_scaled, _cache_key

        cached = {
            "calories": 200.0, "protein_g": 5.0, "carb_g": 40.0, "fat_g": 1.0,
            "sugar_g": 0.5, "fiber_g": 1.0, "sodium_mg": 2.0
        }
        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps(cached)
        mock_get_redis.return_value = mock_redis

        with patch.dict("os.environ", {"USDA_API_KEY": "test_key"}):
            result = get_nutrition_scaled("white rice", 100.0)

        mock_requests_get.assert_not_called()
        assert result["calories"] == pytest.approx(200.0)

    @patch("app.services.usda_service.requests.get")
    @patch("app.services.usda_service._get_redis", return_value=None)
    def test_non_200_usda_response_returns_zeros(self, mock_redis, mock_get):
        """A non-200 USDA response should yield zero nutrition values."""
        from app.services.usda_service import get_nutrition_scaled

        mock_response = MagicMock()
        mock_response.status_code = 503
        mock_response.json.return_value = {}
        mock_get.return_value = mock_response

        with patch.dict("os.environ", {"USDA_API_KEY": "test_key"}):
            result = get_nutrition_scaled("unknown food", 100.0)

        assert result["calories"] == 0.0
        assert result["protein_g"] == 0.0

    @patch("app.services.usda_service.requests.get", side_effect=Exception("network failure"))
    @patch("app.services.usda_service._get_redis", return_value=None)
    def test_request_exception_returns_zeros(self, mock_redis, mock_get):
        """A network-level exception should return zero nutrition values gracefully."""
        from app.services.usda_service import get_nutrition_scaled

        with patch.dict("os.environ", {"USDA_API_KEY": "test_key"}):
            result = get_nutrition_scaled("mystery ingredient", 50.0)

        assert result["calories"] == 0.0


# ===========================================================================
# Image Recognition Service — pure helper functions
# ===========================================================================

class TestDisplayHelper:
    """Unit tests for image_recognition_service._display()."""

    def test_snake_case_converts_to_title_case(self):
        """'fried_rice' should become 'Fried Rice'."""
        from app.services.image_recognition_service import _display
        assert _display("fried_rice") == "Fried Rice"

    def test_single_word_unchanged(self):
        """A single lowercase word should simply be title-cased."""
        from app.services.image_recognition_service import _display
        assert _display("pizza") == "Pizza"

    def test_multiple_underscores(self):
        """Three-word class name with two underscores."""
        from app.services.image_recognition_service import _display
        assert _display("beef_fried_rice") == "Beef Fried Rice"

    def test_already_title_cased_word(self):
        """Input with no underscores should still produce correct output."""
        from app.services.image_recognition_service import _display
        assert _display("salad") == "Salad"


class TestAggregateHelper:
    """Unit tests for image_recognition_service._aggregate()."""

    def test_known_inputs_sum_correctly(self):
        """Sum of known ingredient dicts should match manual total."""
        from app.services.image_recognition_service import _aggregate
        ingredients = [
            {"name": "rice", "amount_g": 200, "calories": 260, "protein_g": 4.8, "carb_g": 57.0, "fat_g": 0.4},
            {"name": "egg", "amount_g": 50, "calories": 72, "protein_g": 6.3, "carb_g": 0.4, "fat_g": 4.8},
        ]
        result = _aggregate(ingredients)
        assert result["calories"] == pytest.approx(332.0, rel=0.01)
        assert result["protein_g"] == pytest.approx(11.1, rel=0.01)
        assert result["carb_g"] == pytest.approx(57.4, rel=0.01)

    def test_empty_list_returns_all_zeros(self):
        """Empty ingredient list should return zero for all macro keys."""
        from app.services.image_recognition_service import _aggregate
        result = _aggregate([])
        for key in ("calories", "protein_g", "carb_g", "fat_g"):
            assert result[key] == 0.0

    def test_missing_keys_default_to_zero(self):
        """Ingredients missing some macro keys should not raise; absent keys treated as 0."""
        from app.services.image_recognition_service import _aggregate
        ingredients = [{"name": "mystery", "amount_g": 100, "calories": 150}]
        result = _aggregate(ingredients)
        assert result["calories"] == 150
        assert result["protein_g"] == 0.0


class TestResolveIngredients:
    """Integration-style unit tests for image_recognition_service._resolve_ingredients()."""

    def test_db_miss_returns_fallback_ingredient(self, db_session):
        """Dish class not in DB should return a single fallback ingredient."""
        from app.services.image_recognition_service import _resolve_ingredients
        result = _resolve_ingredients("nonexistent_dish_xyz", db_session)
        assert len(result) == 1
        assert result[0]["name"] == "Nonexistent Dish Xyz"
        assert result[0]["amount_g"] > 0

    def test_db_hit_returns_ingredient_list(self, db_session):
        """Dish class found in DB should return its parsed ingredient list."""
        import json
        from app.models import dish_ingredient_lookup
        from app.services.image_recognition_service import _resolve_ingredients

        row = dish_ingredient_lookup(
            dish_class="test_curry",
            display_name="Test Curry",
            ingredients=json.dumps([
                {"name": "chicken", "default_g": 150.0},
                {"name": "sauce", "default_g": 80.0},
            ]),
        )
        db_session.add(row)
        db_session.commit()

        result = _resolve_ingredients("test_curry", db_session)
        assert len(result) == 2
        assert result[0]["name"] == "chicken"
        assert result[0]["amount_g"] == 150.0


class TestEnrichWithNutrition:
    """Unit tests for image_recognition_service._enrich_with_nutrition()."""

    @patch("app.services.image_recognition_service.get_nutrition_scaled")
    def test_enriches_each_ingredient(self, mock_usda):
        """Each ingredient should have nutrition keys merged in from USDA."""
        from app.services.image_recognition_service import _enrich_with_nutrition
        mock_usda.return_value = {
            "calories": 100.0, "protein_g": 3.0, "carb_g": 20.0, "fat_g": 0.5,
            "sugar_g": 0.0, "fiber_g": 0.0, "sodium_mg": 5.0,
        }
        ingredients = [
            {"name": "rice", "amount_g": 150},
            {"name": "egg", "amount_g": 50},
        ]
        result = _enrich_with_nutrition(ingredients)
        assert len(result) == 2
        assert "calories" in result[0]
        assert result[0]["name"] == "rice"
        assert mock_usda.call_count == 2

    @patch("app.services.image_recognition_service.get_nutrition_scaled", return_value={
        "calories": 0.0, "protein_g": 0.0, "carb_g": 0.0, "fat_g": 0.0,
        "sugar_g": 0.0, "fiber_g": 0.0, "sodium_mg": 0.0,
    })
    def test_zero_fallback_when_usda_returns_zeros(self, mock_usda):
        """USDA zero-value fallback should still produce a complete enriched dict."""
        from app.services.image_recognition_service import _enrich_with_nutrition
        result = _enrich_with_nutrition([{"name": "ghost", "amount_g": 100}])
        assert result[0]["calories"] == 0.0


class TestAnalyzeImage:
    """Unit tests for image_recognition_service.analyze_image() with mocked ML."""

    @patch("app.services.image_recognition_service.classify")
    @patch("app.services.image_recognition_service.preprocess")
    def test_low_confidence_returns_needs_confirmation(self, mock_preprocess, mock_classify, db_session):
        """Predictions below threshold should set needs_confirmation=True with empty ingredients."""
        import numpy as np
        from app.services.image_recognition_service import analyze_image

        mock_preprocess.return_value = (np.zeros((1, 3, 224, 224), dtype=np.float32), None)
        mock_classify.return_value = [
            {"name": "fried_rice", "confidence": 0.30},
            {"name": "pizza", "confidence": 0.20},
            {"name": "sushi", "confidence": 0.10},
        ]

        result = analyze_image(b"fake_bytes", db_session)
        assert result["needs_confirmation"] is True
        assert result["ingredients"] == []
        assert result["nutrition_total"] is None
        assert len(result["top_alternatives"]) == 2

    @patch("app.services.image_recognition_service.get_nutrition_scaled")
    @patch("app.services.image_recognition_service.classify")
    @patch("app.services.image_recognition_service.preprocess")
    def test_high_confidence_returns_full_result(self, mock_preprocess, mock_classify, mock_usda, db_session):
        """Predictions above threshold should return full enriched result."""
        import numpy as np
        from app.services.image_recognition_service import analyze_image

        mock_preprocess.return_value = (np.zeros((1, 3, 224, 224), dtype=np.float32), None)
        mock_classify.return_value = [
            {"name": "pizza", "confidence": 0.92},
            {"name": "fried_rice", "confidence": 0.05},
            {"name": "sushi", "confidence": 0.03},
        ]
        mock_usda.return_value = {
            "calories": 200.0, "protein_g": 8.0, "carb_g": 25.0, "fat_g": 7.0,
            "sugar_g": 2.0, "fiber_g": 1.0, "sodium_mg": 300.0,
        }

        result = analyze_image(b"fake_bytes", db_session)
        assert result["needs_confirmation"] is False
        assert result["detected_dish"] == "Pizza"
        assert isinstance(result["ingredients"], list)
        assert result["nutrition_total"] is not None


class TestClassify:
    """Unit tests for ml/image_recognition/classifier.py — classify()."""

    @patch("app.ml.image_recognition.classifier.ort.InferenceSession")
    @patch("app.ml.image_recognition.classifier._MODEL_PATH")
    def test_classify_returns_top3_predictions(self, mock_path, mock_session_cls):
        """Mock ONNX session should yield exactly 3 prediction dicts."""
        import numpy as np
        from app.ml.image_recognition.classifier import classify
        import app.ml.image_recognition.classifier as clf_module

        # Reset module-level session so the mock is used
        clf_module._session = None

        mock_path.exists.return_value = True
        logits = np.zeros(101, dtype=np.float32)
        logits[0] = 10.0   # highest probability for class 0
        logits[5] = 5.0
        logits[10] = 2.0

        mock_session = MagicMock()
        mock_session.get_inputs.return_value = [MagicMock(name="input")]
        mock_session.get_inputs.return_value[0].name = "input"
        mock_session.run.return_value = [np.expand_dims(logits, axis=0)]
        mock_session_cls.return_value = mock_session

        tensor = np.zeros((1, 3, 224, 224), dtype=np.float32)
        result = classify(tensor)

        assert len(result) == 3
        assert "name" in result[0]
        assert "confidence" in result[0]
        assert result[0]["confidence"] >= result[1]["confidence"]

        # Reset session so we don't pollute other tests
        clf_module._session = None

    @patch("app.ml.image_recognition.classifier._MODEL_PATH")
    def test_classify_raises_file_not_found_if_model_missing(self, mock_path):
        """Missing ONNX model file should raise FileNotFoundError."""
        import app.ml.image_recognition.classifier as clf_module
        import numpy as np
        from app.ml.image_recognition.classifier import classify

        clf_module._session = None
        mock_path.exists.return_value = False

        with pytest.raises(FileNotFoundError):
            classify(np.zeros((1, 3, 224, 224), dtype=np.float32))

        clf_module._session = None