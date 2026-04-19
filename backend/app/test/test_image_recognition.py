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

        img = Image.new("RGB", (400, 300), color=(128, 64, 32))
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