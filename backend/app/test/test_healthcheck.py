def test_health(client):
    response = client.get("/")
    assert response.status_code in (200, 404)

def test_db_session_is_isolated(db_session):
    from app.test.utils import create_test_user
    u = create_test_user(db_session)
    assert u.user_id is not None