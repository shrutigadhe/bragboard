import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load environment variables from .env file (DATABASE_URL, etc.)
load_dotenv()

# Read the database connection string from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

# Render/Heroku sometimes provides "postgres://" or "postgresql://" URLs
# Standardize to explicit "postgresql+psycopg2://" so SQLAlchemy uses installed psycopg2 driver
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# If no DATABASE_URL is set in the environment, fall back to local sqlite database
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./sql_app.db"

# Create the SQLAlchemy engine that manages the connection to PostgreSQL
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)


# SessionLocal is a factory for creating new database sessions
# autocommit=False: changes must be committed manually
# autoflush=False: don't flush automatically before queries
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class that all ORM models (User, Brag, Shoutout, etc.) will inherit from
Base = declarative_base()

# Dependency injected into every API route that needs database access
# This function ensures we open/close the DB connection for every request
def get_db():
    db = SessionLocal()
    try:
        # 'yield' makes this a generator — FastAPI injects 'db' into the route,
        # and the code after yield runs when the request is done (cleanup)
        yield db
    finally:
        # Always close the session after the request completes (even on error)
        db.close()


