from datetime import timedelta
from typing import Optional

from sqlmodel import Session
from jose import jwt

from app.models import user, UserRole
from app.routers.auth import create_jwt, bcrypt_context 


def create_test_user(
    session: Session,
    *,
    email: str = "test@nutritrack.com",
    first_name: str = "Test",
    last_name: str = "User",
    role: UserRole = UserRole.freemium,
    hashed_password: str = bcrypt_context.hash('testpassword'),  
) -> user:

    db_user = user(
        first_name=first_name,
        last_name=last_name,
        email=email,
        hashed_password=hashed_password,
        role=role,
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_auth_headers(
    user_id=1,
    email='test@nutritrack.com',
    role: UserRole = UserRole.freemium,
    delta: timedelta = timedelta(minutes=5),
) -> dict[str, str]:
    token = create_jwt(
        id=str(user_id),
        username=email,
        role=role,
        expires_delta=delta,
    )
    return {"Authorization": f"Bearer {token}"}