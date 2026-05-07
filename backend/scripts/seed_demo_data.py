from datetime import date, timedelta
from passlib.context import CryptContext
from sqlmodel import Session, select

from app.database import engine
from app.models import (
    user, user_profile, user_preferences, dietary_goal,
    weight_log, water_intake_log, food_item, meal, dietary_entry,
    custom_meal, recipe, user_subscription, subscription_transaction,
    support_ticket, audit_log, app_event_log, spoonacular_api_log,
    nutritionist_profile, nutritionist_availability_slot, booking,
    chat, chat_message, nutrition_content, analysis,
    push_token, notification_history, recommendation_log,
    dish_ingredient_lookup,
    UserRole, Gender, ActivityLevel, GoalType, WeeklyGoalRate,
    FoodSource, MealType, SubscriptionPlan, SubscriptionStatus,
    SubscriptionTransactionType, SubscriptionTransactionStatus,
    SupportTicketStatus, AuditLogType, AppFeature,
    NotificationSegment, BookingStatus, NutritionContentType,
    sg_now,
)

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
PASSWORD = "Password123!"


def get_or_create_user(db, first_name, last_name, email, role):
    existing = db.exec(select(user).where(user.email == email)).first()
    if existing:
        return existing

    now = sg_now()
    new_user = user(
        first_name=first_name,
        last_name=last_name,
        email=email,
        hashed_password=bcrypt_context.hash(PASSWORD),
        role=role,
        email_verified=True,
        suspended=False,
        created_at=now,
    )

    if role == UserRole.premium:
        new_user.premium_start = now
        new_user.premium_end = now + timedelta(days=365)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def create_profile_if_missing(db, db_user, gender, dob, height, weight, activity, tdee):
    existing = db.exec(select(user_profile).where(user_profile.user_id == db_user.user_id)).first()
    if existing:
        return existing

    profile = user_profile(
        user_id=db_user.user_id,
        gender=gender,
        dob=dob,
        height_cm=height,
        weight_kg=weight,
        activity_level=activity,
        tdee=tdee,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def create_preferences_if_missing(db, db_user, **kwargs):
    existing = db.exec(select(user_preferences).where(user_preferences.user_id == db_user.user_id)).first()
    if existing:
        return existing

    preferences = user_preferences(
        user_id=db_user.user_id,
        **kwargs,
    )
    db.add(preferences)
    db.commit()
    db.refresh(preferences)
    return preferences


def create_goal_if_missing(db, db_user, goal_type, target_weight, weekly_rate, calories, protein, carb, fat):
    existing = db.exec(
        select(dietary_goal).where(
            dietary_goal.user_id == db_user.user_id,
            dietary_goal.is_active == True,
        )
    ).first()
    if existing:
        return existing

    goal = dietary_goal(
        user_id=db_user.user_id,
        goal_type=goal_type,
        target_weight_kg=target_weight,
        weekly_goal_rate=weekly_rate,
        daily_calorie_target=calories,
        daily_protein_g=protein,
        daily_carb_g=carb,
        daily_fat_g=fat,
        is_active=True,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def create_food_if_missing(db, name, source, serving_size, serving_unit, calories, protein, carb, fat, sugar=0, fiber=0, sodium=0, brand=None, barcode=None):
    existing = db.exec(
        select(food_item).where(
            food_item.name == name,
            food_item.source == source,
        )
    ).first()
    if existing:
        return existing

    item = food_item(
        external_id=None,
        name=name,
        source=source,
        brand=brand,
        barcode=barcode,
        serving_size=serving_size,
        serving_unit=serving_unit,
        calories=calories,
        protein_g=protein,
        carb_g=carb,
        fat_g=fat,
        sugar_g=sugar,
        fiber_g=fiber,
        sodium_mg=sodium,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def create_recipe_if_missing(db, title, meal_type, calories, protein, carb, fat, vegetarian=False, vegan=False, halal=False, gluten_free=False):
    existing = db.exec(select(recipe).where(recipe.title == title)).first()
    if existing:
        return existing

    item = recipe(
        user_id=None,
        spoonacular_id=None,
        title=title,
        description=f"Demo recipe for {title}",
        instructions="Prepare ingredients, cook, and serve.",
        cuisine_type="Demo",
        servings=1,
        meal_type=meal_type,
        cook_time_min=20,
        total_calories=calories,
        total_protein_g=protein,
        total_carb_g=carb,
        total_fat_g=fat,
        is_vegetarian=vegetarian,
        is_vegan=vegan,
        is_halal=halal,
        is_gluten_free=gluten_free,
        is_custom=False,
        is_public=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def create_meal(db, db_user, food, days_ago, amount, favorite=False, rating=None):
    consumed_at = sg_now() - timedelta(days=days_ago)
    ratio = amount / food.serving_size

    item = meal(
        user_id=db_user.user_id,
        meal_name=food.name,
        consumed_at=consumed_at,
        source=food.source,
        brand=food.brand,
        barcode=food.barcode,
        amount=amount,
        unit=food.serving_unit,
        rating=rating,
        is_favorite=favorite,
        calories=round(food.calories * ratio, 2),
        protein_g=round(food.protein_g * ratio, 2),
        carb_g=round(food.carb_g * ratio, 2),
        fat_g=round(food.fat_g * ratio, 2),
        sugar_g=round(food.sugar_g * ratio, 2),
        fiber_g=round(food.fiber_g * ratio, 2),
        sodium_mg=round(food.sodium_mg * ratio, 2),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def recalc_entry(db, db_user, target_date):
    meals = db.exec(
        select(meal).where(
            meal.user_id == db_user.user_id,
        )
    ).all()

    same_day = [m for m in meals if m.consumed_at.date() == target_date]

    existing = db.exec(
        select(dietary_entry).where(
            dietary_entry.user_id == db_user.user_id,
            dietary_entry.entry_date == target_date,
        )
    ).first()

    total_cal = sum(m.calories for m in same_day)
    total_protein = sum(m.protein_g for m in same_day)
    total_carb = sum(m.carb_g for m in same_day)
    total_fat = sum(m.fat_g for m in same_day)

    if existing:
        existing.total_calories_consumed = total_cal
        existing.total_protein_g = total_protein
        existing.total_carb_g = total_carb
        existing.total_fat_g = total_fat
        existing.updated_at = sg_now()
        db.add(existing)
    else:
        db.add(dietary_entry(
            user_id=db_user.user_id,
            entry_date=target_date,
            total_calories_consumed=total_cal,
            total_protein_g=total_protein,
            total_carb_g=total_carb,
            total_fat_g=total_fat,
        ))

    db.commit()


def seed():
    with Session(engine) as db:
        now = sg_now()

        admin = get_or_create_user(db, "Admin", "User", "admin@nutritrack.com", UserRole.admin)
        free_user = get_or_create_user(db, "Free", "User", "free@test.com", UserRole.freemium)
        premium_user = get_or_create_user(db, "Premium", "User", "premium@test.com", UserRole.premium)
        nutritionist = get_or_create_user(db, "Nutrition", "Expert", "nutritionist@test.com", UserRole.nutritionist)

        create_profile_if_missing(db, free_user, Gender.female, date(2001, 5, 20), 165, 64, ActivityLevel.lightly_active, 1900)
        create_profile_if_missing(db, premium_user, Gender.male, date(1998, 8, 12), 175, 78, ActivityLevel.active, 2500)

        create_preferences_if_missing(
            db, free_user,
            is_vegetarian=False,
            is_vegan=False,
            is_halal=False,
            is_gluten_free=False,
            has_peanut_allergy=False,
            has_tree_nut_allergy=False,
            has_milk_allergy=False,
            has_egg_allergy=False,
            has_fish_allergy=False,
            has_shellfish_allergy=False,
            has_soy_allergy=False,
            has_wheat_allergy=False,
            has_sesame_allergy=False,
            has_sulfite_allergy=False,
            allergy_notes=None,
        )
        create_preferences_if_missing(
            db, premium_user,
            is_vegetarian=False,
            is_vegan=False,
            is_halal=True,
            is_gluten_free=False,
            has_peanut_allergy=False,
            has_tree_nut_allergy=False,
            has_milk_allergy=False,
            has_egg_allergy=False,
            has_fish_allergy=False,
            has_shellfish_allergy=False,
            has_soy_allergy=False,
            has_wheat_allergy=False,
            has_sesame_allergy=False,
            has_sulfite_allergy=False,
            allergy_notes="Prefers halal-friendly meals.",
        )

        create_goal_if_missing(db, free_user, GoalType.lose, 58, WeeklyGoalRate.moderate, 1500, 112.5, 150, 50)
        create_goal_if_missing(db, premium_user, GoalType.maintain, 78, WeeklyGoalRate.stagnant, 2500, 187.5, 250, 83.3)

        for target_user, weights in [
            (free_user, [65.0, 64.6, 64.2]),
            (premium_user, [78.5, 78.2, 78.0]),
        ]:
            for i, w in enumerate(weights):
                db.add(weight_log(
                    user_id=target_user.user_id,
                    weight_kg=w,
                    recorded_at=now - timedelta(days=14 - i * 7),
                ))

        for target_user in [free_user, premium_user]:
            for i in range(5):
                db.add(water_intake_log(
                    user_id=target_user.user_id,
                    amount_ml=500,
                    logged_at=now - timedelta(days=i),
                ))

        db.commit()

        foods = [
            create_food_if_missing(db, "Chicken Breast", FoodSource.admin, 100, "g", 165, 31, 0, 3.6, 0, 0, 74),
            create_food_if_missing(db, "Boiled Egg", FoodSource.admin, 50, "g", 78, 6.3, 0.6, 5.3, 0.6, 0, 62),
            create_food_if_missing(db, "White Rice", FoodSource.admin, 100, "g", 130, 2.7, 28, 0.3, 0.1, 0.4, 1),
            create_food_if_missing(db, "Brown Rice", FoodSource.admin, 100, "g", 112, 2.6, 23, 0.9, 0.4, 1.8, 5),
            create_food_if_missing(db, "Salmon", FoodSource.admin, 100, "g", 208, 20, 0, 13, 0, 0, 59),
            create_food_if_missing(db, "Apple", FoodSource.admin, 100, "g", 52, 0.3, 14, 0.2, 10, 2.4, 1),
            create_food_if_missing(db, "Banana", FoodSource.admin, 100, "g", 89, 1.1, 23, 0.3, 12, 2.6, 1),
            create_food_if_missing(db, "Greek Yogurt", FoodSource.admin, 100, "g", 97, 10, 3.6, 5, 3.2, 0, 36),
            create_food_if_missing(db, "Broccoli", FoodSource.admin, 100, "g", 34, 2.8, 7, 0.4, 1.7, 2.6, 33),
            create_food_if_missing(db, "Oatmeal", FoodSource.admin, 100, "g", 68, 2.4, 12, 1.4, 0.5, 1.7, 49),
        ]

        existing_custom = db.exec(
            select(custom_meal).where(
                custom_meal.user_id == free_user.user_id,
                custom_meal.name == "My Chicken Bowl",
            )
        ).first()
        if not existing_custom:
            db.add(custom_meal(
                user_id=free_user.user_id,
                name="My Chicken Bowl",
                emoji="🍗",
                emoji_bg="#FDE68A",
                category="Lunch",
                serving_size=1,
                serving_unit="serving",
                calories=520,
                protein_g=38,
                carb_g=58,
                fat_g=14,
                notes="Demo custom meal.",
            ))
            db.commit()

        # Add demo meals only if the user has no meals yet.
        existing_meals = db.exec(select(meal).where(meal.user_id == free_user.user_id)).first()
        if not existing_meals:
            create_meal(db, free_user, foods[0], 0, 150, favorite=True, rating=5)
            create_meal(db, free_user, foods[2], 0, 120)
            create_meal(db, free_user, foods[5], 1, 150)
            create_meal(db, free_user, foods[7], 2, 100)
            create_meal(db, premium_user, foods[4], 0, 180, favorite=True, rating=4)
            create_meal(db, premium_user, foods[3], 0, 150)

            for target_user in [free_user, premium_user]:
                for i in range(3):
                    recalc_entry(db, target_user, (now - timedelta(days=i)).date())

        existing_sub = db.exec(
            select(user_subscription).where(
                user_subscription.user_id == premium_user.user_id,
                user_subscription.status == SubscriptionStatus.active,
            )
        ).first()
        if not existing_sub:
            sub = user_subscription(
                user_id=premium_user.user_id,
                plan=SubscriptionPlan.annual,
                status=SubscriptionStatus.active,
                price=99.00,
                currency="SGD",
                start_at=now,
                end_at=now + timedelta(days=365),
            )
            db.add(sub)
            db.commit()
            db.refresh(sub)

            db.add(subscription_transaction(
                user_id=premium_user.user_id,
                subscription_id=sub.subscription_id,
                transaction_type=SubscriptionTransactionType.checkout,
                status=SubscriptionTransactionStatus.success,
                plan=SubscriptionPlan.annual,
                amount=99.00,
                currency="SGD",
                payment_provider="mock_gateway",
                provider_reference="demo_seed_checkout",
                message="Demo subscription checkout.",
            ))
            db.commit()

        if not db.exec(select(support_ticket).where(support_ticket.user_id == free_user.user_id)).first():
            db.add(support_ticket(
                user_id=free_user.user_id,
                category="Account",
                subject="Unable to update profile",
                description="Demo support ticket for admin screen.",
                status=SupportTicketStatus.open,
            ))
            db.add(support_ticket(
                user_id=premium_user.user_id,
                category="Subscription",
                subject="Question about annual plan",
                description="Demo premium user support ticket.",
                status=SupportTicketStatus.in_progress,
                admin_reply="We are checking this for you.",
            ))
            db.commit()

        if not db.exec(select(nutritionist_profile).where(nutritionist_profile.user_id == nutritionist.user_id)).first():
            db.add(nutritionist_profile(
                user_id=nutritionist.user_id,
                specialisation="Weight Management",
                credentials="Registered Dietitian",
                bio="Demo nutritionist profile.",
                tags='["weight loss", "balanced diet"]',
                filters='["halal-friendly", "high protein"]',
                tip="Keep meals balanced with protein, carbs, and vegetables.",
                diary_feedback="Good consistency overall.",
                testimonial="Very helpful and practical advice.",
            ))
            db.commit()

        for i in range(3):
            slot_date = (now + timedelta(days=i + 1)).date()
            exists = db.exec(
                select(nutritionist_availability_slot).where(
                    nutritionist_availability_slot.nutritionist_id == nutritionist.user_id,
                    nutritionist_availability_slot.slot_date == slot_date,
                    nutritionist_availability_slot.slot_time == "10:00",
                )
            ).first()
            if not exists:
                db.add(nutritionist_availability_slot(
                    nutritionist_id=nutritionist.user_id,
                    slot_date=slot_date,
                    slot_time="10:00",
                ))
        db.commit()

        existing_booking = db.exec(select(booking).where(booking.user_id == premium_user.user_id)).first()
        if not existing_booking:
            demo_booking = booking(
                user_id=premium_user.user_id,
                nutritionist_id=nutritionist.user_id,
                booking_date=(now + timedelta(days=1)).date(),
                booking_time="10:00",
                status=BookingStatus.confirmed,
                topic="Review meal plan",
            )
            db.add(demo_booking)
            db.commit()
            db.refresh(demo_booking)

            demo_chat = chat(
                booking_id=demo_booking.booking_id,
                user_id=premium_user.user_id,
                nutritionist_id=nutritionist.user_id,
            )
            db.add(demo_chat)
            db.commit()
            db.refresh(demo_chat)

            db.add(chat_message(
                chat_id=demo_chat.chat_id,
                sender_id=premium_user.user_id,
                text="Hi, can you review my meal plan?",
                read=True,
            ))
            db.add(chat_message(
                chat_id=demo_chat.chat_id,
                sender_id=nutritionist.user_id,
                text="Sure, I will check your recent logs.",
                read=False,
            ))
            db.commit()

        if not db.exec(select(nutrition_content).where(nutrition_content.title == "Protein Intake Basics")).first():
            db.add(nutrition_content(
                author_id=nutritionist.user_id,
                content_type=NutritionContentType.tip,
                title="Protein Intake Basics",
                preview="Simple tips for balancing protein intake.",
                body="Aim to include a protein source in each main meal.",
                category="Nutrition Tips",
                views=24,
            ))
            db.commit()

        if not db.exec(select(analysis).where(analysis.analysis_id == "demo-analysis-001")).first():
            db.add(analysis(
                analysis_id="demo-analysis-001",
                nutritionist_id=nutritionist.user_id,
                client_id=premium_user.user_id,
                nutritionist_name="Nutrition Expert",
                user_name="Premium User",
                summary="The user is logging meals consistently.",
                went_well="Protein intake is fairly consistent.",
                areas_to_improve="Vegetable intake could be improved.",
                recommendations="Add one serving of vegetables to lunch and dinner.",
                next_steps="Review progress again next week.",
            ))
            db.commit()

        if not db.exec(select(audit_log).where(audit_log.action == "Seeded demo data")).first():
            db.add(audit_log(
                action="Seeded demo data",
                detail="Initial demo data inserted for APK demo.",
                type=AuditLogType.system,
                admin_email=admin.email,
                ip_address="127.0.0.1",
            ))
            db.commit()

        # Admin performance/demo logs
        if not db.exec(select(app_event_log)).first():
            for target_user in [free_user, premium_user]:
                for feature in [
                    AppFeature.meal_logger,
                    AppFeature.goals,
                    AppFeature.recommend_meal,
                    AppFeature.consult,
                    AppFeature.progress_report,
                    AppFeature.my_meals,
                ]:
                    db.add(app_event_log(
                        user_id=target_user.user_id,
                        feature=feature,
                        event_name="view",
                        duration_seconds=120,
                        created_at=now - timedelta(days=1),
                    ))
            db.commit()

        if not db.exec(select(spoonacular_api_log)).first():
            db.add(spoonacular_api_log(
                endpoint="/food/ingredients/search",
                food_name="chicken",
                status_code=200,
                response_time_ms=320,
                success=True,
            ))
            db.add(spoonacular_api_log(
                endpoint="/food/products/search",
                food_name="milk",
                status_code=200,
                response_time_ms=410,
                success=True,
            ))
            db.commit()

        if not db.exec(select(push_token).where(push_token.user_id == free_user.user_id)).first():
            db.add(push_token(
                user_id=free_user.user_id,
                token="ExponentPushToken[demo-free-user-token]",
                is_active=True,
            ))
            db.commit()

        if not db.exec(select(notification_history)).first():
            db.add(notification_history(
                title="Welcome to NutriTrack",
                message="Demo notification history item.",
                segment=NotificationSegment.all,
                recipient_count=2,
                created_by_user_id=admin.user_id,
            ))
            db.commit()

        if not db.exec(select(dish_ingredient_lookup).where(dish_ingredient_lookup.dish_class == "fried_rice")).first():
            db.add(dish_ingredient_lookup(
                dish_class="fried_rice",
                display_name="Fried Rice",
                ingredients='[{"name": "rice", "default_g": 150}, {"name": "egg", "default_g": 50}]',
            ))
            db.commit()

        print("Demo data seeded successfully.")
        print("Admin login: admin@nutritrack.com / Password123!")
        print("Freemium login: free@test.com / Password123!")
        print("Premium login: premium@test.com / Password123!")
        print("Nutritionist login: nutritionist@test.com / Password123!")


if __name__ == "__main__":
    seed()