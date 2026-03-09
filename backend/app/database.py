from sqlmodel import create_engine
from dotenv import load_dotenv
import os

load_dotenv()
postgres_url = os.getenv("POSTGRES_DATABASE_URL")
if postgres_url is None:
    raise RuntimeError('POSTGRESQL URL environment is not set!')

engine = create_engine(postgres_url)