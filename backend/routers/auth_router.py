from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth
print(f"DEBUG: auth module loaded in router is: {auth}")

# ─────────────────────────────────────────────
# AUTH ROUTER
# Handles all user authentication and profile management
# Routes: /api/register, /api/login, /api/reset-password, /api/me, /api/users
# ─────────────────────────────────────────────
router = APIRouter(
    tags=["Authentication"]
)


# ─────────────────────────────────────────────
# POST /api/register
# Creates a new user account
# Validates: email uniqueness, password length, department existence
# Returns the newly created user (without password)
# ─────────────────────────────────────────────
@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    from sqlalchemy import func
    # Check if a user with this email already exists (case-insensitive)
    db_user = db.query(models.User).filter(func.lower(models.User.email) == user.email.lower()).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate Password Length
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    # Validate Department if provided — make sure it actually exists in the DB
    if user.department_id:
        dept = db.query(models.Department).filter(models.Department.id == user.department_id).first()
        if not dept:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid department ID"
            )

    # Hash the password before saving (never store plain text passwords)
    hashed_password = auth.Hash.make(user.password)

    # Create new user record in the database
    new_user = models.User(
        name=user.name,
        email=user.email,
        password=hashed_password,
        department_id=user.department_id,
        role=user.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)  # Reload from DB so computed fields (e.g., id, joined_at) are populated

    return new_user


# ─────────────────────────────────────────────
# POST /api/login
# Authenticates an existing user and returns a JWT token
# Validates: user existence, password correctness
# Returns: access_token (JWT) and token_type ("bearer")
# ─────────────────────────────────────────────
@router.post("/login", response_model=schemas.Token)
def login(request: schemas.UserLogin, db: Session = Depends(get_db)):
    from sqlalchemy import func
    print(f"DEBUG: Login attempt for email: {request.email}")
    # Check session
    print(f"DEBUG: DB Session: {db}")
    # Look up user by email (case-insensitive)
    user = db.query(models.User).filter(func.lower(models.User.email) == request.email.lower()).first()
    if not user:
        print(f"DEBUG: User not found: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invalid Credentials"
        )

    # Verify that the supplied password matches the stored hash
    if not auth.Hash.verify(request.password, user.password):
        print(f"DEBUG: Password verification failed for: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invalid Credentials"
        )

    # Create a signed JWT token with the user's email as the subject
    access_token = auth.create_access_token(data={"sub": user.email})

    return {"access_token": access_token, "token_type": "bearer"}


# ─────────────────────────────────────────────
# POST /api/reset-password
# Resets a user's password without requiring the old one
# (No email verification step — relies on knowing the account email)
# ─────────────────────────────────────────────
@router.post("/reset-password")
def reset_password(reset_data: schemas.PasswordReset, db: Session = Depends(get_db)):
    from sqlalchemy import func
    # Find the user by email
    user = db.query(models.User).filter(func.lower(models.User.email) == reset_data.email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email not found"
        )

    # Hash the new password before saving
    hashed_password = auth.Hash.make(reset_data.new_password)
    user.password = hashed_password
    db.commit()

    return {"message": "Password reset successfully"}


# ─────────────────────────────────────────────
# GET /api/me
# Returns the currently logged-in user's profile
# Requires a valid Bearer token in the Authorization header
# ─────────────────────────────────────────────
@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# ─────────────────────────────────────────────
# HELPER FUNCTION: count_faces
# Uses OpenCV's Haar Cascade to detect faces in a Base64-encoded image
# Used to ensure profile pictures contain at most one face
# Returns the number of detected faces (or 1 on any error as a safe fallback)
# ─────────────────────────────────────────────
def count_faces(base64_data: str) -> int:
    import base64
    import numpy as np
    import cv2
    import os

    try:
        # Strip data URL prefix if present (e.g., "data:image/jpeg;base64,...")
        if "," in base64_data:
            base64_str = base64_data.split(",")[1]
        else:
            base64_str = base64_data

        # Decode base64 string into raw bytes, then into a NumPy array, then into a CV2 image
        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Failed to decode image from base64 string")

        # Convert to grayscale for face detection (Haar Cascade works on grayscale)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Load the pre-trained Haar Cascade face detection model bundled with OpenCV
        cascade_filename = 'haarcascade_frontalface_default.xml'
        cascade_path = cv2.data.haarcascades + cascade_filename
        if not os.path.exists(cascade_path):
            raise FileNotFoundError(f"Cascade xml not found at {cascade_path}")

        face_cascade = cv2.CascadeClassifier(cascade_path)
        if face_cascade.empty():
            raise ValueError("Failed to load Haar cascade classifier")

        # Detect faces in the image with tuned parameters
        # scaleFactor: how much image is reduced at each scale
        # minNeighbors: how many overlapping detections needed to confirm a face
        # minSize: minimum face size to detect
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        return len(faces)
    except Exception as e:
        print(f"Error in count_faces: {str(e)}")
        # Safe fallback: return 1 to avoid crashing on environment or decode errors
        return 1


# ─────────────────────────────────────────────
# PUT /api/me
# Updates the currently logged-in user's profile
# Can update: name, email, department, and profile picture
# Profile picture is validated to contain at most 1 face using OpenCV
# ─────────────────────────────────────────────
@router.put("/me", response_model=schemas.UserResponse)
def update_user_me(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Update email only if it changed, and check it's not already taken
    if user_update.email and user_update.email != current_user.email:
        existing_user = db.query(models.User).filter(models.User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = user_update.email

    # Update name if provided
    if user_update.name:
        current_user.name = user_update.name

    # Update department if provided and valid
    if user_update.department_id is not None:
        dept = db.query(models.Department).filter(models.Department.id == user_update.department_id).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Invalid department ID")
        current_user.department_id = user_update.department_id

    # Update profile picture
    if user_update.profile_picture is not None:
        if user_update.profile_picture == "":
            # Empty string means remove the profile picture
             current_user.profile_picture = None
        else:
             # Run face detection — reject if more than 1 face is detected
             num_faces = count_faces(user_update.profile_picture)
             if num_faces > 1:
                 raise HTTPException(
                     status_code=status.HTTP_400_BAD_REQUEST,
                     detail=f"Multiple faces detected ({num_faces} faces). Profile picture must contain at most one face."
                 )
             current_user.profile_picture = user_update.profile_picture

    # Commit changes and refresh to return the updated user
    db.commit()
    db.refresh(current_user)
    return current_user


# ─────────────────────────────────────────────
# GET /api/users
# Returns a list of all users (public — no auth required)
# Used mainly for populating recipient dropdowns when sending shoutouts
# ─────────────────────────────────────────────
@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()
