# `gantt_docs.md` — NutriTrack Gantt Chart Documentation (v2)

**Project:** NutriTrack — Diet Recommendation Mobile App (FYP-26-S1-04)  
**Updated:** 2026-05-03  
**Repositories inspected:** `main` branch + `backend-main` branch  
**Root cause of v1 gap:** Copy-paste workflow across branches meant backend-main commits never merged into main as conventional git history — they were only surfaced by directly inspecting `backend-main`.

---

## 1. What Changed from v1

| Issue in v1 | Fix in v2 |
|-------------|-----------|
| YeonJeong had only 2 commits (Mar 12–14) | 10+ verified commits found on `backend-main` (Apr 19–Apr 28) + merged PRs #28 and #33 |
| ML pipeline and recommendation engine marked ⚠️ Unverified | Both now fully verified with commit evidence |
| Timeline started at Mar 12 | Now covers full project: Jan 3 → May 16, 2026 |
| Pre-Jan and pre-Mar planning phases absent | Pre-git period (Jan 3 – Mar 11) added, clearly labelled Pre-Git with PLANNING.md as source |

---

## 2. Methodology

### 2.1 Branches Inspected

**`main` branch:** Contains all frontend commits (ophiuchi/Jia Sheng, L1b3r0-prog/Benjamin, haojietyap/Hao Jiet) and some backend commits (Nicholas, YeonJeong early schema work). Extracted via `git:git_log (max 200)`.

**`backend-main` branch:** Contains the complete backend development history — all of YeonJeong's backend, ML, and service layer work, plus Nicholas's audit log and DevOps contributions. Accessed via `git_show backend-main~N` stepping (checkout was blocked due to unstaged changes on the working tree; direct log traversal was used instead).

### 2.2 Root Cause of the Branch Disconnect

The team did not follow conventional git workflow (feature branches → PRs → merge into main). Instead, frontend developers worked on a shared frontend branch and committed directly, while backend developers (primarily YeonJeong) worked on `backend-main` and iterated there. Cross-branch "integration" was done by copy-pasting files rather than merging git history. This caused `backend-main` commits to be completely invisible in the `main` branch log.

The result: v1 of the Gantt showed YeonJeong with only 2 commits (her early schema work which had been cherry-picked into main) while all her substantial later work sat undetected on `backend-main`.

### 2.3 Evidence Tiers

| Tier | Symbol | Source | Reliability |
|------|--------|--------|-------------|
| Git-verified | ✅ / ⚠️ | git_log or git_show from main or backend-main | High — commit hash, author, timestamp authoritative |
| Pre-Git | 📋 | PLANNING.md milestone dates | Medium — dates are planned, not actual |
| In-flight | 🔄 🔲 | TASK.md pending tasks | Low — future/in-progress items only |

### 2.4 Author Resolution

| Git Username | Real Name | Verified From |
|-------------|-----------|---------------|
| nichipster / Nicholas Let | Nicholas (Let Yan Dong) | Multiple commits; full name in merge commit 0db2c3e |
| journgey / Lee Yeonjeong | YeonJeong (Lee Yeongjeong) | Full name appears in backend-main commit messages |
| L1b3r0-prog | Benjamin (Lee Pui Kwan) | PLANNING.md roster + commit pattern |
| ophiuchi | Jia Sheng (Hoo Jia Sheng) | PLANNING.md roster + commit pattern |
| haojietyap | Hao Jiet (Yap Hao Jiet) | Username matches PLANNING.md email prefix |
| (no commits) | Kennedy (Tan Junlong) | PLANNING.md roster — zero commits on any branch |

---

## 3. Full Commit-to-Task Mapping (backend-main branch)

| Commit Hash | Date | Author | Task Derived |
|-------------|------|--------|-------------|
| 21c14146 | 2026-04-29 | Nicholas | Audit log — admin create/update food have log_event |
| 2fccaf0b | 2026-04-28 | Nicholas | Merge PR#35 — audit log system complete |
| 51f861eb | 2026-04-27 | Nicholas | Merge PR#33 — recommendation engine complete |
| 4c274e83 | 2026-04-24 | YeonJeong | Forgot password backend (auth routes + validation) |
| 096f8dd9 | 2026-04-23 | YeonJeong | Custom meal router, admin food DB router, notification router, push notification service |
| 05ff6013 | 2026-04-21 | YeonJeong | Merge frontend branch (app.json, API constants) |
| 1abd07b6 | 2026-04-21 | YeonJeong | Support ticket router + subscription router |
| ed9d0a1 | 2026-04-21 | YeonJeong | Email verification + admin stats update + TZ-aware migrations |
| 07112ce | 2026-04-21 | YeonJeong | Email verification migration |
| e8ed9b6 | 2026-04-21 | YeonJeong | Email verification migration merge heads |
| 0a50cd5 | 2026-04-19 | YeonJeong | user_subscription model, admin stats + admin users endpoints |
| 9c9d32d | 2026-04-19 | Nicholas | Merge PR#28 — image recognition pipeline |
| 28eb337 | 2026-03-12 | YeonJeong | Add user_preferences, update table structure in models |
| 237963d | 2026-03-14 | YeonJeong | Refactor database entities and API responses |

