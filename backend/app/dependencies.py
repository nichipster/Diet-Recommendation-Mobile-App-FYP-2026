from .database import engine
from sqlmodel import Session
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError, ExpiredSignatureError
from dotenv import load_dotenv
import os 

def get_db():
    with Session(engine) as db:
        yield db

# database dependency
db_dependency = Annotated[Session, Depends(get_db)]