import json
from typing import Optional

from sqlmodel import Session, select

from ..ml.image_recognition.preprocessor import preprocess
from ..ml.image_recognition.classifier import classify
from ..ml.image_recognition.portion_defaults import get_portion_g
from .usda_service import get_nutrition_scaled
from ..models import dish_ingredient_lookup

_CONFIDENCE_THRESHOLD = 0.55


def analyze_image(image_bytes: bytes, db: Session) -> dict:
    """
    Executes the full image recognition pipeline: preprocessing →
    classification → ingredient resolution → nutrition calculation.

    Args:
        image_bytes (bytes): Raw bytes of the uploaded image.
        db (Session): Active SQLModel database session.

    Returns:
        dict: Recognition result containing detected_dish, confidence,
              needs_confirmation, top_alternatives, ingredients,
              nutrition_total, and quality_warning.
    """
    tensor, quality_warning = preprocess(image_bytes)
    predictions = classify(tensor)

    top = predictions[0]
    dish_class: str = top["name"]
    confidence: float = top["confidence"]

    alternatives = [
        {"name": _display(p["name"]), "confidence": p["confidence"]}
        for p in predictions[1:]
    ]

    if confidence < _CONFIDENCE_THRESHOLD:
        return {
            "detected_dish": _display(dish_class),
            "confidence": confidence,
            "needs_confirmation": True,
            "top_alternatives": alternatives,
            "ingredients": [],
            "nutrition_total": None,
            "quality_warning": quality_warning,
        }

    ingredients = _resolve_ingredients(dish_class, db)
    enriched   = _enrich_with_nutrition(ingredients)
    total      = _aggregate(enriched)

    return {
        "detected_dish": _display(dish_class),
        "confidence": confidence,
        "needs_confirmation": False,
        "top_alternatives": alternatives,
        "ingredients": enriched,
        "nutrition_total": total,
        "quality_warning": quality_warning,
    }


def _resolve_ingredients(dish_class: str, db: Session) -> list[dict]:
    """
    Looks up the typical ingredient list for a dish class in the
    dish_ingredient_lookup table.

    Falls back to a single placeholder ingredient using the Nutrition5k
    default portion weight if no lookup entry exists for the class.

    Args:
        dish_class (str): Food-101 class name in snake_case.
        db (Session): Active database session.

    Returns:
        list[dict]: Each dict has 'name' (str) and 'amount_g' (float).
    """
    row = db.exec(
        select(dish_ingredient_lookup).where(
            dish_ingredient_lookup.dish_class == dish_class
        )
    ).first()

    if row is None:
        return [{"name": _display(dish_class), "amount_g": get_portion_g(dish_class)}]

    items = json.loads(row.ingredients)
    return [{"name": item["name"], "amount_g": float(item["default_g"])} for item in items]


def _enrich_with_nutrition(ingredients: list[dict]) -> list[dict]:
    """
    Attaches per-ingredient nutritional data from USDA FoodData Central.
    Ingredients that cannot be resolved receive zero values rather than
    being dropped, keeping the ingredient list intact for user editing.

    Args:
        ingredients (list[dict]): Dicts with 'name' and 'amount_g'.

    Returns:
        list[dict]: Same list with nutrition keys merged in.
    """
    result = []
    for item in ingredients:
        nutrition = get_nutrition_scaled(item["name"], item["amount_g"])
        result.append({**item, **nutrition})
    return result


def _aggregate(ingredients: list[dict]) -> dict:
    """
    Sums calories and macros across all ingredients.

    Args:
        ingredients (list[dict]): Enriched ingredient dicts.

    Returns:
        dict: Total calories, protein_g, carb_g, fat_g.
    """
    keys = ("calories", "protein_g", "carb_g", "fat_g")
    totals = {k: round(sum(item.get(k, 0.0) for item in ingredients), 2) for k in keys}
    return totals


def _display(dish_class: str) -> str:
    """
    Converts snake_case dish class names to Title Case display strings.

    Args:
        dish_class (str): e.g. "fried_rice"

    Returns:
        str: e.g. "Fried Rice"
    """
    return dish_class.replace("_", " ").title()