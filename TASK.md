# NutriTrack — Task Tracker

> **Last updated:** 2026-05-16
> **Project Group:** FYP-26-S1-04 | **Timeline:** Week 20 of 20 | **Submission:** ✅ Submitted 2026-05-09

---

## 1. Project Progress Overview

| Period | Key Milestone | Status | Start Date | Complete Date |
|--------|--------------|--------|------------|---------------|
| Jan 3–31 (Weeks 1–5) | Planning, research, requirements specification | ✅ Complete | 2026-01-03 | 2026-01-31 |
| Feb 14 (Weeks 6–7) | System design, DB schema, UML | ✅ Complete | 2026-02-01 | 2026-02-14 |
| Feb 21 (Week 8) | Exam break | ✅ Done | 2026-02-21 | 2026-02-28 |
| Mar 12–21 (Weeks 9–11) | **Prototype (30%)** — auth, profile, goals, meal log, recommendation page, admin UI scaffolded | ✅ Submitted | 2026-03-01 | 2026-03-21 |
| Mar 24 – Apr 26 (Weeks 12–17) | Full feature implementation — all screens, backend routers, ML pipeline, subscription, nutritionist & admin portals | ✅ Complete | 2026-03-24 | 2026-04-26 |
| May 09 (Weeks 18–19) | Final docs, testing, video, supervisor sign-off | ✅ Complete | 2026-04-28 | 2026-05-16 |
| May 16–25 (Week 20) | Final presentation + email submission | ✅ Complete | 2026-05-16 | 2026-05-16 |

---

## 2. Completed Features

### Backend Routers (`backend/app/routers/`)

| Router / Feature | Status | Assignee | Start Date | Complete Date |
|-----------------|--------|----------|------------|---------------|
| `auth.py` — Register, login, logout, refresh token | ✅ Complete | Nicholas / YeonJeong | 2026-03-12 | 2026-03-21 |
| `auth.py` — Email verification flow | ✅ Complete | Nicholas | 2026-03-21 | 2026-04-22 |
| `auth.py` — Forgot / reset password | ✅ Complete | Benjamin | 2026-04-23 | 2026-04-26 |
| `user.py` — User CRUD | ✅ Complete | Nicholas | 2026-03-30 | 2026-03-30 |
| `user_profile.py` — Profile create, update, TDEE | ✅ Complete | YeonJeong | 2026-03-12 | 2026-03-14 |
| `user_preferences.py` — Dietary preferences, allergy columns | ✅ Complete | YeonJeong | 2026-03-12 | 2026-04-08 |
| `dietary_goal.py` — Goal setting and retrieval | ✅ Complete | Benjamin | 2026-04-01 | 2026-04-05 |
| `meal.py` — Meal logging (manual, barcode, AI photo), favorites, daily summaries | ✅ Complete | Benjamin | 2026-04-08 | 2026-04-23 |
| `custom_meal.py` — Custom meal CRUD | ✅ Complete | Benjamin | 2026-04-13 | 2026-04-23 |
| `food.py` — Food item search, external ID lookup | ✅ Complete | Benjamin | 2026-04-08 | 2026-04-16 |
| `recipes.py` — Spoonacular recipe fetch, local catalogue | ✅ Complete | Benjamin | 2026-04-08 | 2026-04-19 |
| `recommendations.py` — Recommendation engine endpoint | ✅ Complete | YeonJeong | 2026-03-24 | 2026-04-12 |
| `subscriptions.py` — Freemium/Premium management | ✅ Complete | Benjamin | 2026-04-08 | 2026-04-22 |
| `notifications.py` — Push notifications (admin-targeted) | ✅ Complete | Benjamin | 2026-04-09 | 2026-04-23 |
| `support_ticket.py` — Ticket creation and resolution | ✅ Complete | Benjamin | 2026-04-03 | 2026-04-22 |
| `admin_users.py` — Create admin/nutritionist, upgrade, suspend | ✅ Complete | Benjamin | 2026-04-16 | 2026-04-21 |
| `admin_food_database.py` — Admin CRUD for food database | ✅ Complete | Benjamin | 2026-04-14 | 2026-04-24 |
| `admin_stats.py` — App performance analytics | ✅ Complete | Benjamin | 2026-04-12 | 2026-04-19 |
| `image_recognition.py` — AI photo meal recognition endpoint | ✅ Complete | YeonJeong | 2026-04-04 | 2026-04-19 |

