import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

db_url = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")
engine = create_engine(db_url)

# Support passing target admin email via command line or env var (defaults to admin@example.com)
target_emails = sys.argv[1] if len(sys.argv) > 1 else os.getenv("ADMIN_EMAILS", os.getenv("ADMIN_EMAIL", "admin@example.com"))
email_list = [e.strip().lower() for e in target_emails.split(",") if e.strip()]

print(f"Setting admin role for emails: {email_list}")

with engine.begin() as conn:
    for email in email_list:
        result = conn.execute(
            text("UPDATE users SET role = 'admin' WHERE LOWER(email) = LOWER(:email)"),
            {"email": email}
        )
        print(f"Updated user with email '{email}' to role 'admin'.")

# Verification
with engine.connect() as conn:
    result = conn.execute(text("SELECT email, role FROM users"))
    print("\nCurrent User Roles:")
    for row in result:
        print(f"  - Email: {row[0]}, Role: {row[1]}")
