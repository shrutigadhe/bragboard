import sys
import os

# Set up path to import backend modules
sys.path.append(os.path.abspath("backend"))

from database import SessionLocal
import models

db = SessionLocal()
try:
    print("--- Database Diagnostics ---")
    
    # Check Users
    user_count = db.query(models.User).count()
    print(f"Total Users: {user_count}")
    
    # Check Brags
    brag_count = db.query(models.Brag).count()
    print(f"Total Brags: {brag_count}")
    
    # Check Shoutouts
    shoutout_count = db.query(models.Shoutout).count()
    print(f"Total Shoutouts: {shoutout_count}")
    
    # Check Comments
    comments = db.query(models.Comment).all()
    print(f"Total Comments: {len(comments)}")
    for c in comments:
        print(f"ID: {c.id}, User: {c.user_id}, Target: {c.target_type}:{c.target_id}, Content: {c.content[:20]}...")
        # Check if user exists for the comment
        user = db.query(models.User).filter(models.User.id == c.user_id).first()
        if not user:
            print(f"  WARNING: User {c.user_id} not found!")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
