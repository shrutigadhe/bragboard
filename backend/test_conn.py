import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

db_url = os.getenv("DATABASE_URL")
print(f"Testing connection to: {db_url}")

if not db_url:
    print("ERROR: DATABASE_URL not found in environment!")
    exit(1)

try:
    engine = create_engine(db_url)
    with engine.connect() as connection:
        result = connection.execute(text("SELECT version();"))
        print(f"SUCCESS: {result.fetchone()[0]}")
except Exception as e:
    print(f"FAILURE: {e}")
