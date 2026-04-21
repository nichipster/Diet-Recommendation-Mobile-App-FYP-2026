from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from .routers import auth, user_profile, account, user, user_preferences, dietary_goal, meal, food, recommendations, recipes, image_recognition, admin_stats, admin_users
from sqlmodel import SQLModel
from .database import engine
from . import models

@asynccontextmanager
async def lifespan(app: FastAPI):

#    try:
#        SQLModel.metadata.create_all(engine)
#    except Exception as e:
#        print(f"Database initialisation failed: {e}")
#        raise
    yield

app = FastAPI(lifespan=lifespan)

@app.get('/', status_code=status.HTTP_200_OK) # purely for testing
def read_root():
    return {"Hello": "World"}

@app.get('/health', status_code=status.HTTP_200_OK)
def health_check():
    return {
        'status': 'healthy',
        'service': 'NutriTrack Mobile App'
    }

# routers
app.include_router(auth.router)
app.include_router(user_profile.router)
app.include_router(account.router)
app.include_router(user.router)
app.include_router(user_preferences.router)
app.include_router(dietary_goal.router)
app.include_router(meal.router)
app.include_router(food.router)
app.include_router(recommendations.router)
app.include_router(recipes.router)
app.include_router(image_recognition.router)
app.include_router(admin_stats.router)
app.include_router(admin_users.router)
