from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from .routers import auth
from sqlmodel import SQLModel
from .database import engine
from . import models

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown events. Database tables are created
    on startup rather than at module import time to avoid side effects
    during testing and module-level imports.
    """
    # --- Startup ---
    try:
        SQLModel.metadata.create_all(engine)
    except Exception as e:
        print(f"Database initialisation failed: {e}")
        raise
    yield
    # --- Shutdown (add cleanup here if needed) ---


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