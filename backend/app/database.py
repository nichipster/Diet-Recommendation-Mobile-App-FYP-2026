from sqlmodel import create_engine, text
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv
import os

load_dotenv()
postgres_url = os.getenv("POSTGRESQL_DATABASE_URL")
if postgres_url is None:
    raise RuntimeError('POSTGRESQL URL environment is not set!')

try:
    engine = create_engine(postgres_url)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version()"))
        print(f"✅ Connected successfully!")
        print(f"PostgreSQL version: {result.scalar()}")
except OperationalError as e:
    print(f"❌ Connection failed: {e}")