### ML Pipeline (`backend/app/ml/`)

| Component | Status | Assignee | Start Date | Complete Date |
|-----------|--------|----------|------------|---------------|
| `classifier.py` — EfficientNet-B0 ONNX inference, top-3 softmax | ✅ Complete | YeonJeong | 2026-04-04 | 2026-04-19 |
| `preprocessor.py` — Decode, blur check, resize, ImageNet norm, BCHW | ✅ Complete | YeonJeong | 2026-04-04 | 2026-04-19 |
| `models/efficientnet_b0_food101.onnx` — Trained model file | ✅ Present | YeonJeong | 2026-03-24 | 2026-04-15 |
| `food101_classes.py` — Class label mapping | ✅ Complete | YeonJeong | 2026-04-04 | 2026-04-15 |
| `portion_defaults.py` — Default portion sizes | ✅ Complete | YeonJeong | 2026-04-04 | 2026-04-19 |
| `image_recognition_service.py` — Service layer | ✅ Complete | YeonJeong | 2026-04-04 | 2026-04-19 |

### Recommendation Engine (`backend/app/ml/recommendation_engine/`)

| Component | Status | Assignee | Start Date | Complete Date |
|-----------|--------|----------|------------|---------------|
| `engine.py` — Main scoring orchestrator | ✅ Complete | YeonJeong | 2026-03-24 | 2026-04-12 |
| `content_scorer.py` — Content-based scoring (macro match 0.6 + calorie proximity 0.4 + goal modifier) | ✅ Complete | YeonJeong | 2026-03-24 | 2026-04-12 |
| `collab_scorer.py` — Collaborative scoring (cosine similarity CF from recommendation_log) | ✅ Complete | YeonJeong | 2026-03-24 | 2026-04-12 |
| `filters.py` — Dietary / halal / allergy filters | ✅ Complete | YeonJeong | 2026-03-24 | 2026-05-08 |
| `schemas.py` — Pydantic schemas | ✅ Complete | YeonJeong | 2026-03-24 | 2026-04-12 |
| `utils.py` — Utilities | ✅ Complete | YeonJeong | 2026-03-24 | 2026-04-12 |

### Services (`backend/app/services/`)

| Service | Status | Assignee | Start Date | Complete Date |
|---------|--------|----------|------------|---------------|
| `email_service.py` — Verification + forgot password emails (Resend) | ✅ Complete | Nicholas | 2026-03-21 | 2026-04-26 |
| `push_notification_service.py` — Push to users/tiers (Expo Push API) | ✅ Complete | Benjamin | 2026-04-14 | 2026-04-23 |
| `spoonacular_service.py` — Recipe ingestion | ✅ Complete | Nicholas | 2026-03-24 | 2026-04-08 |
| `usda_service.py` — Nutrition lookup (Redis-cached) | ✅ Complete | YeonJeong | 2026-03-24 | 2026-04-12 |
| `image_recognition_service.py` — ML inference wrapper | ✅ Complete | YeonJeong | 2026-04-04 | 2026-04-19 |

### Database / Migrations

| Migration / Table | Status | Assignee | Start Date | Complete Date |
|------------------|--------|----------|------------|---------------|
| Initial schema (users, user_profile, dietary_goal, meal) | ✅ Complete | YeonJeong / Nicholas | 2026-03-12 | 2026-03-14 |
| `user_preferences` + allergy columns | ✅ Complete | YeonJeong | 2026-03-12 | 2026-04-08 |
| Subscription + user role fields | ✅ Complete | Benjamin | 2026-04-05 | 2026-04-08 |
| Email verification fields | ✅ Complete | Benjamin | 2026-04-08 | 2026-04-22 |
| Custom meal + notification tables | ✅ Complete | Benjamin | 2026-04-09 | 2026-04-15 |
| Support tickets + subscription history | ✅ Complete | Benjamin | 2026-04-03 | 2026-04-22 |
| Recipe table with meal_type column | ✅ Complete | Nicholas | 2026-03-24 | 2026-04-12 |
| dish_ingredient_lookup table | ✅ Complete | Nicholas | 2026-03-24 | 2026-04-12 |
| Recommendation log + extended fields | ✅ Complete | YeonJeong | 2026-03-24 | 2026-04-12 |
| TDEE column in user_profile | ✅ Complete | YeonJeong | 2026-03-24 | 2026-04-08 |
| external_id in food_item | ✅ Complete | Nicholas | 2026-04-08 | 2026-04-09 |
| Alembic multi-head merge resolved | ✅ Complete | Nicholas | 2026-04-01 | 2026-04-02 |

