import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

engine = create_engine(os.getenv("DATABASE_URL"))

with engine.begin() as conn:
    # Reset all to employee
    conn.execute(text("UPDATE users SET role = 'employee'"))
    # Set specified admin
    conn.execute(text("UPDATE users SET role = 'admin' WHERE email = 'shruti@example.com'"))
    print("User roles updated. shruti@example.com is now the only admin.")

# Verification
with engine.connect() as conn:
    result = conn.execute(text("SELECT email, role FROM users"))
    print("\nCurrent user roles:")
    for row in result:
        print(f"Email: {row[0]}, Role: {row[1]}")
