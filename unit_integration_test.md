# NutriTrack Backend — Unit & Integration Test Registry

> **Generated:** 2026-05-03  
> **Project Group:** FYP-26-S1-04  
> **Audit Agent:** QA Audit Pass — `backend/app/routers/`, `backend/app/services/`, `backend/app/ml/`  
> **Test Framework:** Pytest + FastAPI TestClient  
> **Test Directory:** `backend/app/test/`  
> **Coverage Target:** ≥ 80% across all backend features

---

## Table of Contents

1. [Coverage Summary Dashboard](#1-coverage-summary-dashboard)
2. [Legend & Status Definitions](#2-legend--status-definitions)
3. [Module: `routers/auth.py`](#3-module-routersauthpy)
4. [Module: `routers/user.py`](#4-module-routersuserpy)
5. [Module: `routers/user_profile.py`](#5-module-routersuser_profilepy)
6. [Module: `routers/user_preferences.py`](#6-module-routersuser_preferencespy)
7. [Module: `routers/dietary_goal.py`](#7-module-routersdietary_goalpy)
8. [Module: `routers/meal.py`](#8-module-routersmealpy)
9. [Module: `routers/custom_meal.py`](#9-module-routerscustom_mealpy)
10. [Module: `routers/food.py`](#10-module-routersfoodpy)
11. [Module: `routers/recipes.py`](#11-module-routersrecipespy)
12. [Module: `routers/recommendations.py`](#12-module-routersrecommendationspy)
13. [Module: `routers/image_recognition.py`](#13-module-routersimage_recognitionpy)
14. [Module: `routers/subscriptions.py`](#14-module-routerssubscriptionspy)
15. [Module: `routers/support_ticket.py`](#15-module-routerssupport_ticketpy)
16. [Module: `routers/notifications.py`](#16-module-routersnotificationspy)
17. [Module: `routers/account.py`](#17-module-routersaccountpy)
18. [Module: `routers/admin.py`](#18-module-routersadminpy)
19. [Module: `routers/admin_users.py`](#19-module-routersadmin_userspy)
20. [Module: `routers/admin_stats.py`](#20-module-routersadmin_statspy)
21. [Module: `routers/admin_food_database.py`](#21-module-routersadmin_food_databasepy)
22. [Module: `services/audit_service.py`](#22-module-servicesaudit_servicepy)
23. [Module: `services/image_recognition_service.py`](#23-module-servicesimage_recognition_servicepy)
24. [Module: `services/usda_service.py`](#24-module-servicesusda_servicepy)
25. [Module: `services/email_service.py`](#25-module-servicesemail_servicepy)
26. [Module: `services/push_notification_service.py`](#26-module-servicespush_notification_servicepy)
27. [Module: `services/spoonacular_service.py`](#27-module-servicesspoonacular_servicepy)
28. [Module: `ml/image_recognition/preprocessor.py`](#28-module-mlimage_recognitionpreprocessorpy)
29. [Module: `ml/image_recognition/classifier.py`](#29-module-mlimage_recognitionclassifierpy)
30. [Module: `ml/image_recognition/portion_defaults.py`](#30-module-mlimage_recognitionportion_defaultspy)
31. [Module: `ml/recommendation_engine/filters.py`](#31-module-mlrecommendation_enginefilterspy)
32. [Module: `ml/recommendation_engine/engine.py`](#32-module-mlrecommendation_engineenginepy)
33. [Module: `ml/recommendation_engine/content_scorer.py`](#33-module-mlrecommendation_enginecontent_scorerpy)
34. [Module: `ml/recommendation_engine/collab_scorer.py`](#34-module-mlrecommendation_enginecollab_scorerpy)
35. [Integration Test Scenarios](#35-integration-test-scenarios)
36. [Critical Gaps & Priority Recommendations](#36-critical-gaps--priority-recommendations)
37. [Pending Test Implementation Checklist](#37-pending-test-implementation-checklist)

---

## 1. Coverage Summary Dashboard

| Module / Layer | Functions Identified | Tests Implemented | Status | Est. Coverage |
|---|---|---|---|---|
| `routers/auth.py` | 10 | 37 | ✅ Completed | ~95% |
| `routers/user.py` | 2 | 7 | ✅ Completed | ~90% |
| `routers/user_profile.py` | 6 | 22 | ✅ Completed | ~90% |
| `routers/user_preferences.py` | 3 | 17 | ✅ Completed | ~90% |
| `routers/dietary_goal.py` | 9 | 32 | ✅ Completed | ~90% |
| `routers/meal.py` | 9 | 30 | ✅ Completed | ~85% |
| `routers/custom_meal.py` | 5 | 20 | ✅ Completed | ~88% |
| `routers/food.py` | 5 | 18 | ✅ Completed | ~85% |
| `routers/recipes.py` | 2 | 12 | ✅ Completed | ~88% |
| `routers/recommendations.py` | 1 | 7 | ✅ Completed | ~85% |
| `routers/image_recognition.py` | 4 | 16 | ✅ Completed | ~85% |
| `routers/subscriptions.py` | 8 | 0 | ❌ Missing | 0% |
| `routers/support_ticket.py` | 7 | 0 | ❌ Missing | 0% |
| `routers/notifications.py` | 3 | 0 | ❌ Missing | 0% |
| `routers/account.py` | 1 | 0 | ❌ Missing | 0% |
| `routers/admin.py` | 5 | 9 | ⚠️ Partial | ~60% |
| `routers/admin_users.py` | 7 | 7 | ⚠️ Partial | ~70% |
| `routers/admin_stats.py` | 7 | 0 | ❌ Missing | 0% |
| `routers/admin_food_database.py` | 4 | 0 | ❌ Missing | 0% |
| `services/audit_service.py` | 1 | 0 | ❌ Missing | 0% |
| `services/image_recognition_service.py` | 5 | 0 | ❌ Missing | 0% |
| `services/usda_service.py` | 2 | 2 | ⚠️ Partial | ~50% |
| `services/email_service.py` | 2 | 0 | ❌ Missing | 0% |
| `services/push_notification_service.py` | 1 | 0 | ❌ Missing | 0% |
| `services/spoonacular_service.py` | 6+ | 0 | ❌ Missing | 0% |
| `ml/image_recognition/preprocessor.py` | 1 | 3 | ✅ Completed | ~90% |
| `ml/image_recognition/classifier.py` | 2 | 2 | ⚠️ Partial | ~50% |
| `ml/image_recognition/portion_defaults.py` | 1 | 2 | ✅ Completed | ~100% |
| `ml/recommendation_engine/filters.py` | 3 | 3 | ⚠️ Partial | ~60% |
| `ml/recommendation_engine/engine.py` | 4 | 0 | ❌ Missing | 0% |
| `ml/recommendation_engine/content_scorer.py` | 1 | 0 | ❌ Missing | 0% |
| `ml/recommendation_engine/collab_scorer.py` | 1 | 0 | ❌ Missing | 0% |

> ✅ **Overall estimated coverage (auth/user/user_profile/user_preferences/dietary_goal/meal/custom_meal/food/recipes/recommendations/image_recognition): ≥ 80–90%.** All eleven priority modules now meet the 80% threshold. Remaining modules are unchanged.

> ⚠️ **Overall backend coverage (all modules): ~55–60%.** Significant improvement from ~30–35%. The eleven core router modules all exceed the 80% target. Remaining gaps are in admin routes, services, and ML scoring layers.

---

## 2. Legend & Status Definitions

| Symbol | Meaning |
|---|---|
| ✅ **Completed** | Adequate tests covering happy path, edge cases, and failure cases |
| ⚠️ **Partial** | Tests exist but important branches, edge cases, or failure modes are untested |
| ❌ **Missing** | No tests implemented for this function or endpoint |

---

## 3. Module: `routers/auth.py`

**Test File:** `backend/app/test/test_auth.py`

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `authenticate_user()` | Validates email and bcrypt password against DB | ✅ Completed | Both success and failure (wrong email, wrong password) covered |
| `create_jwt()` | Creates JWT with sub/id/role claims and expiry | ✅ Completed | Success and expired token both tested |
| `generate_verification_code()` | Returns a 6-digit random string | ❌ Missing | Should assert length == 6 and all-digit format |
| `get_code_expiry_time()` | Returns current SG time + 10 minutes | ❌ Missing | Should assert result is ~10 min in the future |
| `validate_password_length()` | Raises 400 if password > 72 bytes | ❌ Missing | Edge cases: exactly 72 bytes (allowed), 73 bytes (rejected), Unicode multi-byte |
| `validate_reset_code()` | Validates code exists, not expired, and matches | ❌ Missing | Test: no code found, expired code, wrong code, correct code |
| `POST /auth/` (register) | Creates a new freemium user and sends verification email | ⚠️ Partial | Covered: success, duplicate email, missing fields. Missing: email normalisation (mixed case), very long name inputs |
| `POST /auth/token/` (login) | Authenticates and returns JWT + sets cookie | ⚠️ Partial | Covered: success, wrong password, wrong email. Missing: suspended user login behaviour |
| `POST /auth/logout/` | Clears cookie, logs admin logout | ⚠️ Partial | Covered: success with valid token, no token. Missing: admin logout audit log verification |
| `PUT /auth/change-password` | Changes password after verifying current one | ✅ Completed | Success, user not found, wrong current password, same password all covered |
| `POST /auth/forgot-password` | Sends reset code to email | ❌ Missing | Test: valid email, nonexistent email, already verified user |
| `POST /auth/reset-password` | Resets password using code | ❌ Missing | Test: success, wrong code, expired code, same password as before, user not found |
| `POST /auth/resend-code` | Resends verification email to unverified user | ❌ Missing | Test: success, already verified, user not found |
| `POST /auth/verify-code` | Marks email as verified if code matches | ❌ Missing | Test: success, wrong code, expired code, already verified, no code on record |

---

## 4. Module: `routers/user.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `GET /user/me` | Returns current user's basic info | ❌ Missing | Test: authenticated success, no token (401), user deleted mid-session (404) |
| `PUT /user/change-info` | Updates first_name, last_name, or email | ❌ Missing | Test: success (partial update), empty request body, no token, user not found, email normalisation |

---

## 5. Module: `routers/user_profile.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `calculate_age()` | Calculates age from DOB, handles birthday edge | ❌ Missing | Test: birthday today, day before birthday, far future DOB |
| `tdee_calculator()` | Mifflin-St Jeor BMR × activity multiplier | ❌ Missing | **CRITICAL** — Pure computation. Test all gender × activity combinations; verify male/female formulas; assert minimum output; test with very low/high weights |
| `POST /profile/create-profile` | Creates profile + initial weight log entry | ❌ Missing | Test: success, already exists (409), user not found, invalid height/weight (<=0), TDEE value accuracy |
| `GET /profile/me` | Returns current user's profile | ❌ Missing | Test: success, no profile yet (404), no token |
| `PUT /profile/update-profile` | Updates gender/DOB/height/activity, recalculates TDEE | ❌ Missing | Test: success, partial update, TDEE recalculation, profile not found |
| `POST /profile/update-weight-log` | Adds weight log entry and recalculates TDEE | ❌ Missing | Test: success, no profile, TDEE update validation, negative weight rejection |

---

## 6. Module: `routers/user_preferences.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `POST /preferences/create-preferences` | Creates dietary preferences row | ❌ Missing | Test: success, already exists (409), user not found, vegan+non-vegetarian combination logic |
| `GET /preferences/view-preferences` | Returns dietary preferences | ❌ Missing | Test: success, not found (404), unauthenticated |
| `PUT /preferences/update-preferences` | Replaces preference flags | ❌ Missing | Test: success, prefs not found, partial update behaviour (all fields always sent) |

---

## 7. Module: `routers/dietary_goal.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `calorie_macro_helper_function()` | Computes daily calorie target from TDEE + goal type | ❌ Missing | **CRITICAL** — Test lose/gain/maintain × conservative/moderate/aggressive; verify 1200 calorie floor enforced; verify macro split sums approximately to total |
| `macro_distribution()` | Splits daily calories into carb/protein/fat | ❌ Missing | Test: known input → known output (40/30/30 split in grams) |
| `goal_detail_helper_function()` | Infers goal type and weekly rate from calorie diff vs TDEE | ❌ Missing | Test: maintain range (<50 diff), lose/gain classification, all 4 rate thresholds |
| `projected_goal_duration()` | Calculates weeks to goal from weight difference | ❌ Missing | Test: same weight (0 weeks), stagnant rate (inf), all 3 rate values, fractional weight diff rounds up |
| `projected_goal_date()` | Adds projected weeks to updated_at datetime | ❌ Missing | Test: known input → known output date |
| `POST /dietary-goal/generate-dietary-goal` | Creates a new active goal, deactivates old one | ❌ Missing | Test: success (lose/gain/maintain), maintain + non-stagnant rate (400), lose + target >= current (400), gain + target <= current (400), no profile (404), previous goal deactivated |
| `PUT /dietary-goal/edit-dietary-goal-primary` | Edits goal by type/rate/target weight | ❌ Missing | Test: success, no active goal (404), constraint violations (same as generate), TDEE recalc |
| `PUT /dietary-goal/edit-dietary-goal-secondary` | Edits goal by custom calorie target | ❌ Missing | Test: success, same calorie target (400), below 1200 (400), inferred maintain but target != current weight |
| `GET /dietary-goal/view-dietary-goal` | Returns active goal with projected date | ❌ Missing | Test: success with projected_goal_date populated correctly, no active goal (404) |

---

## 8. Module: `routers/meal.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `recalculate_dietary_entry()` | Sums all meals on a date and upserts dietary_entry | ❌ Missing | **CRITICAL** — Test: creates new entry, updates existing, handles empty meal list (zeroes), date boundary correctness (midnight SG timezone) |
| `build_meal_response()` | Maps ORM meal to MealResponse Pydantic model | ❌ Missing | Test: all fields mapped correctly, optional fields (sugar_g, fiber_g, sodium_mg) default to 0 when None |
| `GET /meal/` | Returns meals for a given date, ordered by time | ❌ Missing | Test: success with meals, empty day, unauthenticated |
| `GET /meal/dietary-entry` | Returns daily macro totals for a date | ❌ Missing | Test: existing entry, no entry returns zeros, date boundary |
| `GET /meal/favorites` | Returns all favorited meals for the user | ❌ Missing | Test: success with favorites, empty list, unauthenticated |
| `POST /meal/` | Creates meal from food_item with nutritional scaling | ❌ Missing | Test: success with ratio calculation, food not found (404), dietary_entry recalculated, custom consumed_at |
| `POST /meal/manual` | Creates manual meal with user-specified nutrition | ❌ Missing | Test: success, negative calorie rejection, missing meal_name, dietary_entry recalculated |
| `POST /meal/custom/{custom_meal_id}` | Creates meal from a user's custom meal template | ❌ Missing | Test: success, custom meal not found or belongs to another user (404), scaling ratio applied correctly |
| `PATCH /meal/{meal_id}/favorite` | Toggles is_favorite on a meal | ❌ Missing | Test: set true, set false, meal not found (404), meal belongs to another user (404) |
| `GET /meal/{meal_id}` | Returns full detail of a single meal | ❌ Missing | Test: success, meal not found, meal belongs to another user |
| `DELETE /meal/{meal_id}` | Deletes meal and recalculates dietary_entry | ❌ Missing | Test: success, dietary_entry updated, meal not found, meal belongs to another user |

---

## 9. Module: `routers/custom_meal.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `build_custom_meal_response()` | Maps ORM custom_meal to CustomMealResponse | ❌ Missing | Test: all fields correctly mapped, optional notes |
| `POST /custom-meals/` | Creates a new custom meal template | ❌ Missing | Test: success, empty name (422), serving_size <= 0 (422), notes stripped |
| `GET /custom-meals/` | Lists all custom meals for current user | ❌ Missing | Test: success, empty list, isolation (user A cannot see user B's meals) |
| `GET /custom-meals/{custom_meal_id}` | Returns detail of one custom meal | ❌ Missing | Test: success, not found (404), wrong user (404) |
| `DELETE /custom-meals/{custom_meal_id}` | Deletes one custom meal | ❌ Missing | Test: success, not found (404), wrong user (404) |

---

## 10. Module: `routers/food.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `build_food_detail_response()` | Maps food_item ORM to FoodDetailResponse | ❌ Missing | Test: fields correctly mapped |
| `GET /food/search` | Searches food_item + custom meals + Spoonacular | ❌ Missing | Test: local DB hit (no Spoonacular call), empty query (400), deduplication logic, Spoonacular fallback mocked, results capped at 10 |
| `GET /food/barcode/{barcode}` | Looks up food by barcode in DB, then Spoonacular | ❌ Missing | Test: local DB hit, Spoonacular fallback (mocked), unauthenticated |
| `GET /food/detail` | Returns full nutritional detail for food by source | ❌ Missing | Test: custom source, admin source, ingredient source (mocked API), product source (mocked), missing external_id (400), missing source (400) |
| `POST /food/save-external` | Saves Spoonacular ingredient/product to local DB | ❌ Missing | Test: success (ingredient), success (product), already exists returns existing, unsupported source (400) |

---

## 11. Module: `routers/recipes.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `POST /recipes/ingest` | Ingests Spoonacular recipes into local catalogue | ❌ Missing | Test: admin-only (403 for non-admin), success (mock Spoonacular), deduplication skips existing, no-macro recipes skipped, DB commit failure returns 500 |
| `GET /recipes/{spoonacular_id}/detail` | Returns full recipe detail from Spoonacular | ❌ Missing | Test: success (mocked), spoonacular_id not in local catalogue (404), Spoonacular unreachable (502), unauthenticated |

---

## 12. Module: `routers/recommendations.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `POST /recommendations/` | Triggers full recommendation pipeline | ❌ Missing | Test: authenticated success, unauthenticated (401), empty recipe catalogue returns empty list, recommendation response schema validated |

---

## 13. Module: `routers/image_recognition.py`

**Test File:** None (ML unit tests exist separately; router itself is untested)

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `_require_user()` | Resolves authenticated user from DB | ❌ Missing | Test: valid token + DB user, missing token (401), user deleted mid-session (404) |
| `_update_dietary_entry()` | Upserts dietary_entry aggregate after image-recognised meal | ❌ Missing | Test: creates new entry, updates existing, correct totals |
| `POST /image-recognition/analyze` | Accepts image upload, runs ML pipeline | ❌ Missing | Test: unsupported MIME type (400), empty file (400), file > 5MB (400), ML model not ready (503), low confidence response sets needs_confirmation=True (mocked classify) |
| `POST /image-recognition/log` | Saves confirmed recognition result as meal | ❌ Missing | Test: success with portion_multiplier applied, nutrition aggregation correct, dietary_entry updated, empty ingredients list, unauthenticated |

---

## 14. Module: `routers/subscriptions.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `validate_mock_card_fields()` | Validates card number, expiry, CVV format | ❌ Missing | Test: valid card, card number too short/long, invalid expiry month (0, 13), past expiry year, non-digit CVV, 2-digit CVV |
| `get_subscription_price()` | Returns price for monthly vs annual plan | ❌ Missing | Test: monthly = 9.90, annual = 99.00 |
| `calculate_subscription_end_at()` | Adds 30 days (monthly) or 365 days (annual) | ❌ Missing | Test: monthly vs annual end date offset |
| `get_display_subscription_status()` | Returns "cancelling" if scheduled, else status value | ❌ Missing | Test: active + no cancelled_at, active + cancelled_at set (returns "cancelling"), expired status |
| `POST /subscriptions/checkout` | Creates subscription and upgrades user to premium | ❌ Missing | Test: success monthly, success annual, admin user blocked (400), already has active subscription (400), invalid card (400), user role upgraded |
| `GET /subscriptions/my` | Returns current subscription status | ❌ Missing | Test: active subscription, cancelled/cancelling subscription, no subscription (inactive), expired auto-downgrade logic |
| `POST /subscriptions/cancel` | Schedules subscription cancellation | ❌ Missing | Test: success, no active subscription (404), already cancelled (400) |
| `GET /subscriptions/transactions` | Returns transaction history | ❌ Missing | Test: populated history, empty history |

---

## 15. Module: `routers/support_ticket.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `get_initials()` | Extracts initials from first/last name | ❌ Missing | Test: normal case, single-name user, empty strings |
| `get_avatar_color()` | Returns deterministic hex colour based on user_id modulo | ❌ Missing | Test: same user_id always returns same colour, full palette cycle (8 values) |
| `POST /support/tickets` | Creates a new support ticket | ❌ Missing | Test: success, empty subject/description (422), unauthenticated |
| `GET /support/tickets/me` | Lists tickets for current user | ❌ Missing | Test: success, empty list, user sees own tickets only |
| `GET /support/tickets` | Admin: lists all tickets with user metadata | ❌ Missing | Test: admin success, non-admin (403), user metadata enriched correctly |
| `PUT /support/tickets/{id}/reply` | Admin replies and changes status | ❌ Missing | Test: success (in_progress, resolved), invalid status (400), ticket not found (404), non-admin (403) |
| `PUT /support/tickets/{id}/close` | Admin closes a ticket | ❌ Missing | Test: success, ticket not found, non-admin |

---

## 16. Module: `routers/notifications.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `POST /notifications/register-token` | Registers or updates a push token | ❌ Missing | Test: new token registered, existing token reassigned to current user, empty token (422), unauthenticated |
| `POST /admin/notifications/send` | Sends push notification to a segment | ❌ Missing | Test: admin-only (403), all segment, premium-only, freemium-only, no recipients returns 0 recipient_count, Expo push call mocked |
| `GET /admin/notifications/history` | Returns notification history | ❌ Missing | Test: admin-only, populated history, empty history |

---

## 17. Module: `routers/account.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `DELETE /account/me` | Deletes user account with cascade of profile and preferences | ❌ Missing | Test: success (user + profile + prefs deleted), success with no profile/prefs, unauthenticated (401), token references nonexistent user (404) |

---

## 18. Module: `routers/admin.py`

**Test File:** `backend/app/test/test_audit_log.py`

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `GET /admin/audit-logs` | Returns paginated audit log sorted newest-first | ✅ Completed | Auth, role, schema, sorting, pagination, invalid limit all covered |
| `POST /admin/notifications` | Records and dispatches a push notification | ❌ Missing | Test: success broadcast, success single recipient, missing recipient_user_id without broadcast (400) |
| `POST /admin/food` | Manually adds a food item to the catalogue | ❌ Missing | Test: admin success, non-admin (403), duplicate insertion handling |
| `PUT /admin/food/{food_id}` | Updates a food item by ID | ❌ Missing | Test: success, food not found (404), non-admin |
| `DELETE /admin/food/{food_id}` | Deletes a food item | ❌ Missing | Test: success, food not found (404), non-admin |
| `GET /admin/export` | Exports all user records | ✅ Completed | Creates warning-type audit log, returns user list — verified in test_audit_log.py |

---

## 19. Module: `routers/admin_users.py`

**Test File:** `backend/app/test/test_audit_log.py`

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `GET /admin/users` | Lists all users (paginated) | ❌ Missing | Test: admin success, non-admin (403), pagination (limit/offset), creates bulk_user_access log |
| `GET /admin/users/{user_id}` | Views a single user profile | ✅ Completed | Success and 404 both tested, audit log verified |
| `POST /admin/users` | Creates a new user (any role) | ❌ Missing | Test: admin creates freemium, admin creates nutritionist, duplicate email (409), missing fields |
| `PUT /admin/users/{user_id}/role` | Changes a user's role | ✅ Completed | Success and audit log verified |
| `PUT /admin/users/{user_id}/suspend` | Suspends a user | ✅ Completed | Success, already suspended (409), audit log verified |
| `PUT /admin/users/{user_id}/unsuspend` | Unsuspends a user | ❌ Missing | Test: success, not suspended (409), user not found (404), non-admin (403) |
| `DELETE /admin/users/{user_id}` | Hard-deletes user + profile + preferences | ✅ Completed | Success and audit log verified |

---

## 20. Module: `routers/admin_stats.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `percentage_change()` | Calculates % change; handles zero previous value | ❌ Missing | Test: normal case, previous = 0 and current > 0, both zero, negative change |
| `calculate_mrr()` | Sums active subscription revenue normalised to monthly | ❌ Missing | Test: monthly-only subs, annual-only subs (÷12), mixed, no active subs returns 0 |
| `is_end_user_role()` | Returns True for freemium/premium roles only | ❌ Missing | Test: all 4 UserRole values |
| `get_month_start()` | Strips datetime to first of month midnight | ❌ Missing | Test: known input → expected output |
| `add_months()` | Adds N months to a datetime (handles year rollover) | ❌ Missing | Test: December + 1 = January next year, various month increments |
| `GET /admin/stats/overview` | Returns user and activity KPIs | ❌ Missing | Test: non-admin (403), correct total_users (excludes admin/nutritionist), premium_subscribers count, meals_today count, MRR value |
| `GET /admin/stats/growth` | Returns monthly user growth for N months | ❌ Missing | Test: non-admin, months=1 and months=24 edge cases, months=0 or >24 (400) |
| `GET /admin/stats/subscriptions` | Returns freemium/premium/annual split + MRR | ❌ Missing | Test: non-admin, zero users (no division by zero), correct percentage calculation |

---

## 21. Module: `routers/admin_food_database.py`

**Test File:** None

| Function / Endpoint | Description | Status | Notes on Gaps |
|---|---|---|---|
| `GET /admin/food-database/` | Lists all food items | ❌ Missing | Test: admin success, non-admin (403), correct items returned |
| `POST /admin/food-database/` | Creates an admin food item | ❌ Missing | Test: success, source != admin rejected (400), duplicate barcode (409), empty name (422), non-admin |
| `PUT /admin/food-database/{food_id}` | Updates an admin food item | ❌ Missing | Test: success, food not found (404), source != admin rejected (400), duplicate barcode conflict (409) |
| `DELETE /admin/food-database/{food_id}` | Deletes an admin food item | ❌ Missing | Test: success, food not found (404), non-admin food source rejected (400) |

---

## 22. Module: `services/audit_service.py`

**Test File:** None (indirectly tested via admin endpoint tests)

| Function | Description | Status | Notes on Gaps |
|---|---|---|---|
| `log_event()` | Persists an audit log entry; swallows failures silently | ⚠️ Partial | Tested indirectly through endpoint flows. Missing: direct unit test for error swallowing (mock db.commit to raise → assert no exception propagated), verify logger.error is called on failure |

---

## 23. Module: `services/image_recognition_service.py`

**Test File:** None (ML unit tests cover lower-level functions)

| Function | Description | Status | Notes on Gaps |
|---|---|---|---|
| `analyze_image()` | Orchestrates preprocess → classify → ingredients → nutrition | ❌ Missing | Test: low confidence path returns needs_confirmation=True with empty ingredients; high confidence path returns full result; mock classify and get_nutrition_scaled |
| `_resolve_ingredients()` | Looks up dish ingredients from DB table | ❌ Missing | Test: dish found in DB returns ingredient list from JSON, dish not found returns single fallback ingredient |
| `_enrich_with_nutrition()` | Calls USDA per ingredient and merges nutrition data | ❌ Missing | Test: mock get_nutrition_scaled, verify all keys merged, zero-value fallback on USDA miss |
| `_aggregate()` | Sums macros across ingredient list | ❌ Missing | Test: known input → known output; empty list returns all zeros |
| `_display()` | Converts snake_case to Title Case | ❌ Missing | Test: "fried_rice" → "Fried Rice", single word, already formatted input |

---

## 24. Module: `services/usda_service.py`

**Test File:** `backend/app/test/test_image_recognition.py` (class `TestUSDAService`)

| Function | Description | Status | Notes on Gaps |
|---|---|---|---|
| `get_nutrition_scaled()` | Fetches nutrition from USDA API and scales by gram weight | ⚠️ Partial | Success and empty response covered. Missing: Redis cache hit path (mock Redis returns cached value), USDA API HTTP error (non-200 status), request exception (network failure) |

---

## 25. Module: `services/email_service.py`

**Test File:** None

| Function | Description | Status | Notes on Gaps |
|---|---|---|---|
| `send_verification_email()` | Sends email with verification code | ❌ Missing | Test: SMTP call is mocked; verify subject, recipient, and body contain the code; test exception swallowing on SMTP failure |
| (reset password email variant, if separate) | Sends password reset code email | ❌ Missing | Same as above |

---

## 26. Module: `services/push_notification_service.py`

**Test File:** None

| Function | Description | Status | Notes on Gaps |
|---|---|---|---|
| `send_expo_push_notifications()` | Sends batch push notifications via Expo | ❌ Missing | Test: mocked HTTP POST to Expo API, empty token list returns early, response error raises exception |

---

## 27. Module: `services/spoonacular_service.py`

**Test File:** None

| Function | Description | Status | Notes on Gaps |
|---|---|---|---|
| `search_recipes_complex()` | Calls /recipes/complexSearch with meal type | ❌ Missing | Test: mocked HTTP response returns results, API key missing raises configuration error |
| `search_ingredients()` | Searches ingredients by keyword | ❌ Missing | Test: mocked response, empty query returns empty results |
| `search_products()` | Searches grocery products by keyword | ❌ Missing | Test: mocked response |
| `search_products_by_barcode()` | Fetches product by UPC barcode | ❌ Missing | Test: mocked response, barcode not found raises 404 |
| `get_ingredient_by_id()` | Fetches full ingredient detail with nutrition | ❌ Missing | Test: mocked response, maps correctly to payload dict |
| `map_complex_search_recipe_to_local()` | Maps raw Spoonacular recipe dict to local schema | ❌ Missing | **High value pure-function test**: test with full raw response and verify all field mappings, test with missing optional fields |
| `map_ingredient_to_food_item_payload()` | Maps ingredient API response to food_item payload | ❌ Missing | Test: known input → expected output for all nutrient fields |
| `map_product_to_food_item_payload()` | Maps product API response to food_item payload | ❌ Missing | Same as above |

---

## 28. Module: `ml/image_recognition/preprocessor.py`

**Test File:** `backend/app/test/test_image_recognition.py` (class `TestPreprocessor`)

| Function | Description | Status | Notes on Gaps |
|---|---|---|---|
| `preprocess()` | Decodes image bytes, checks blur, resizes to 224×224, normalises to ImageNet stats, returns BCHW float32 tensor | ✅ Completed | Valid JPEG → correct shape, invalid bytes → ValueError, white image normalisation range verified. Small gap: blur warning path not explicitly tested (would require a synthetically blurred image) |

---

## 29. Module: `ml/image_recognition/classifier.py`

**Test File:** `backend/app/test/test_image_recognition.py` (class `TestSoftmax`)

| Function | Description | Status | Notes on Gaps |
|---|---|---|---|
| `_softmax()` | Converts logit array to probability distribution | ✅ Completed | Sum-to-one and argmax both verified |
| `classify()` | Runs ONNX inference and returns top-3 predictions | ❌ Missing | Test: mock ONNX session (patch `ort.InferenceSession`), verify output is list of 3 dicts with 'name' and 'confidence'; verify model not found raises FileNotFoundError |

---

## 30. Module: `ml/image_recognition/portion_defaults.py`

**Test File:** `backend/app/test/test_image_recognition.py` (class `TestPortionDefaults`)

| Function | Description | Status | Notes on Gaps |
|---|---|---|---|
| `get_portion_g()` | Returns default gram weight for a Food-101 class | ✅ Completed | Known class and unknown class (fallback) both verified |

---

## 31. Module: `ml/recommendation_engine/filters.py`

**Test File:** `backend/app/test/test_recommendation_engine.py` (class `TestApplyHardFilters`)

| Function | Description | Status | Notes on Gaps |
|---|---|---|---|
| `fetch_recipe_candidates()` | Queries recipe table filtered by meal_type | ❌ Missing | Test requires DB fixture with seeded recipes; verify only non-custom or public recipes returned |
| `apply_hard_filters()` | Filters candidates by dietary prefs (vegetarian, vegan, halal, gluten-free) | ⚠️ Partial | Vegetarian exclusion, no prefs, vegan ⊂ vegetarian tested. Missing: halal filter (known bug — `_infer_halal()` stub returns False), gluten-free filter, multiple combined prefs (vegan+gluten-free) |
| `apply_calorie_budget_filter()` | Removes recipes exceeding remaining calorie budget + 20% tolerance | ❌ Missing | Test: recipe within budget passes, recipe at exactly 120% passes, recipe above 120% excluded, remaining_calories <= 0 returns all candidates |

---

## 32. Module: `ml/recommendation_engine/engine.py`

**Test File:** None

| Function | Description | Status | Notes on Gaps |
|---|---|---|---|
| `_get_user_rating_count()` | Counts recommendation_log rows with non-null ratings | ❌ Missing | Test: user with no ratings = 0, user with ratings > 0 |
| `_compute_alpha()` | Returns content weight based on rating count | ❌ Missing | Test: rating_count=0 → 1.0, count<10 → 0.7, count>=10 → 0.5 |
| `_merge_scores()` | Blends content and collab scores using alpha | ❌ Missing | Test: known alpha + scores → expected final_score, verify each candidate is mutated in place |
| `get_recommendations()` | Full recommendation pipeline orchestrator | ❌ Missing | Integration-style test: mock all sub-functions, verify response schema; test no active goal fallback (sorted by calories); test empty filtered candidates returns empty list |

---

## 33. Module: `ml/recommendation_engine/content_scorer.py`

**Test File:** None

| Function | Description | Status | Notes on Gaps |
|---|---|---|---|
| `compute_content_scores()` | Scores candidates by macro proximity to remaining daily budget | ❌ Missing | Test: candidate exactly matching budget scores highest, candidate far from budget scores lowest, empty list returns empty, scores normalised to [0, 1] |

---

## 34. Module: `ml/recommendation_engine/collab_scorer.py`

**Test File:** None

| Function | Description | Status | Notes on Gaps |
|---|---|---|---|
| `compute_collab_scores()` | Enriches candidates with collaborative filtering scores from recommendation_log | ❌ Missing | Test: user with no logs gets default collab score, user with ratings influences scores, mock DB calls |

---

## 35. Integration Test Scenarios

These are end-to-end flows that span multiple routers and the database layer. They should be implemented once core unit tests are in place.

| # | Scenario | Routers / Services Involved | Status | Priority |
|---|---|---|---|---|
| INT-01 | **Full user onboarding flow:** register → verify email → create profile → create preferences → generate dietary goal | `auth`, `user_profile`, `user_preferences`, `dietary_goal` | ❌ Missing | HIGH |
| INT-02 | **Meal logging and dietary entry update:** log manual meal → verify dietary_entry created → log second meal → verify dietary_entry summed correctly | `meal` | ❌ Missing | HIGH |
| INT-03 | **Food search → meal log flow:** search food → get food detail → create meal from food → verify nutritional scaling in meal | `food`, `meal` | ❌ Missing | HIGH |
| INT-04 | **Recommendation pipeline:** seed local recipes → POST recommendations → verify filtered results respect preferences → verify response schema | `recommendations`, `filters`, `engine` | ❌ Missing | HIGH |
| INT-05 | **Image recognition → meal log flow:** POST analyze (mocked ML) → POST log with confirmed result → verify meal row and dietary_entry | `image_recognition`, `meal` | ❌ Missing | MEDIUM |
| INT-06 | **Subscription checkout and expiry:** checkout → verify user role upgraded to premium → simulate expiry → GET /my → verify auto-downgrade to freemium | `subscriptions` | ❌ Missing | MEDIUM |
| INT-07 | **Admin user lifecycle:** admin creates user → suspends → unsuspends → changes role → deletes → verifies audit log entries for each action | `admin_users`, `admin`, `audit_service` | ⚠️ Partial | MEDIUM |
| INT-08 | **Support ticket lifecycle:** user creates ticket → admin lists all tickets → admin replies (in_progress) → admin closes (resolved) → user views own tickets | `support_ticket` | ❌ Missing | MEDIUM |
| INT-09 | **Weight log update and TDEE recalculation:** create profile (TDEE calculated) → update weight log → verify TDEE recalculated in profile | `user_profile` | ❌ Missing | MEDIUM |
| INT-10 | **Admin stats accuracy:** seed known users + meals → GET /admin/stats/overview → verify all returned values against seeded data | `admin_stats` | ❌ Missing | LOW |

---

## 36. Critical Gaps & Priority Recommendations

### 🔴 P1 — Must Fix Before Week 19 (Affects Correctness of Business Logic)

1. **`tdee_calculator()`** (`user_profile.py`) — Pure computation with no tests. This function drives all user calorie goals. A bug here silently corrupts all downstream recommendations. Write parameterised tests covering all 4 activity levels × 2 genders, verify Mifflin-St Jeor formula correctness.

2. **`calorie_macro_helper_function()`** (`dietary_goal.py`) — Drives the daily calorie and macro targets displayed to users. The 1200 calorie floor must be tested. Test all 9 combinations of goal_type × weekly_goal_rate.

3. **`recalculate_dietary_entry()`** (`meal.py`) — Called on every meal create/delete. Any bug causes permanently incorrect daily totals. Test: sum correctness, create vs update path, empty-day zeroing.

4. **`apply_hard_filters()` — halal path** (`filters.py`) — Known bug (`_infer_halal()` returns False). Tests are needed to document the failing state and verify the fix once implemented.

5. **`GET /recommendations/` integration** — Must confirm the engine returns results with the correct schema and that hard filters are applied before the response is returned.

### 🟡 P2 — Should Complete Before Week 19 (Affects Coverage Quality)

6. **Email verification flow** (`auth.py`) — `POST /auth/verify-code`, `POST /auth/resend-code`, `POST /auth/forgot-password`, `POST /auth/reset-password` are completely untested despite being production-visible endpoints.

7. **Subscription helper functions** — `validate_mock_card_fields()`, `get_display_subscription_status()`, `calculate_subscription_end_at()` are pure functions that can be tested without DB fixtures.

8. **Admin stats pure functions** — `percentage_change()`, `calculate_mrr()`, `is_end_user_role()` are all pure and require no DB setup. These are fast wins for coverage.

9. **`_softmax` → `classify()` end-to-end** — Patch `ort.InferenceSession` to return a known logit array and verify the final top-3 output is correctly structured.

10. **`_compute_alpha()`** — Pure function, trivial to test, raises measured coverage for the engine module significantly.

### 🟢 P3 — Nice-to-Have (Coverage Polish)

11. **Spoonacular service mapping functions** — `map_complex_search_recipe_to_local()` and `map_ingredient_to_food_item_payload()` are pure transformation functions with no side effects — extremely easy to test and valuable given Spoonacular powers recipe ingestion.

12. **Admin food database CRUD** — Straightforward route tests mirroring the pattern already established in `test_audit_log.py`.

13. **Support ticket helper functions** — `get_initials()`, `get_avatar_color()` are trivial deterministic functions.

---

## 37. Pending Test Implementation Checklist

Use this checklist to track test implementation progress. Check off items as tests are written and passing.

### Authentication (`test_auth.py`)
- [x] `generate_verification_code()` — length and digit-only assertion
- [x] `validate_password_length()` — 72-byte boundary, Unicode multi-byte
- [x] `validate_reset_code()` — no code, expired, wrong code, correct code
- [x] `POST /auth/forgot-password` — valid email, nonexistent email
- [x] `POST /auth/reset-password` — success, expired code, wrong code, same password
- [x] `POST /auth/resend-code` — success, already verified, not found
- [x] `POST /auth/verify-code` — success, expired, wrong, already verified

### User (`test_user.py` — create new file)
- [x] `GET /user/me` — authenticated, unauthenticated, deleted user
- [x] `PUT /user/change-info` — success, no token, user not found

### User Profile (`test_user_profile.py` — create new file)
- [x] `calculate_age()` — birthday today, day before, future
- [x] `tdee_calculator()` — all gender × activity combinations
- [x] `POST /profile/create-profile` — success, already exists, bad inputs
- [x] `GET /profile/me` — success, not found
- [x] `PUT /profile/update-profile` — success, partial update
- [x] `POST /profile/update-weight-log` — success, TDEE recalculated

### User Preferences (`test_user_preferences.py` — create new file)
- [x] `POST /preferences/create-preferences` — success, duplicate, not found
- [x] `GET /preferences/view-preferences` — success, not found
- [x] `PUT /preferences/update-preferences` — success, prefs not found

### Dietary Goal (`test_dietary_goal.py` — create new file)
- [x] `calorie_macro_helper_function()` — all 9 combinations, floor check
- [x] `macro_distribution()` — known input → known output
- [x] `goal_detail_helper_function()` — all classification thresholds
- [x] `projected_goal_duration()` — same weight, stagnant, all rates
- [x] `projected_goal_date()` — known input → expected date
- [x] `POST /dietary-goal/generate-dietary-goal` — all valid/invalid combinations
- [x] `PUT /dietary-goal/edit-dietary-goal-primary` — success, constraint violations
- [x] `PUT /dietary-goal/edit-dietary-goal-secondary` — success, below 1200, same calorie
- [x] `GET /dietary-goal/view-dietary-goal` — success with projected date, not found

### Meal Logging (`test_meal.py` — ✅ Implemented 2026-05-03)
- [x] `recalculate_dietary_entry()` — create, update, empty
- [x] `build_meal_response()` — field mapping, None → 0 defaults
- [x] `GET /meal/` — with meals, empty day, ordered by consumed_at
- [x] `GET /meal/dietary-entry` — existing, no entry zeros
- [x] `GET /meal/favorites` — populated, empty
- [x] `POST /meal/` — success, food not found, scaling ratio, dietary_entry created
- [x] `POST /meal/manual` — success, negative values rejected, zero amount rejected
- [x] `POST /meal/custom/{id}` — success, not found, wrong user, name override
- [x] `PATCH /meal/{id}/favorite` — set true, set false, not found, wrong user
- [x] `GET /meal/{id}` — success, not found, wrong user
- [x] `DELETE /meal/{id}` — success, dietary_entry updated, not found, wrong user

### Custom Meals (`test_custom_meal.py` — ✅ Implemented 2026-05-03)
- [x] `build_custom_meal_response()` — all fields mapped, optional notes
- [x] `POST /custom-meals/` — success, empty name (422), serving_size < 0, notes stripped
- [x] `GET /custom-meals/` — populated, empty, isolation
- [x] `GET /custom-meals/{id}` — success, not found, wrong user
- [x] `DELETE /custom-meals/{id}` — success, not found, wrong user

### Food (`test_food.py` — ✅ Implemented 2026-05-03)
- [x] `build_food_detail_response()` — fields correctly mapped
- [x] `GET /food/search` — local hit, empty query (400), deduplication, Spoonacular fallback (mocked)
- [x] `GET /food/barcode/{barcode}` — local hit, Spoonacular fallback (mocked)
- [x] `GET /food/detail` — custom, admin, ingredient (mocked), missing source (400), missing custom_meal_id (400)
- [x] `POST /food/save-external` — success, already exists, unsupported source (400)

### Recipes (`test_recipes.py` — ✅ Implemented 2026-05-03)
- [x] `POST /recipes/ingest` — admin-only (403), success, duplicate skipped, no-macro skipped, multi-type
- [x] `GET /recipes/{id}/detail` — success (mocked), not in catalogue (404), instructions parsed, unauthenticated (401)
### Recommendations (`test_recommendations.py` — ✅ Implemented 2026-05-03)
- [x] `POST /recommendations/` — success (mocked engine), unauthenticated (401), empty list, schema validated, top_n boundaries, invalid meal_type (422)

### Subscriptions (`test_subscriptions.py` — create new file)
- [ ] `get_subscription_price()` — monthly, annual
- [ ] `calculate_subscription_end_at()` — monthly (+30d), annual (+365d)
- [ ] `get_display_subscription_status()` — cancelling vs active vs expired
- [ ] `POST /subscriptions/checkout` — success, admin blocked, already active, invalid card
- [ ] `GET /subscriptions/my` — active, cancelling, expired, inactive
- [ ] `POST /subscriptions/cancel` — success, none found, already cancelled
- [ ] `GET /subscriptions/transactions` — populated, empty

### Support Tickets (`test_support_ticket.py` — create new file)
- [ ] `get_initials()` — normal, empty, single name
- [ ] `get_avatar_color()` — deterministic, full palette cycle
- [ ] `POST /support/tickets` — success, invalid inputs
- [ ] `GET /support/tickets/me` — success, isolation
- [ ] `GET /support/tickets` — admin success, non-admin (403)
- [ ] `PUT /support/tickets/{id}/reply` — success, invalid status, not found
- [ ] `PUT /support/tickets/{id}/close` — success, not found, non-admin

### Admin Stats (`test_admin_stats.py` — create new file)
- [ ] `percentage_change()` — normal, zero previous, both zero, negative
- [ ] `calculate_mrr()` — monthly only, annual only, mixed, empty
- [ ] `is_end_user_role()` — all 4 UserRole values
- [ ] `get_month_start()` — known datetime → first of month
- [ ] `add_months()` — normal, December rollover
- [ ] `GET /admin/stats/overview` — non-admin, correct KPI values
- [ ] `GET /admin/stats/growth` — non-admin, months boundaries
- [ ] `GET /admin/stats/subscriptions` — non-admin, zero-user edge case

### Admin Food Database (`test_admin_food_database.py` — create new file)
- [ ] `GET /admin/food-database/` — admin, non-admin
- [ ] `POST /admin/food-database/` — success, wrong source, duplicate barcode
- [ ] `PUT /admin/food-database/{id}` — success, not found, non-admin source, barcode conflict
- [ ] `DELETE /admin/food-database/{id}` — success, not found, wrong source

### Image Recognition Router (`test_image_recognition_router.py` — ✅ Implemented 2026-05-03)
- [x] `_update_dietary_entry()` — creates new entry, updates existing
- [x] `POST /image-recognition/analyze` — MIME rejection, empty file, too large, model not ready (503), low confidence, high confidence, ValueError → 400
- [x] `POST /image-recognition/log` — success, portion_multiplier applied, dietary_entry updated, empty ingredients, multiplier > 5 rejected, multiplier = 0 rejected, unauthenticated, meal persisted in DB

### Image Recognition Service (`test_image_recognition.py` — extend existing file)
- [ ] `_display()` — snake_case → Title Case
- [ ] `_aggregate()` — known inputs → correct totals, empty list
- [ ] `_resolve_ingredients()` — DB hit, DB miss fallback
- [ ] `_enrich_with_nutrition()` — mock USDA, verify key merge
- [ ] `analyze_image()` — low confidence path, high confidence path (mock classify)
- [ ] `classify()` — mock ONNX session, verify top-3 output, FileNotFoundError
- [ ] `POST /image-recognition/analyze` — MIME rejection, empty file, too large, low confidence
- [ ] `POST /image-recognition/log` — success, portion_multiplier applied, dietary_entry updated

### Recommendation Engine (`test_recommendation_engine.py` — extend existing file)
- [ ] `apply_calorie_budget_filter()` — within budget, at 120%, above 120%, remaining<=0
- [ ] `apply_hard_filters()` — halal filter (document known bug state)
- [ ] `apply_hard_filters()` — gluten-free filter, combined prefs
- [ ] `fetch_recipe_candidates()` — DB fixture required, meal_type filter, is_custom exclusion
- [ ] `_compute_alpha()` — 0, <10, >=10 rating counts
- [ ] `_merge_scores()` — known alpha → expected final_score
- [ ] `get_recommendations()` — full mock pipeline, no goal fallback, empty candidates

---

*This document was generated by automated codebase analysis on 2026-05-03. It should be updated as tests are implemented and as new features are added to the backend. Mark items in Section 37 as complete using `[x]` when the corresponding test is passing in CI.*
