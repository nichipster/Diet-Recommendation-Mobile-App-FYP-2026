from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from .routers import auth, user_profile, account, user, user_preferences, dietary_goal, meal, food, recommendations, recipes, image_recognition, admin_stats, admin_users, admin, support_ticket, subscriptions, admin_food_database, custom_meal, notifications, nutritionists, bookings, clients, analyses, content, chats, admin_performance, admin_integrations, admin_export
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
app.include_router(admin.router)
app.include_router(support_ticket.router)
app.include_router(subscriptions.router)
app.include_router(admin_food_database.router)
app.include_router(custom_meal.router)
app.include_router(notifications.router)
app.include_router(nutritionists.router)
app.include_router(bookings.router)
app.include_router(clients.router)
app.include_router(analyses.router)
app.include_router(content.router)
app.include_router(chats.router)
app.include_router(admin_performance.router)
app.include_router(admin_integrations.router)
app.include_router(admin_export.router)
