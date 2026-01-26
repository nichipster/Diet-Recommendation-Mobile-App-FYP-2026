# NutriTrack - Diet and Nutrition Mobile Application

## Project Overview

**Project Group:** FYP-26-S1-04  
**Supervisor:** Sionggo Japit (sjapit@uow.edu.au)  
**Assessor:** Mr. Premarajan  
**Timeline:** 20 weeks (January 3, 2026 - May 20, 2026)

NutriTrack is a comprehensive mobile application designed to help users develop healthy dietary habits and track their nutritional progress. The application provides personalized meal recommendations, calorie tracking, and dietary insights.

### Project Goals
1. Help users develop healthy dietary habits
2. Track nutritional progress over time
3. Provide personalized meal recommendations based on user goals
4. Enable calorie tracking and dietary reporting
5. Implement advanced features like image recognition (if time permits)

### Academic Requirements
This is a Final Year Project (FYP) with strict academic deliverables and milestones as defined in the Supervisor Project Plan. All development must align with both technical objectives and academic assessment requirements.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile Application                       │
│                          (React Native)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway                             │
│                          (FastAPI)                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Auth Service │  │ User Service │  │ Meal Service         │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │Recipe Service│  │ Diary Service│  │ Recommendation Engine│   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ML Image Recognition Module                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  PostgreSQL  │  │    Redis     │  │   External APIs      │   │
│  │  (Primary DB)│  │   (Cache)    │  │  (Recipe APIs, etc.) │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Structure (FastAPI + Python)

```
backend/
├── app/
│   ├── api/endpoints/    # API route handlers
│   ├── core/                # Configuration, security, settings
│   ├── db/                  # Database connection, session management
│   │   └── models/          # SQLAlchemy/SQLModel ORM models
│   ├── dependencies/        # FastAPI dependencies (auth, etc.)
│   ├── middleware/          # Custom middleware (logging, CORS, etc.)
│   ├── ml/                  # Machine learning modules
│   │   ├── image_recognition/   # Food image recognition
│   │   └── recommendation_engine/   # Meal recommendation system
│   ├── schemas/             # Pydantic schemas for validation
│   ├── services/            # Business logic layer
│   └── utils/               # Utility functions and helpers
├── tests/                   # Test suite mirroring app structure
└── alembic/                 # Database migrations
```

### Mobile Structure (React Native / Flutter)

```
mobile/
├── assets/                  # Static assets
│   ├── fonts/
│   └── images/
├── src/
│   ├── components/          # Reusable UI components
│   ├── navigation/          # Navigation configuration
│   ├── screens/             # Screen components
│   ├── services/            # API services
│   ├── store/               # State management
│   ├── hooks/               # Custom hooks
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
└── __tests__/               # Mobile tests
```

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ORM**: SQLAlchemy / SQLModel
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: JWT with OAuth2
- **ML Framework**: TensorFlow / PyTorch (for image recognition)
- **Task Queue**: Celery (for async tasks)

### Mobile
- **Framework**: React Native 
- **State Management**: Redux Toolkit 
- **Navigation**: React Navigation 

### External APIs
- Recipe API (Spoonacular / Edamam)
- Nutrition Database API


## Code Style Guidelines

### Python (Backend)
- Follow PEP 8 standards
- Use type hints for all functions
- Format with `black` (line length: 88)
- Lint with `flake8` and `mypy`
- Use Google-style docstrings

### TypeScript/Dart (Mobile)
- Use ESLint/Dart analyzer
- Prefer functional components
- Use strict TypeScript settings

## Security Considerations

1. **Authentication**: JWT tokens with refresh mechanism
2. **Authorization**: Role-based access control (RBAC)
3. **Data Encryption**: AES-256 for sensitive data at rest
4. **HTTPS**: Enforce TLS 1.3 for all communications
5. **Input Validation**: Pydantic schemas for all inputs
6. **PDPA Compliance**: User data privacy and consent management


## Database Schema Overview

### Core Tables (TBD)
- `users`: User accounts and profiles
- `dietary_goals`: User-defined dietary targets
- `meals`: Meal records and categorization
- `recipes`: Recipe storage (custom and API-sourced)
- `calorie_logs`: Daily calorie intake records
- `diary_entries`: User diet diary
- `food_items`: Food database with nutritional info


## Performance Goals

TBD

## Project Timeline & Milestones

The project follows a strict 20-week timeline with critical academic deliverables:

