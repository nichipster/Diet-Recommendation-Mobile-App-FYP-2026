from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime
from zoneinfo import ZoneInfo
from enum import Enum

class UserRole(str, Enum):
    admin = 'admin'
    freemium = 'freemium'
    premium = 'premium'

class User(SQLModel, table=True):
    user_id : str = Field(primary_key=True)
    first_name : str 
    last_name : str
    phone_number : Optional[str] = None
    hashed_password : str
    created_at : datetime = Field(default_factory=lambda: datetime.now(ZoneInfo('Asia/Singapore')))
    role : UserRole
    premium_start : Optional[datetime] = None
    premium_end : Optional[datetime] = None
    suspended : bool = False