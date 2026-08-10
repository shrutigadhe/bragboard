import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

db_url = os.getenv("DATABASE_URL")
if not db_url:
    db_url = "postgresql://postgres:shruti098@localhost:5432/bragboard"

print(f"Connecting to database: {db_url}")

try:
    engine = create_engine(db_url)
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;"))
    print("SUCCESS: Checked/added profile_picture column to users table.")
except Exception as e:
    print(f"FAILURE: {e}")
