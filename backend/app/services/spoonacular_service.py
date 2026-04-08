import os
from typing import Any, Optional

import requests
from fastapi import HTTPException, status


class SpoonacularService:
    def __init__(self) -> None:
        self.api_key = os.getenv("SPOONACULAR_API_KEY")
        self.base_url = "https://api.spoonacular.com"

        if not self.api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SPOONACULAR_API_KEY is not configured"
            )

    def _get(self, endpoint: str, params: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        request_params = params.copy() if params else {}
        request_params["apiKey"] = self.api_key

        try:
            response = requests.get(
                f"{self.base_url}{endpoint}",
                params=request_params,
                timeout=15
            )
            response.raise_for_status()
            return response.json()
        except requests.HTTPError as e:
            detail = "Spoonacular API request failed"
            try:
                error_json = response.json()
                if isinstance(error_json, dict) and "message" in error_json:
                    detail = error_json["message"]
            except Exception:
                pass

            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=detail
            ) from e
        except requests.RequestException as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to connect to Spoonacular API"
            ) from e

    def search_ingredients(self, query: str, number: int = 10) -> dict[str, Any]:
        if not query.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Search query cannot be empty"
            )

        return self._get(
            "/food/ingredients/search",
            {
                "query": query,
                "number": number
            }
        )

    def get_ingredient_by_id(
        self,
        ingredient_id: int,
        amount: float = 1,
        unit: str = "serving"
    ) -> dict[str, Any]:
        return self._get(
            f"/food/ingredients/{ingredient_id}/information",
            {
                "amount": amount,
                "unit": unit
            }
        )

    def search_products(self, query: str, number: int = 10) -> dict[str, Any]:
        if not query.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Search query cannot be empty"
            )

        return self._get(
            "/food/products/search",
            {
                "query": query,
                "number": number
            }
        )

    def get_product_by_id(self, product_id: int) -> dict[str, Any]:
        return self._get(f"/food/products/{product_id}")

    def search_products_by_barcode(self, barcode: str) -> dict[str, Any]:
        cleaned_barcode = barcode.strip()

        if not cleaned_barcode:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Barcode cannot be empty"
            )

        return self._get(
            "/food/products/upc/{barcode}".format(barcode=cleaned_barcode)
        )
    
    def map_ingredient_to_food_item_payload(self, ingredient: dict[str, Any]) -> dict[str, Any]:
        nutrition = ingredient.get("nutrition", {}) or {}
        nutrients = nutrition.get("nutrients", []) or []

        def get_nutrient_amount(name: str) -> float:
            for nutrient in nutrients:
                if nutrient.get("name", "").lower() == name.lower():
                    try:
                        return float(nutrient.get("amount", 0) or 0)
                    except (TypeError, ValueError):
                        return 0.0
            return 0.0

        amount = ingredient.get("amount") or 1
        unit = ingredient.get("unit") or "serving"

        try:
            amount = float(amount)
        except (TypeError, ValueError):
            amount = 1.0

        return {
            "name": ingredient.get("name") or "Unknown ingredient",
            "brand": None,
            "barcode": None,
            "serving_size": amount,
            "serving_unit": unit,
            "calories": get_nutrient_amount("Calories"),
            "protein_g": get_nutrient_amount("Protein"),
            "carb_g": get_nutrient_amount("Carbohydrates"),
            "fat_g": get_nutrient_amount("Fat"),
            "sugar_g": get_nutrient_amount("Sugar"),
            "fiber_g": get_nutrient_amount("Fiber"),
            "sodium_mg": get_nutrient_amount("Sodium")
        }

    def map_product_to_food_item_payload(self, product: dict[str, Any]) -> dict[str, Any]:
        nutrition = product.get("nutrition", {}) or {}
        nutrients = nutrition.get("nutrients", []) or []

        def get_nutrient_amount(name: str) -> float:
            for nutrient in nutrients:
                if nutrient.get("name", "").lower() == name.lower():
                    try:
                        return float(nutrient.get("amount", 0) or 0)
                    except (TypeError, ValueError):
                        return 0.0
            return 0.0

        servings = product.get("servings", {}) or {}

        serving_size = servings.get("size")
        serving_unit = servings.get("unit")

        if serving_size is None or serving_unit is None:
            serving_size = 1
            serving_unit = "serving"

        try:
            serving_size = float(serving_size)
        except (TypeError, ValueError):
            serving_size = 1.0

        return {
            "name": product.get("title") or "Unknown product",
            "brand": product.get("brand"),
            "barcode": product.get("upc"),
            "serving_size": serving_size,
            "serving_unit": serving_unit,
            "calories": get_nutrient_amount("Calories"),
            "protein_g": get_nutrient_amount("Protein"),
            "carb_g": get_nutrient_amount("Carbohydrates"),
            "fat_g": get_nutrient_amount("Fat"),
            "sugar_g": get_nutrient_amount("Sugar"),
            "fiber_g": get_nutrient_amount("Fiber"),
            "sodium_mg": get_nutrient_amount("Sodium")
        }