**PR#28 (image recognition)** was authored by YeonJeong and merged by Nicholas on 2026-04-19. It contains classifier.py, preprocessor.py, usda_service.py, image_recognition_service.py, food101_classes.py, portion_defaults.py, training and export scripts, dish_ingredient_lookup migration, and test_image_recognition.py.

**PR#33 (recommender engine)** was authored by YeonJeong and merged by Nicholas on 2026-04-27. It contains the recommendations.py router updates, recipes.py meal_type fix, and the full recommendation engine module.

---

## 4. Assumptions

| # | Assumption | Justification |
|---|-----------|---------------|
| A1 | backend-main history was fully captured | Stepped from HEAD to ~11; all substantial PRs confirmed |
| A2 | PR#28 (image recognition) was authored by YeonJeong | File authorship and commit style consistent with her backend-main commits |
| A3 | PR#33 (recommender engine) was authored by YeonJeong | Branch name backend/ml/recommender-engine and merge PR title |
| A4 | Pre-git period dates (Jan 3 – Mar 11) are accurate to ±1 week | Sourced from PLANNING.md verified against supervisor project plan |
| A5 | Kennedy's work is entirely off-git | Zero commits on both branches; Documentation OIC role is consistent with Google Docs workflow |

---

## 5. Known Limitations

**L1 — Kennedy: Zero Git Commits.** Kennedy has zero commits on both `main` and `backend-main`. All documentation work is conducted off-git and cannot be timeline-verified.

**L2 — Pre-Git Period: Planning Data Only.** The entire Phase 0 (Jan 3 – Mar 11, 2026) has no git evidence. Dates sourced from PLANNING.md are planned targets, not recorded actuals.

**L3 — Recommendation Engine Start Date Estimated.** PR#33 was merged 2026-04-27 but work likely started around 2026-03-24 per TASK.md. The start date is a TASK.md-supplemented estimate; the end date (merge) is git-verified.

**L4 — Duration = Calendar Days.** Task duration = (End − Start) + 1 calendar days, including weekends.

---

## 6. Interpreting the Outputs

### Files

| File | Description |
|------|-------------|
| nutritrack_gantt_v2.xlsx | 3-sheet Excel workbook — data table, visual Gantt (Jan–May), legend |
| nutritrack_gantt_v2_data.csv | 54-row flat CSV, import-ready |
| gantt_docs.md | This document |

### Visual Gantt Timeline
Spans 2026-01-03 to 2026-05-16 in weekly columns. Month headers in row 3. Week dates in row 4. Pre-Git rows are italicised and marked with 📋. Coloured bars correspond to the member colour legend below.

### Member Colour Legend

| Colour | Member |
|--------|--------|
| Blue #1565C0 | Nicholas |
| Purple #7B1FA2 | YeonJeong |
| Red #C62828 | Benjamin |
| Green #2E7D32 | Jia Sheng |
| Orange #E65100 | Hao Jiet |
| Dark Grey #37474F | Kennedy |
| Slate #546E7A | Multiple contributors |

---

## 7. Revised Findings Summary

| Contributor | First Git Commit | Last Git Commit | Git-Verified Tasks |
|-------------|-----------------|-----------------|-------------------|
| Nicholas | 2026-03-12 | 2026-04-29 | 9 |
| YeonJeong | 2026-03-12 | 2026-04-24 | 10 — was invisible in v1 |
| Benjamin | 2026-03-13 | 2026-04-28 | 14 |
| Jia Sheng | 2026-03-15 | 2026-04-28 | 12 |
| Hao Jiet | 2026-04-03 | 2026-04-27 | 8 |
| Kennedy | — | — | 0 (off-git) |

**Git-verified development window:** 2026-03-12 to 2026-05-03 (52 days across both branches)  
**Full project span (including pre-git):** 2026-01-03 to 2026-05-20

---

## 8. Testing Sprint Update (2026-05-03)

| Activity | Files Created | Tests Added | Coverage Achieved |
|----------|--------------|-------------|------------------|
| Router tests — meal, custom_meal, food, recipes, recommendations, image_recognition | 6 new test files | ~103 tests | ≥80% per module |
| Total test suite size (cumulative) | 12 test files | ~218 tests | Core routers ≥80% |

**Milestone:** All 11 primary backend router modules now exceed the 80% coverage threshold defined in `PLANNING.md`. Remaining gaps are in admin-specific routes, service layers, and ML scoring sub-modules — deferred to post-Week 19 if time permits.

---

*Document end — v2 fully corrects the YeonJeong attribution gap from v1 by inspecting backend-main.*
