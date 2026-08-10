from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth

# ─────────────────────────────────────────────
# DEPARTMENTS ROUTER
# Handles reading department data and listing colleagues
# Routes: /api/departments/
# ─────────────────────────────────────────────
router = APIRouter(
    prefix="/api/departments",
    tags=["Departments"]
)


# ─────────────────────────────────────────────
# GET /api/departments/
# Returns all departments in the system
# Public endpoint — no authentication required
# Used to populate the department dropdown in the registration form
# ─────────────────────────────────────────────
@router.get("/", response_model=List[schemas.DepartmentResponse])
def get_departments(db: Session = Depends(get_db)):
    departments = db.query(models.Department).all()
    return departments


# ─────────────────────────────────────────────
# GET /api/departments/colleagues
# Returns all other users in the current user's department (excluding themselves)
# Used when creating a shoutout to show who can be tagged from the same department
# Returns empty list if user hasn't joined a department yet
# ─────────────────────────────────────────────
@router.get("/colleagues", response_model=List[schemas.UserResponse])
def get_colleagues(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # If user has no department assigned, return an empty list
    if not current_user.department_id:
        return []

    users = db.query(models.User).filter(
        models.User.department_id == current_user.department_id,
        models.User.id != current_user.id  # Exclude self from the list
    ).all()
    return users
