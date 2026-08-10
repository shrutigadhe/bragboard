import sys
import os
import json
from datetime import datetime

# Set up path to import backend modules
sys.path.append(os.path.abspath("backend"))

from database import SessionLocal
import models
import schemas

db = SessionLocal()
try:
    print("--- API Simulation ---")
    target_type = "brag"
    target_id = 61 # From diag output
    
    from sqlalchemy.orm import joinedload
    comments = db.query(models.Comment).options(joinedload(models.Comment.user)).filter(
        models.Comment.target_id == target_id,
        models.Comment.target_type == target_type
    ).all()
    
    print(f"Found {len(comments)} comments for {target_type}:{target_id}")
    
    for c in comments:
        # Check if user is loaded
        print(f"Comment ID {c.id}: content='{c.content[:20]}', user_id={c.user_id}")
        if c.user:
            print(f"  User loaded: {c.user.name} (ID: {c.user.id})")
        else:
            print(f"  ERROR: User NOT loaded for comment {c.id}")
            
        # Try to serialize
        try:
            resp = schemas.CommentResponse.from_orm(c)
            # print(f"  Serialized: {resp.json()}")
        except Exception as e:
            print(f"  Serialization Error: {e}")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
