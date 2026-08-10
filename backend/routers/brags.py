from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
import models, schemas, auth
from .utils import get_reaction_summary, check_has_reported

# ─────────────────────────────────────────────
# BRAGS ROUTER
# Handles all CRUD operations for "Brag" posts
# Routes: /api/brags/
# ─────────────────────────────────────────────
router = APIRouter(
    prefix="/api/brags",
    tags=["Brags"]
)

import json


# ─────────────────────────────────────────────
# HELPER: parse_brag_media
# Converts the stored JSON string for image_url and video_url back into Python lists
# This is needed because SQLite/Postgres stores them as JSON strings but the API expects lists
# Handles old data that might just be a plain string (backwards compatibility)
# ─────────────────────────────────────────────
def parse_brag_media(brag):
    """Helper to parse JSON media strings back to lists."""
    if brag.image_url:
        try:
            brag.image_url = json.loads(brag.image_url)
        except:
             # Backward compatibility: treat as single string in list
             brag.image_url = [brag.image_url] if brag.image_url else []
    else:
        brag.image_url = []

    if brag.video_url:
        try:
            brag.video_url = json.loads(brag.video_url)
        except:
             brag.video_url = [brag.video_url] if brag.video_url else []
    else:
        brag.video_url = []
    return brag


# ─────────────────────────────────────────────
# POST /api/brags/
# Creates a new brag post for the currently logged-in user
# User must belong to a department to post
# Also sends notifications to: the poster (self) and all department colleagues
# Mentions (@Name) in content trigger a "mentioned you" notification
# ─────────────────────────────────────────────
@router.post("/", response_model=schemas.BragResponse)
def create_brag(
    brag: schemas.BragCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Enforce that user must be in a department to post (department context is required)
    if not current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a department to post a brag."
        )

    try:
        # Create brag — serialize image/video lists to JSON strings for DB storage
        new_brag = models.Brag(
            title=brag.title,
            content=brag.content,
            image_url=json.dumps(brag.image_url) if brag.image_url else None,
            video_url=json.dumps(brag.video_url) if brag.video_url else None,
            tags=brag.tags,
            user_id=current_user.id,
            department_id=current_user.department_id
        )
        db.add(new_brag)
        db.commit()
        db.refresh(new_brag)

        # Notify the poster themselves (confirmation notification)
        self_notification = models.Notification(
            user_id=current_user.id,
            message="You posted a brag!",
            type="brag",
            source_id=new_brag.id
        )
        db.add(self_notification)

        # Notify all other users in the same department about the new brag
        colleagues = db.query(models.User).filter(
            models.User.department_id == current_user.department_id,
            models.User.id != current_user.id  # Exclude the author themselves
        ).all()

        # Parse @mentions from the brag content (e.g., "@John" -> "John")
        import re
        mentioned_names = re.findall(r'@(\w+)', new_brag.content)

        for col in colleagues:
            message = f"{current_user.name} shared a new brag!"
            # If this colleague is @mentioned in the content, give them a specific notification
            if col.name in mentioned_names:
                message = f"{current_user.name} mentioned you in a brag!"

            col_notification = models.Notification(
                user_id=col.id,
                message=message,
                type="brag",
                source_id=new_brag.id
            )
            db.add(col_notification)

        db.commit()

        # Parse the stored JSON media back to lists for the API response
        res_brag = parse_brag_media(new_brag)
        # Attach reaction summary and report status to the response
        res_brag.reactions = get_reaction_summary(res_brag.id, "brag", db, current_user.id)
        res_brag.has_reported = check_has_reported(res_brag.id, "brag", db, current_user.id)
        return res_brag
    except Exception as e:
        db.rollback()  # Undo any partial DB changes if anything fails
        print(f"Error creating post: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


# ─────────────────────────────────────────────
# GET /api/brags/department
# Fetches all brags belonging to the current user's department
# Returns them in reverse chronological order (newest first)
# Returns empty list if user has no department
# ─────────────────────────────────────────────
@router.get("/department", response_model=List[schemas.BragResponse])
def get_department_brags(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user.department_id:
        return []  # No department means no brags to show

    # Eagerly load user relationship to avoid N+1 queries when accessing author info
    brags = db.query(models.Brag).options(
        joinedload(models.Brag.user)
    ).filter(models.Brag.department_id == current_user.department_id).order_by(models.Brag.created_at.desc()).all()

    # Parse JSON media and attach reaction/report data to each brag
    res_brags = [parse_brag_media(b) for b in brags]
    for b in res_brags:
        b.reactions = get_reaction_summary(b.id, "brag", db, current_user.id)
        b.has_reported = check_has_reported(b.id, "brag", db, current_user.id)

    return res_brags


# ─────────────────────────────────────────────
# GET /api/brags/my-brags
# Fetches only the brags posted by the currently logged-in user
# Used on the Profile page to show the user's own posts
# ─────────────────────────────────────────────
@router.get("/my-brags", response_model=List[schemas.BragResponse])
def get_my_brags(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    brags = db.query(models.Brag).filter(models.Brag.user_id == current_user.id).all()
    res_brags = [parse_brag_media(b) for b in brags]
    for b in res_brags:
        b.reactions = get_reaction_summary(b.id, "brag", db, current_user.id)
        b.has_reported = check_has_reported(b.id, "brag", db, current_user.id)
    return res_brags


# ─────────────────────────────────────────────
# DELETE /api/brags/{brag_id}
# Deletes a specific brag by ID
# Only the brag's author OR an admin can delete it
# Returns 204 No Content on success
# ─────────────────────────────────────────────
@router.delete("/{brag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brag(
    brag_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    brag = db.query(models.Brag).filter(models.Brag.id == brag_id).first()

    if not brag:
        raise HTTPException(status_code=404, detail="Brag not found")

    # Authorization check — only the author or an admin may delete
    if brag.user_id != current_user.id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this brag")

    db.delete(brag)
    db.commit()
    return None


# ─────────────────────────────────────────────
# PUT /api/brags/{brag_id}
# Updates an existing brag's content
# Only the brag's original author can edit it (no admin override for edits)
# ─────────────────────────────────────────────
@router.put("/{brag_id}", response_model=schemas.BragResponse)
def update_brag(
    brag_id: int,
    brag_update: schemas.BragCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    brag = db.query(models.Brag).filter(models.Brag.id == brag_id).first()

    if not brag:
        raise HTTPException(status_code=404, detail="Brag not found")

    # Only the original author can edit their brag
    if brag.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this brag")

    # Update fields with new values
    brag.title = brag_update.title
    brag.content = brag_update.content
    brag.image_url = json.dumps(brag_update.image_url) if brag_update.image_url else None
    brag.video_url = json.dumps(brag_update.video_url) if brag_update.video_url else None
    brag.tags = brag_update.tags

    db.commit()
    db.refresh(brag)

    # Return the updated brag with parsed media and reaction info
    res_brag = parse_brag_media(brag)
    res_brag.reactions = get_reaction_summary(res_brag.id, "brag", db, current_user.id)
    res_brag.has_reported = check_has_reported(res_brag.id, "brag", db, current_user.id)
    return res_brag


# ─────────────────────────────────────────────
# POST /api/brags/{brag_id}/report
# Allows a logged-in user to report a specific brag for inappropriate content
# The report is saved and visible to admins in the admin dashboard
# ─────────────────────────────────────────────
@router.post("/{brag_id}/report", response_model=schemas.ReportResponse)
def report_brag(
    brag_id: int,
    report_data: schemas.ReportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify the brag being reported actually exists
    brag = db.query(models.Brag).filter(models.Brag.id == brag_id).first()
    if not brag:
        raise HTTPException(status_code=404, detail="Brag not found")

    # Create the report record
    new_report = models.Report(
        reporter_id=current_user.id,
        target_id=brag_id,
        target_type="brag",
        reason=report_data.reason
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report