### Frontend Screens (React Native / Expo)

| Screen / Component | Status | Assignee | Start Date | Complete Date |
|--------------------|--------|----------|------------|---------------|
| Auth — Login screen | ✅ Complete | Benjamin | 2026-03-13 | 2026-03-24 |
| Auth — Register screen | ✅ Complete | Benjamin | 2026-03-13 | 2026-03-24 |
| Auth — Forgot password screen | ✅ Complete | Benjamin | 2026-04-23 | 2026-04-26 |
| Auth — Email verification | ✅ Complete | Benjamin | 2026-04-08 | 2026-04-22 |
| Home screen (calorie summary, macros, quick actions) | ✅ Complete | Benjamin / Jia Sheng | 2026-03-13 | 2026-03-15 |
| Meal Logger — Manual entry | ✅ Complete | Benjamin | 2026-03-14 | 2026-04-16 |
| Meal Logger — Barcode scanner | ✅ Complete | Benjamin | 2026-04-07 | 2026-04-16 |
| Meal Logger — AI photo capture | ✅ Complete | Benjamin | 2026-04-04 | 2026-04-19 |
| Recommend Meal (premium gating) | ✅ Complete | Jia Sheng / Benjamin | 2026-03-17 | 2026-04-13 |
| Goals screen (DB-connected, DOB-based age) | ✅ Complete | Benjamin | 2026-03-18 | 2026-04-05 |
| Profile / Edit Profile | ✅ Complete | Jia Sheng | 2026-03-15 | 2026-03-18 |
| Progress Report (bar chart, donut, consistency grid, insights) | ✅ Complete | Jia Sheng | 2026-03-15 | 2026-03-15 |
| Subscription modal + Premium overlay + Upgrade gates | ✅ Complete | Benjamin | 2026-03-17 | 2026-04-08 |
| Consult page (freemium vs premium) | ✅ Complete | Jia Sheng | 2026-03-31 | 2026-04-17 |
| Chat feature (user ↔ nutritionist via modal) | ✅ Complete | Hao Jiet | 2026-04-15 | 2026-04-15 |
| Appointment / Booking system | ✅ Complete | Hao Jiet | 2026-04-17 | 2026-04-21 |
| Notification screen (user-side) | ✅ Complete | Hao Jiet | 2026-04-03 | 2026-04-09 |
| Help / FAQ screen | ✅ Complete | Hao Jiet | 2026-04-03 | 2026-04-03 |
| Support Ticket (user + admin, integrated) | ✅ Complete | Jia Sheng | 2026-04-03 | 2026-04-22 |
| Admin Dashboard (integrated) | ✅ Complete | Jia Sheng | 2026-03-23 | 2026-04-21 |
| User Management — create, upgrade, suspend (integrated) | ✅ Complete | Jia Sheng | 2026-04-06 | 2026-04-21 |
| Food Database admin — CRUD (integrated, propagates to users) | ✅ Complete | Jia Sheng | 2026-04-09 | 2026-04-24 |
| Audit Log Screen (admin) | ✅ Complete | Jia Sheng | 2026-04-16 | 2026-04-16 |
| Notification Screen admin — push to all/tiers/specific users | ✅ Complete | Jia Sheng | 2026-04-14 | 2026-04-23 |
| Performance Screen (app analytics for admin) | ✅ Complete | Jia Sheng | 2026-04-12 | 2026-04-19 |
| Data Export Screen | ✅ Complete | Jia Sheng | 2026-04-19 | 2026-04-19 |
| API Integration Screens | ✅ Complete | Jia Sheng | 2026-04-16 | 2026-04-16 |
| Nutritionist Dashboard | ✅ Complete | Hao Jiet | 2026-04-09 | 2026-04-23 |
| Nutritionist Client Management (meal log, progress, analysis) | ✅ Complete | Hao Jiet | 2026-04-12 | 2026-04-22 |
| Nutritionist Registration features | ✅ Complete | Hao Jiet | 2026-04-08 | 2026-04-08 |
| Nutritionist Profile (backend-connected via PATCH) | ✅ Complete | Hao Jiet / Nicholas | 2026-04-19 | 2026-05-04 |
| Nutritionist Stats / Active Clients | ✅ Complete | Hao Jiet | 2026-04-12 | 2026-05-08 |

