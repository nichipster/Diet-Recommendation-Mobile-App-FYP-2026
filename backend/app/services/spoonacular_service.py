import os
from typing import Any, Optional

import requests
import time
from fastapi import HTTPException, status
from sqlmodel import Session
from ..models import spoonacular_api_log


class SpoonacularService:
    def __init__(self, db: Session | None = None) -> None:
        self.api_key = os.getenv("SPOONACULAR_API_KEY")
        self.base_url = "https://api.spoonacular.com"
        self.db = db

        if not self.api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SPOONACULAR_API_KEY is not configured"
            )
        
    def _log_call(
        self,
        endpoint: str,
        params: dict[str, Any],
        status_code: int,
        response_time_ms: int,
        success: bool,
        error_message: str | None = None,
    ) -> None:
        if self.db is None:
            return

        food_name = (
            params.get("query")
            or params.get("barcode")
            or params.get("type")
            or None
        )

        try:
            self.db.add(spoonacular_api_log(
                endpoint=endpoint,
                food_name=food_name,
                status_code=status_code,
                response_time_ms=response_time_ms,
                success=success,
                error_message=error_message,
            ))
            self.db.commit()
        except Exception:
            self.db.rollback()


    def _get(self, endpoint: str, params: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        request_params = params.copy() if params else {}
        request_params["apiKey"] = self.api_key
        started = time.perf_counter()

        try:
            response = requests.get(
                f"{self.base_url}{endpoint}",
                params=request_params,
                timeout=15
            )
            elapsed = int((time.perf_counter() - started) * 1000)
            response.raise_for_status()
            self._log_call(endpoint, request_params, response.status_code, elapsed, True)
            return response.json()
        except requests.HTTPError as e:
            elapsed = int((time.perf_counter() - started) * 1000)
            detail = "Spoonacular API request failed"
            try:
                error_json = response.json()
                if isinstance(error_json, dict) and "message" in error_json:
                    detail = error_json["message"]
            except Exception:
                pass

            self._log_call(endpoint, request_params, getattr(response, "status_code", 0), elapsed, False, detail)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=detail
            ) from e
        except requests.RequestException as e:
            elapsed = int((time.perf_counter() - started) * 1000)
            detail = "Unable to connect to Spoonacular API"
            self._log_call(endpoint, request_params, 0, elapsed, False, detail)
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
    
    def search_recipes_complex(
        self,
        meal_type: str,              # "breakfast" | "lunch" | "dinner"
        diet: Optional[str] = None,  # "vegetarian" | "vegan" | "gluten free"
        min_calories: Optional[int] = None,
        max_calories: Optional[int] = None,
        number: int = 50,
        offset: int = 0,
    ) -> dict[str, Any]:
        """
        Calls /recipes/complexSearch to fetch a batch of recipes for background ingestion.

        Args:
            meal_type (str): Spoonacular meal type filter.
            diet (str): Optional diet label (vegetarian, vegan, etc.).
            min_calories (int): Optional lower calorie bound.
            max_calories (int): Optional upper calorie bound.
            number (int): Number of results per call (max 100 per Spoonacular plan).
            offset (int): Pagination offset for multi-batch ingestion.

        Returns:
            dict: Spoonacular response with 'results' list and 'totalResults'.
        """
        params: dict[str, Any] = {
            "type": meal_type,
            "number": number,
            "offset": offset,
            "addRecipeNutrition": True,   # Includes macros in search response
            "addRecipeInformation": True,  # Includes cuisines, diets flags
        }
        if diet:
            params["diet"] = diet
        if min_calories is not None:
            params["minCalories"] = min_calories
        if max_calories is not None:
            params["maxCalories"] = max_calories

        return self._get("/recipes/complexSearch", params)


    def get_recipe_information(self, spoonacular_id: int) -> dict[str, Any]:
        """
        Fetches the full recipe detail for a single recipe by its Spoonacular ID.
        Used on user tap only. This response is NOT stored permanently.

        Args:
            spoonacular_id (int): The Spoonacular recipe ID stored in the recipe table.

        Returns:
            dict: Full Spoonacular recipe payload including instructions,
                ingredients, image, and source attribution.
        """
        return self._get(
            f"/recipes/{spoonacular_id}/information",
            {"includeNutrition": False}  # Nutrition already stored locally
        )


    def map_complex_search_recipe_to_local(
        self,
        raw: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Maps a single recipe from /complexSearch response to a local recipe row payload.

        Only fields needed for recommendation and filtering are extracted.
        Full details (instructions, ingredient list) are intentionally excluded —
        they will be fetched live from /recipes/{id}/information on user tap.

        Args:
            raw (dict): A single recipe object from the Spoonacular complexSearch results list.

        Returns:
            dict: A flat dict ready to be used as keyword args for constructing a recipe row.
        """
        # Extract macros from the nested nutrition object
        nutrition = raw.get("nutrition", {}) or {}
        nutrients = nutrition.get("nutrients", []) or []

        def get_nutrient(name: str) -> float:
            for n in nutrients:
                if n.get("name", "").lower() == name.lower():
                    try:
                        return float(n.get("amount", 0) or 0)
                    except (TypeError, ValueError):
                        return 0.0
            return 0.0

        # cuisines is a list; take the first one or None
        cuisines = raw.get("cuisines") or []
        cuisine_type = cuisines[0] if cuisines else None

        # Spoonacular's diet flags map directly to our boolean columns
        diets: list[str] = [d.lower() for d in (raw.get("diets") or [])]

        # Determine meal_type: Spoonacular can return a list, map to our enum
        dish_types: list[str] = [d.lower() for d in (raw.get("dishTypes") or [])]
        meal_type = _infer_meal_type(dish_types)

        return {
            "title": raw.get("title") or "Untitled Recipe",
            "spoonacular_id": raw.get("id"),
            "meal_type": meal_type,
            "cuisine_type": cuisine_type,
            "total_calories": get_nutrient("calories"),
            "total_protein_g": get_nutrient("protein"),
            "total_carb_g": get_nutrient("carbohydrates"),
            "total_fat_g": get_nutrient("fat"),
            "servings": raw.get("servings") or 1,
            "cook_time_min": raw.get("readyInMinutes") or 0,
            "is_vegetarian": "vegetarian" in diets or "lacto vegetarian" in diets,
            "is_vegan": "vegan" in diets,
            "is_gluten_free": "gluten free" in diets,
            "is_halal": _infer_halal(raw),  # Conservative heuristic
            "is_custom": False,
            "is_public": False,
            "description": None,
            "instructions": None,
        }


def _infer_meal_type(dish_types: list[str]) -> str:
    """
    Maps Spoonacular dishTypes to NutriTrack's MealType enum.
    Spoonacular uses values like 'breakfast', 'lunch', 'main course', 'dinner'.
    """
    if any(t in dish_types for t in ["breakfast", "brunch", "morning meal"]):
        return "breakfast"
    if any(t in dish_types for t in ["lunch", "soup", "salad", "sandwich", "snack"]):
        return "lunch"
    if any(t in dish_types for t in ["dinner", "main course", "main dish", "supper"]):
        return "dinner"
    return "dinner"


def _infer_halal(raw: dict[str, Any]) -> bool:
    """
    Conservative halal inference: only mark halal if the recipe is
    explicitly marked dairy-free AND does not contain obvious non-halal
    ingredient keywords.

    This is a placeholder heuristic. A production app would need
    a curated halal recipe source or manual verification.
    """
    # Spoonacular has no halal flag; default to False for safety
    return False