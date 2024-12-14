from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

POSTGRES_URL = os.getenv(
    "DATABASE_URL",
    "postgres://user_owlvgcjqxh:71oPbRrFTcy9pPOu1LCL@devinapps-backend-prod.cluster-clussqewa0rh.us-west-2.rds.amazonaws.com/db_uxbpisocoz?sslmode=require"
)

engine = create_engine(POSTGRES_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
