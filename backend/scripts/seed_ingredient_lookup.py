"""
Seeds the dish_ingredient_lookup table with typical ingredient lists.

Usage (run from backend/ with the app environment active):
    python -m scripts.seed_ingredient_lookup

The ingredient weights here are Nutrition5k-derived defaults.
Update this dict as more dishes are validated against USDA FoodData Central.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select
from app.database import engine
from app.models import dish_ingredient_lookup

SEED_DATA: dict[str, dict] = {
    "fried_rice": {
        "display_name": "Fried Rice",
        "ingredients": [
            {"name": "cooked white rice", "default_g": 180.0},
            {"name": "egg", "default_g": 50.0},
            {"name": "soy sauce", "default_g": 10.0},
            {"name": "vegetable oil", "default_g": 10.0},
            {"name": "spring onion", "default_g": 15.0},
        ],
    },
    "pad_thai": {
        "display_name": "Pad Thai",
        "ingredients": [
            {"name": "rice noodles", "default_g": 100.0},
            {"name": "shrimp", "default_g": 80.0},
            {"name": "egg", "default_g": 50.0},
            {"name": "bean sprouts", "default_g": 40.0},
            {"name": "peanuts", "default_g": 15.0},
            {"name": "fish sauce", "default_g": 10.0},
            {"name": "lime juice", "default_g": 10.0},
        ],
    },
    "ramen": {
        "display_name": "Ramen",
        "ingredients": [
            {"name": "ramen noodles", "default_g": 100.0},
            {"name": "pork belly", "default_g": 80.0},
            {"name": "egg", "default_g": 55.0},
            {"name": "soy sauce", "default_g": 15.0},
            {"name": "chicken broth", "default_g": 300.0},
            {"name": "nori seaweed", "default_g": 5.0},
        ],
    },
    "pho": {
        "display_name": "Pho",
        "ingredients": [
            {"name": "rice noodles", "default_g": 120.0},
            {"name": "beef", "default_g": 100.0},
            {"name": "beef broth", "default_g": 350.0},
            {"name": "bean sprouts", "default_g": 30.0},
            {"name": "fresh basil", "default_g": 5.0},
            {"name": "lime juice", "default_g": 10.0},
        ],
    },
    "chicken_curry": {
        "display_name": "Chicken Curry",
        "ingredients": [
            {"name": "chicken thigh", "default_g": 150.0},
            {"name": "coconut milk", "default_g": 80.0},
            {"name": "curry paste", "default_g": 20.0},
            {"name": "cooked white rice", "default_g": 150.0},
            {"name": "onion", "default_g": 40.0},
        ],
    },
    "bibimbap": {
        "display_name": "Bibimbap",
        "ingredients": [
            {"name": "cooked white rice", "default_g": 200.0},
            {"name": "beef", "default_g": 80.0},
            {"name": "spinach", "default_g": 40.0},
            {"name": "carrot", "default_g": 30.0},
            {"name": "egg", "default_g": 55.0},
            {"name": "gochujang", "default_g": 15.0},
            {"name": "sesame oil", "default_g": 5.0},
        ],
    },
    "sushi": {
        "display_name": "Sushi",
        "ingredients": [
            {"name": "sushi rice", "default_g": 120.0},
            {"name": "raw salmon", "default_g": 60.0},
            {"name": "nori seaweed", "default_g": 8.0},
            {"name": "soy sauce", "default_g": 10.0},
        ],
    },
    "spring_rolls": {
        "display_name": "Spring Rolls",
        "ingredients": [
            {"name": "rice paper wrapper", "default_g": 30.0},
            {"name": "pork", "default_g": 60.0},
            {"name": "rice vermicelli", "default_g": 40.0},
            {"name": "cabbage", "default_g": 30.0},
            {"name": "carrot", "default_g": 20.0},
        ],
    },
    "dumplings": {
        "display_name": "Dumplings",
        "ingredients": [
            {"name": "dumpling wrapper", "default_g": 60.0},
            {"name": "pork mince", "default_g": 70.0},
            {"name": "cabbage", "default_g": 30.0},
            {"name": "ginger", "default_g": 5.0},
            {"name": "soy sauce", "default_g": 10.0},
        ],
    },
    "gyoza": {
        "display_name": "Gyoza",
        "ingredients": [
            {"name": "gyoza wrapper", "default_g": 50.0},
            {"name": "pork mince", "default_g": 70.0},
            {"name": "cabbage", "default_g": 30.0},
            {"name": "garlic", "default_g": 5.0},
            {"name": "sesame oil", "default_g": 5.0},
        ],
    },
    "hamburger": {
        "display_name": "Hamburger",
        "ingredients": [
            {"name": "beef patty", "default_g": 120.0},
            {"name": "hamburger bun", "default_g": 60.0},
            {"name": "lettuce", "default_g": 15.0},
            {"name": "tomato", "default_g": 30.0},
            {"name": "cheddar cheese", "default_g": 20.0},
        ],
    },
    "pizza": {
        "display_name": "Pizza",
        "ingredients": [
            {"name": "pizza dough", "default_g": 80.0},
            {"name": "tomato sauce", "default_g": 30.0},
            {"name": "mozzarella cheese", "default_g": 50.0},
            {"name": "pepperoni", "default_g": 20.0},
        ],
    },
    "spaghetti_bolognese": {
        "display_name": "Spaghetti Bolognese",
        "ingredients": [
            {"name": "spaghetti pasta", "default_g": 100.0},
            {"name": "beef mince", "default_g": 120.0},
            {"name": "tomato sauce", "default_g": 80.0},
            {"name": "onion", "default_g": 30.0},
            {"name": "parmesan cheese", "default_g": 15.0},
        ],
    },
    "french_fries": {
        "display_name": "French Fries",
        "ingredients": [
            {"name": "potato", "default_g": 130.0},
            {"name": "vegetable oil", "default_g": 15.0},
            {"name": "salt", "default_g": 2.0},
        ],
    },
    "omelette": {
        "display_name": "Omelette",
        "ingredients": [
            {"name": "egg", "default_g": 110.0},
            {"name": "butter", "default_g": 10.0},
            {"name": "salt", "default_g": 1.0},
        ],
    },
    "grilled_salmon": {
        "display_name": "Grilled Salmon",
        "ingredients": [
            {"name": "salmon fillet", "default_g": 180.0},
            {"name": "olive oil", "default_g": 10.0},
            {"name": "lemon juice", "default_g": 10.0},
        ],
    },
    "steak": {
        "display_name": "Steak",
        "ingredients": [
            {"name": "beef steak", "default_g": 220.0},
            {"name": "butter", "default_g": 10.0},
            {"name": "garlic", "default_g": 5.0},
        ],
    },
    "caesar_salad": {
        "display_name": "Caesar Salad",
        "ingredients": [
            {"name": "romaine lettuce", "default_g": 80.0},
            {"name": "croutons", "default_g": 20.0},
            {"name": "parmesan cheese", "default_g": 15.0},
            {"name": "caesar dressing", "default_g": 30.0},
        ],
    },
    "peking_duck": {
        "display_name": "Peking Duck",
        "ingredients": [
            {"name": "duck meat", "default_g": 120.0},
            {"name": "pancake wrapper", "default_g": 40.0},
            {"name": "hoisin sauce", "default_g": 15.0},
            {"name": "spring onion", "default_g": 10.0},
            {"name": "cucumber", "default_g": 20.0},
        ],
    },
    "samosa": {
        "display_name": "Samosa",
        "ingredients": [
            {"name": "pastry dough", "default_g": 40.0},
            {"name": "potato", "default_g": 50.0},
            {"name": "peas", "default_g": 20.0},
            {"name": "cumin", "default_g": 2.0},
            {"name": "vegetable oil", "default_g": 10.0},
        ],
    },
}


def seed() -> None:
    """
    Inserts seed data into the dish_ingredient_lookup table.
    Skips rows that already exist (identified by dish_class).
    """
    with Session(engine) as db:
        inserted = 0
        skipped = 0

        for dish_class, data in SEED_DATA.items():
            existing = db.exec(
                select(dish_ingredient_lookup).where(
                    dish_ingredient_lookup.dish_class == dish_class
                )
            ).first()

            if existing:
                skipped += 1
                continue

            row = dish_ingredient_lookup(
                dish_class=dish_class,
                display_name=data["display_name"],
                ingredients=json.dumps(data["ingredients"]),
            )
            db.add(row)
            inserted += 1

        db.commit()
        print(f"Seed complete: {inserted} inserted, {skipped} skipped.")


if __name__ == "__main__":
    seed()