### Term 1 (Weeks 1-11): Research, Design, and Prototype
- **Week 1 (Jan 3):** Project briefing
- **Week 2 (Jan 17):** Team formation and planning
- **Week 3 (Jan 24):** Literature review, research, and website setup
- **Week 4-5 (Jan 31):** ⚠️ **DELIVERABLE:** Requirements Specification
- **Week 6-7 (Feb 14):** Analysis and design phase
- **Week 8 (Feb 21):** Examination week break
- **Week 9-11 (Mar 21):** ⚠️ **CRITICAL DELIVERABLE:** 
  - Working Prototype (30% functional)
  - Preliminary Technical Report
  - Project Progress Report
  - Presentation Slides
  - Prototype Demonstration (mandatory attendance)

### Term 2 (Weeks 12-20): Implementation, Testing, and Final Submission
- **Week 12-17 (Apr 25):** Full implementation (remaining 70%)
- **Week 18-19 (May 9):** ⚠️ **FINAL DELIVERABLE:**
  - Final Technical Documentation
  - Final User Manual
  - Source Code & Executable
  - Video Recording of all functionalities
  - Individual Reflective Diary
  - Peer Assessment Form
- **Week 20 (May 16):** ⚠️ **Final Presentation** (mandatory attendance)
- **Week 20 (May 20):** Email submission to assessors and university

### Critical Notes
- **Prototype (Week 11):** Must have 30% working functionality, remaining 70% can be simulated
- **Late Penalties:** 25% deduction per day for Requirements Specification
- **Mandatory Attendance:** Week 11 demo and Week 20 presentation - no mark if absent
- **Supervisor Sign-off:** Required on all documentation before Week 19 submission

## Prototype Scope (Week 11 - 30% Working Functionality)

### Working Features (Functional Logic Required)
1. **User Authentication**
   - Registration with email validation
   - Login with JWT token generation
   - Password hashing and security

2. **User Profile Management**
   - Create and update user profile
   - Store demographic information
   - Profile data persistence

3. **Dietary Goal Definition**
   - Set daily calorie targets
   - Input and validate dietary goals
   - Goal modification

4. **Basic Meal Recommendation**
   - Simple recommendation algorithm (calorie-based)
   - Generate meal suggestions
   - Display recommendations

5. **Calorie Intake Logging**
   - Manual calorie entry per meal
   - Daily calorie calculation
   - Logging data persistence

6. **Basic Diet Diary**
   - View daily entries
   - Simple diary data structure
   - Date-based retrieval

### Simulated Features (UI Only, No Backend Logic)
1. Recipe API integration (mock data)
2. Custom recipe entry (UI screens only)
3. Reporting and visualization (placeholder charts)
4. Image recognition (navigation only)
5. Advanced ML features (concept demonstration)

**Rationale:** This 30%/70% split allows us to demonstrate all planned features while focusing development effort on core functionality for the prototype assessment.

## Final Product Scope (Week 19 - 100% Functionality)

All features from the project description must be implemented:

### Core Features (Priority ⭐⭐⭐ - Must Have)
1. User Profile Management
2. Dietary Goal Definition
3. Meal Recommendation Generation
4. Meal Categorization (breakfast, lunch, dinner, snacks)
5. Calorie Intake Logging
6. Recipe Retrieval via External API
7. Custom Recipe Entry
8. Diet Diary Management
9. Dietary Reporting (daily/monthly)
10. Data Visualization (charts/graphs)

### Advanced Features (Priority ⭐⭐/⭐ - High/Medium)
1. Diet Progress Tracking (⭐⭐)
2. Progress Feedback Generation (⭐⭐)
3. Dietary Preferences/Restrictions Support (⭐⭐)
4. Adaptive Recommendations (⭐⭐)
5. Image-Based Meal Recognition (⭐ - if time permits)
6. Automated Calorie Estimation from Images (⭐ - if time permits)
7. AI Dietary Consultation Chat (⭐ - if time permits)

## Testing Strategy

### Unit Testing (Continuous - Weeks 9-19)
- **Framework:** Pytest for backend, Jest/React Testing Library for mobile
- **Coverage Target:** Minimum 80% code coverage
- **Scope:** All business logic, API endpoints, utility functions
- **Frequency:** Write tests before or immediately after implementing features
- **Requirements:** 
  - At least 1 test for expected behavior
  - At least 1 edge case test
  - At least 1 failure case test

### Integration Testing (Weeks 12-19)
- **Scope:** Test interactions between modules
- **Focus Areas:**
  - API endpoint integration
  - Database operations
  - External API calls (recipe services)
  - Authentication flow
- **Tools:** Pytest with test database, Postman/Thunder Client for API testing

### System Testing (Weeks 18-19)
- **End-to-End Testing:** Complete user workflows
- **Performance Testing:** Response times, load handling
- **Security Testing:** Authentication, authorization, data protection
- **Usability Testing:** Sample users test the mobile app
- **Compatibility Testing:** iOS and Android testing

### Test Documentation
- Test cases documented in `/tests` directory
- Test logs maintained for Week 19 submission
- Bug tracking and resolution documented

