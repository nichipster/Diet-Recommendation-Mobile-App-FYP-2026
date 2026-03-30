"""
conftest.py — shared pytest fixtures for NutriTrack backend tests.
"""

import os
import pytest

from dotenv import load_dotenv
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import event

load_dotenv()

# ---------------------------------------------------------------------------
# Test engine — points exclusively to NutriTrackTest
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
if TEST_DATABASE_URL is None:
    raise RuntimeError("TEST_DATABASE_URL is not set in .env")

test_engine = create_engine(TEST_DATABASE_URL, echo=False)


# ---------------------------------------------------------------------------
# Schema — created once per session, dropped at the end
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def create_test_tables():
    import app.models  # noqa: F401 — registers all SQLModel tables
    SQLModel.metadata.create_all(test_engine)
    yield
    SQLModel.metadata.drop_all(test_engine)


# ---------------------------------------------------------------------------
# Per-test session with savepoint rollback
# ---------------------------------------------------------------------------

@pytest.fixture()
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, transaction):
        nonlocal nested
        if not nested.is_active:
            nested = connection.begin_nested()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


# ---------------------------------------------------------------------------
# TestClient with dependency override + lifespan disabled
# ---------------------------------------------------------------------------

@pytest.fixture()
def client(db_session: Session):
    """
    TestClient that:
    1. Replaces get_db with the test session (hits NutriTrackTest only)
    2. Disables the lifespan so create_all(production_engine) never runs
    """
    from app.main import app
    from app.dependencies import get_db

    def override_get_db():
        yield db_session  # every route handler receives this session

    app.dependency_overrides[get_db] = override_get_db

    # Reason: lifespan=False prevents the startup event from calling
    # create_all(engine) against the production database during tests.
    with TestClient(app, raise_server_exceptions=True) as test_client:
        yield test_client

    app.dependency_overrides.clear()  # clean up so other tests are unaffected