### Testing (`backend/app/test/`)

| Test File | Status | Assignee | Start Date | Complete Date |
|-----------|--------|----------|------------|---------------|
| `conftest.py` — Savepoint rollback, test DB setup | ✅ Complete | Nicholas | 2026-03-21 | 2026-03-21 |
| `test_auth.py` — Auth unit tests (extended) | ✅ Complete | Nicholas | 2026-03-21 | 2026-05-03 |
| `test_healthcheck.py` — Health endpoint | ✅ Complete | Nicholas | 2026-03-21 | 2026-03-21 |
| `test_image_recognition.py` — ML pipeline tests | ✅ Complete | YeonJeong | 2026-04-04 | 2026-04-19 |
| `test_recommendation_engine.py` — Engine tests | ✅ Complete | YeonJeong | 2026-03-24 | 2026-04-12 |
| `test_user.py` — User router tests | ✅ Complete | Nicholas | 2026-05-03 | 2026-05-03 |
| `test_user_profile.py` — User profile router + pure helper tests | ✅ Complete | Nicholas | 2026-05-03 | 2026-05-03 |
| `test_user_preferences.py` — User preferences router tests | ✅ Complete | Nicholas | 2026-05-03 | 2026-05-03 |
| `test_dietary_goal.py` — Dietary goal router + pure helper tests | ✅ Complete | Nicholas | 2026-05-03 | 2026-05-03 |
| `test_meal.py` — Meal router + helper tests (11 classes, ~30 tests) | ✅ Complete | Nicholas | 2026-05-03 | 2026-05-03 |
| `test_custom_meal.py` — Custom meal CRUD + helper tests (~20 tests) | ✅ Complete | Nicholas | 2026-05-03 | 2026-05-03 |
| `test_food.py` — Food search/barcode/detail/save-external tests (~18 tests) | ✅ Complete | Nicholas | 2026-05-03 | 2026-05-03 |
| `test_recipes.py` — Recipe ingest + detail tests (mocked Spoonacular, ~12 tests) | ✅ Complete | Nicholas | 2026-05-03 | 2026-05-03 |
| `test_recommendations.py` — Recommendation endpoint tests (mocked engine, ~7 tests) | ✅ Complete | Nicholas | 2026-05-03 | 2026-05-03 |
| `test_image_recognition_router.py` — Analyze + log endpoints (mocked ML, ~16 tests) | ✅ Complete | Nicholas | 2026-05-03 | 2026-05-03 |

---

## 3. Deliverables

| Deadline | Deliverable | Assignee | Status |
|----------|-------------|----------|--------|
| 2026-05-16 | Final Technical Documentation | Kennedy + Hao Jiet | ✅ Submitted |
| 2026-05-16 | Final User Manual | Kennedy | ✅ Submitted |
| 2026-05-16 | Source Code + Executable / APK | Nicholas | ✅ Submitted |
| 2026-05-16 | Video Recording of all functionalities | Benjamin + Jia Sheng | ✅ Submitted |
| 2026-05-16 | Individual Reflective Diary ×6 | Each Member | ✅ Submitted |
| 2026-05-16 | Peer Assessment Contribution Form ×6 | Each Member | ✅ Submitted |
| 2026-05-16 | Supervisor sign-off on all documents | Nicholas | ✅ Complete |
| 2026-05-16 | Moodle submission | Nicholas | ✅ Submitted |
| 2026-05-25 | Final Presentation — **MANDATORY ATTENDANCE** | All Members | 🔄 In Progress |
| 2026-05-18 | Email link to assessor | Nicholas | 🔄 In Progress |

---

## 4. Work Log (Post-Prototype Discoveries)