## Documentation Requirements

All documentation follows academic standards and must be maintained throughout the project.

### Continuous Documentation
1. **Individual Project Diary** (Each member, weekly)
   - Personal reflections on work done
   - Challenges faced and solutions
   - Learning outcomes
   - Time spent on tasks

2. **Project Progress Report** (Team, weekly)
   - Work accomplished in preceding period(s)
   - Work currently being performed
   - Work planned for next period(s)
   - Issues and blockers

3. **Code Documentation** (Continuous)
   - Docstrings for all functions (Google style)
   - README files for each module
   - API documentation (auto-generated from FastAPI)

### Milestone Documentation

#### Week 5: Requirements Specification
- Purpose and project overview
- Research and analysis outcomes
- Functional requirements
- Non-functional requirements
- System features
- Security requirements (PDPA compliance)
- Work Breakdown Structure (WBS)
- Gantt Chart

#### Week 11: Preliminary Technical Report
- Title Page (project title, members, supervisor, assessor, date)
- Abstract (brief summary)
- Introduction (background, problem statement, objectives, scope, solution overview)
- Literature Review (existing solutions, technologies, gaps)
- Methodology (tools, development approach, architecture)
- Functional Requirements (user stories, use cases, diagrams)
- Test Strategy
- Implementation (UI designs, module descriptions, activity diagrams, sequence diagrams)
- Results and Discussion (functionality, test results, comparison with objectives)
- Conclusion (summary, contributions, limitations)
- References (APA/IEEE/Harvard format)
- Appendices (supporting materials)

#### Week 19: Final Technical Documentation
- Same structure as Week 11 but with complete, final content
- All diagrams updated to reflect final implementation
- Complete test results
- Final performance metrics

#### Week 19: User Manual
- Introduction to the application
- Installation guide (step-by-step)
- Feature walkthrough with screenshots
- Troubleshooting guide
- FAQ section
- Contact information

#### Week 19: Other Deliverables
- Source code (well-commented, organized)
- Executable/APK files
- Video recording of all implemented functionalities
- Peer Assessment Contribution Form

### Documentation Storage
- All documentation stored in `/docs` directory
- Version control using Git
- Supervisor sign-off required before final submission

## Development Workflow

### Version Control
- **Git Branching Strategy:**
  - `main`: Production-ready code
  - `develop`: Integration branch
  - `feature/*`: Individual feature branches
  - `bugfix/*`: Bug fix branches
- **Commit Messages:** Follow conventional commits format
- **Pull Requests:** Required for merging to develop/main
- **Code Reviews:** At least one team member review required

### Continuous Integration/Continuous Deployment (CI/CD)
- Automated testing on pull requests
- Code quality checks (linting, type checking)
- Automated deployment to staging environment

### Team Collaboration
- **Daily Stand-ups:** Quick sync on progress and blockers (15 min)
- **Weekly Meetings:** Detailed planning and review sessions
- **Communication:** Telegram/WhatsApp for quick updates, email for formal communication
- **Task Tracking:** Use TASK.md for all task management
- **Code Sharing:** GitHub/GitLab repository

## Risk Management

### Identified Risks
1. **External API Rate Limits**
   - Impact: High | Probability: Medium
   - Mitigation: Implement caching, consider multiple API providers

2. **ML Training Time**
   - Impact: High | Probability: Medium
   - Mitigation: Use pre-trained models, allocate buffer time

3. **Mobile Platform Compatibility**
   - Impact: Medium | Probability: Medium
   - Mitigation: Test early on both iOS and Android

4. **Team Member Unavailability**
   - Impact: High | Probability: Medium
   - Mitigation: Document code thoroughly, cross-train team members

5. **Scope Creep**
   - Impact: High | Probability: Medium
   - Mitigation: Strict prioritization (⭐⭐⭐ → ⭐⭐ → ⭐), defer ⭐/😴 if needed

6. **Database Performance**
   - Impact: Medium | Probability: Low
   - Mitigation: Query optimization, implement pagination

### Quality Assurance

#### Code Quality Standards
- All code must pass linting (flake8, mypy for Python; ESLint for JS/TS)
- Minimum 80% test coverage
- No critical security vulnerabilities
- All functions must have docstrings
- Type hints required for all Python functions

#### Review Process
- Peer code reviews for all pull requests
- Regular architecture reviews with supervisor
- Weekly progress reviews with team

#### Definition of Done
A feature is considered complete when:
1. Code is written and follows style guidelines
2. Unit tests written and passing (min 80% coverage)
3. Integration tests passing (where applicable)
4. Documentation updated (code comments, README, API docs)
5. Code reviewed and approved by at least one team member
6. Deployed to staging environment and tested
7. Feature demonstrated to team and supervisor (if milestone feature)