| Task | Status | Priority | Assignee | Discovered | Complete Date |
|------|--------|----------|----------|------------|---------------|
| Spoonacular `per_type` quota guard (capped at 10–15 per call) | ✅ Done | HIGH | Nicholas | 2026-04-08 | 2026-05-08 |
| `_infer_halal()` keyword/tag-based implementation | ✅ Done | HIGH | YeonJeong | 2026-04-08 | 2026-05-08 |
| Nutritionist profile backend connection | ✅ Done | HIGH | Hao Jiet / Nicholas | 2026-04-19 | 2026-05-04 |
| Recommend meal halal + dietary filter combos | ✅ Done | HIGH | YeonJeong | 2026-04-12 | 2026-05-08 |
| Recipe catalogue warm-up (~450–570 recipes) | ✅ Done | MEDIUM | Nicholas | 2026-04-08 | 2026-05-08 |
| `create_all()` removed from `main.py` (Alembic-only schema management) | ✅ Done | MEDIUM | Nicholas | 2026-03-21 | 2026-05-08 |
| Nutritionist stats API integration (dummy fallback removed) | ✅ Done | MEDIUM | Hao Jiet | 2026-04-26 | 2026-05-08 |
| Custom meal renamed from "My Meals" — all references updated | ✅ Done | HIGH | Benjamin | 2026-04-23 | 2026-04-23 |
| Nutritionist profile PATCH wired (`GET /nutritionists` + `PATCH /nutritionists/{id}/profile`) | ✅ Done | HIGH | Nicholas | 2026-05-04 | 2026-05-04 |
| Content delete wired to backend (`DELETE /content/{id}`) | ✅ Done | MEDIUM | Nicholas | 2026-05-04 | 2026-05-04 |
| Tip/advice view increment wired to backend | ✅ Done | LOW | Nicholas | 2026-05-04 | 2026-05-04 |
| Admin FoodDatabase fully integrated (propagates to user accounts) | ✅ Done | HIGH | Jia Sheng | 2026-04-19 | 2026-04-24 |
| Forgot password backend + frontend flow | ✅ Done | HIGH | Benjamin | 2026-04-23 | 2026-04-26 |
| Alembic multiple-heads merge conflict resolved | ✅ Done | HIGH | Nicholas | 2026-04-01 | 2026-04-02 |
| Admin routing — admin users redirected to admin dashboard | ✅ Done | HIGH | Benjamin | 2026-04-12 | 2026-04-13 |
| Premium gating applied to recommend meal screen | ✅ Done | HIGH | Benjamin | 2026-04-12 | 2026-04-13 |
| Full pytest suite passing on clean `NutriTrackTest` DB (9 files fixed, 9 failing tests resolved) | ✅ Done | MEDIUM | Nicholas + YeonJeong | 2026-04-28 | 2026-05-04 |
| Meal / custom_meal / food / recipes / recommendations / image_recognition router tests (~103 tests, ≥80% coverage) | ✅ Done | MEDIUM | Nicholas | 2026-05-03 | 2026-05-03 |
| Auth / user / user_profile / user_preferences / dietary_goal tests (115 tests, ≥90% coverage per module) | ✅ Done | MEDIUM | Nicholas | 2026-05-03 | 2026-05-03 |
| Presentation slides (Week 20 demo) | ✅ Done | MEDIUM | All Members | 2026-05-05 | 2026-05-15 |
| Security review — test credentials scrubbed, `.env` not committed | ✅ Done | MEDIUM | Nicholas | 2026-04-28 | 2026-05-08 |
| FastAPI auto-generated API docs verified current | ✅ Done | MEDIUM | Nicholas + YeonJeong | 2026-05-01 | 2026-05-08 |
| Project website updated with final screenshots and feature descriptions | ✅ Done | MEDIUM | Benjamin + Jia Sheng | 2026-05-01 | 2026-05-08 |

---

## Notes

### Status Legend
- 🔄 In Progress
- ✅ Completed

### Team Members
| Name | Email | Role |
|------|-------|------|
| Nicholas (Let Yan Dong) | nydlet001@mymail.sim.edu.sg | Team Lead, Backend/DevOps |
| YeonJeong (Lee Yeongjeong) | lee161@mymail.sim.edu.sg | Backend OIC, ML Engineer |
| Kennedy (Tan Junlong) | Kjtan010@mymail.sim.edu.sg | Documentation OIC, Backend |
| Hao Jiet (Yap Hao Jiet) | hjyap001@mymail.sim.edu.sg | Documentation 2IC, Mobile |
| Benjamin (Lee Pui Kwan) | pkblee001@mymail.sim.edu.sg | Mobile, UI/UX |
| Jia Sheng (Hoo Jia Sheng) | jshoo001@mymail.sim.edu.sg | Mobile OIC, UI/UX |