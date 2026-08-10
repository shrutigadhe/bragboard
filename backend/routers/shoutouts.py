from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from database import get_db
import models, schemas, auth
from typing import List, Optional
from .utils import get_reaction_summary, check_has_reported
from sqlalchemy import func

# ─────────────────────────────────────────────
# SHOUTOUTS ROUTER
# Handles all CRUD operations for "Shoutout" posts
# A shoutout is a public appreciation message from one user to one or more others
# Routes: /api/shoutouts/
# ─────────────────────────────────────────────
router = APIRouter(
    prefix="/api/shoutouts",
    tags=["shoutouts"]
)


# ─────────────────────────────────────────────
# POST /api/shoutouts/
# Creates a new shoutout from the current user to one or more recipients
# Sends individual notifications to each recipient and a self-confirmation notification
# ─────────────────────────────────────────────
@router.post("/", response_model=schemas.ShoutoutResponse)
def create_shoutout(
    shoutout: schemas.ShoutoutCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Validate all recipient IDs exist in the database
    recipients = db.query(models.User).filter(models.User.id.in_(shoutout.recipient_ids)).all()
    if len(recipients) != len(shoutout.recipient_ids):
        raise HTTPException(status_code=404, detail="One or more recipients not found")

    # Prepare a comma-separated display string of recipient names (for quick UI rendering)
    recipient_usernames = ", ".join([r.name for r in recipients])

    # Create the shoutout record in the database
    new_shoutout = models.Shoutout(
        message=shoutout.message,
        sender_id=current_user.id,
        sender_username=current_user.name,       # Denormalized for quick display
        recipient_usernames=recipient_usernames,  # Denormalized for quick display
        image_url=shoutout.image_url
    )
    new_shoutout.recipients = recipients  # Set many-to-many relationship in the join table

    db.add(new_shoutout)
    db.commit()
    db.refresh(new_shoutout)

    # Send individual notification to each recipient that they received a shoutout
    for recipient in recipients:
        notification = models.Notification(
            user_id=recipient.id,
            message=f"{current_user.name} gave you a shout-out!",
            type="shoutout",
            source_id=new_shoutout.id
        )
        db.add(notification)

    # Send a confirmation notification to the sender themselves
    self_notification = models.Notification(
        user_id=current_user.id,
        message="You shared a shout-out!",
        type="shoutout",
        source_id=new_shoutout.id
    )
    db.add(self_notification)

    db.commit()

    # Attach reaction and report data to the returned shoutout object
    new_shoutout.reactions = get_reaction_summary(new_shoutout.id, "shoutout", db, current_user.id)
    new_shoutout.comment_count = 0  # New shoutout has 0 comments
    new_shoutout.has_reported = check_has_reported(new_shoutout.id, "shoutout", db, current_user.id)
    return new_shoutout


# ─────────────────────────────────────────────
# GET /api/shoutouts/
# Fetches a list of all shoutouts with optional filters
# Query params:
#   - department_id: filter by sender's department
#   - user_id: filter by sender's user ID
#   - date: filter by date (YYYY-MM-DD format)
# Auth is optional — if logged in, user_reactions will be populated
# ─────────────────────────────────────────────
@router.get("/", response_model=List[schemas.ShoutoutResponse])
def get_shoutouts(
    department_id: int = None,
    user_id: int = None,
    date: str = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)  # Optional auth
):
    # Start with a base query that eagerly loads sender and recipients (avoids N+1 queries)
    query = db.query(models.Shoutout).options(
        joinedload(models.Shoutout.sender),
        joinedload(models.Shoutout.recipients)
    )

    # Filter by department: join with User table and match sender's department
    if department_id:
        query = query.join(models.User, models.Shoutout.sender_id == models.User.id)\
                     .filter(models.User.department_id == department_id)

    # Filter by a specific sender user ID
    if user_id:
        query = query.filter(models.Shoutout.sender_id == user_id)

    # Filter by date — assumes date is a string in YYYY-MM-DD format
    if date:
        query = query.filter(func.date(models.Shoutout.created_at) == date)

    # Return newest first
    shoutouts = query.order_by(models.Shoutout.created_at.desc()).all()

    # Attach reactions, comment count, and report status to each shoutout
    for s in shoutouts:
        # If user is logged in, show their reactions; if not, pass 0 as user_id (no reactions shown)
        s.reactions = get_reaction_summary(s.id, "shoutout", db, current_user.id if current_user else 0)
        s.comment_count = db.query(models.Comment).filter(
            models.Comment.target_id == s.id,
            models.Comment.target_type == "shoutout"
        ).count()
        s.has_reported = check_has_reported(s.id, "shoutout", db, current_user.id if current_user else 0)

    return shoutouts


# ─────────────────────────────────────────────
# GET /api/shoutouts/me
# Returns all shoutouts where the current user is either the sender OR a recipient
# Used on the Profile page to show "shoutouts involving me"
# ─────────────────────────────────────────────
@router.get("/me", response_model=List[schemas.ShoutoutResponse])
def get_my_shoutouts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    shoutouts = db.query(models.Shoutout).options(
        joinedload(models.Shoutout.sender),
        joinedload(models.Shoutout.recipients)
    ).filter(
        # Filter: user is sender OR user is in the recipients list
        (models.Shoutout.sender_id == current_user.id) |
        (models.Shoutout.recipients.any(id=current_user.id))
    ).order_by(models.Shoutout.created_at.desc()).all()

    # Attach reactions, comment count, and report status
    for s in shoutouts:
        s.reactions = get_reaction_summary(s.id, "shoutout", db, current_user.id)
        s.comment_count = db.query(models.Comment).filter(
            models.Comment.target_id == s.id,
            models.Comment.target_type == "shoutout"
        ).count()
        s.has_reported = check_has_reported(s.id, "shoutout", db, current_user.id)

    return shoutouts


# ─────────────────────────────────────────────
# DELETE /api/shoutouts/{shoutout_id}
# Deletes a shoutout by ID
# Only the sender OR an admin may delete it
# Also manually cleans up the shoutout_recipients join table entries first
# ─────────────────────────────────────────────
@router.delete("/{shoutout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shoutout(
    shoutout_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    shoutout = db.query(models.Shoutout).filter(models.Shoutout.id == shoutout_id).first()

    if not shoutout:
        raise HTTPException(status_code=404, detail="Shout-out not found")

    # Authorization check — only sender or admin can delete
    if shoutout.sender_id != current_user.id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this shout-out")

    # Manually remove entries from the many-to-many join table first (in case cascade isn't set up)
    db.execute(text("DELETE FROM shoutout_recipients WHERE shoutout_id = :sid"), {"sid": shoutout_id})

    db.delete(shoutout)
    db.commit()
    return None


# ─────────────────────────────────────────────
# PUT /api/shoutouts/{shoutout_id}
# Updates an existing shoutout (message, recipients, image)
# Only the original sender can edit their shoutout
# Also sends update notifications to all current recipients
# ─────────────────────────────────────────────
@router.put("/{shoutout_id}", response_model=schemas.ShoutoutResponse)
def update_shoutout(
    shoutout_id: int,
    shoutout_update: schemas.ShoutoutUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    shoutout = db.query(models.Shoutout).filter(models.Shoutout.id == shoutout_id).first()

    if not shoutout:
        raise HTTPException(status_code=404, detail="Shout-out not found")

    # Only the sender can edit (no admin override for edits)
    if shoutout.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this shout-out")

    # Update message if provided
    if shoutout_update.message is not None:
        shoutout.message = shoutout_update.message

    # Update recipients if provided — also refresh denormalized username string
    if shoutout_update.recipient_ids is not None:
        recipients = db.query(models.User).filter(models.User.id.in_(shoutout_update.recipient_ids)).all()
        if len(recipients) != len(shoutout_update.recipient_ids):
             raise HTTPException(status_code=404, detail="One or more recipients not found")
        shoutout.recipients = recipients
        # Refresh the denormalized comma-separated names field
        shoutout.recipient_usernames = ", ".join([r.name for r in recipients])

        # Notify all newly tagged recipients that they are part of an updated shoutout
        for recipient in recipients:
            notification = models.Notification(
                user_id=recipient.id,
                message=f"{current_user.name} updated a shout-out tagging you!",
                type="shoutout",
                source_id=shoutout.id
            )
            db.add(notification)

    # Update image if provided
    if shoutout_update.image_url is not None:
        shoutout.image_url = shoutout_update.image_url

    db.commit()
    db.refresh(shoutout)

    # Attach updated reaction summary, comment count, and report status
    shoutout.reactions = get_reaction_summary(shoutout.id, "shoutout", db, current_user.id)
    shoutout.comment_count = db.query(models.Comment).filter(
        models.Comment.target_id == shoutout.id,
        models.Comment.target_type == "shoutout"
    ).count()
    shoutout.has_reported = check_has_reported(shoutout.id, "shoutout", db, current_user.id)
    return shoutout


# ─────────────────────────────────────────────
# POST /api/shoutouts/{shoutout_id}/report
# Allows a logged-in user to report a shoutout for inappropriate content
# The report is recorded and visible to admins
# ─────────────────────────────────────────────
@router.post("/{shoutout_id}/report", response_model=schemas.ReportResponse)
def report_shoutout(
    shoutout_id: int,
    report_data: schemas.ReportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Confirm the shoutout exists before creating a report
    shoutout = db.query(models.Shoutout).filter(models.Shoutout.id == shoutout_id).first()
    if not shoutout:
        raise HTTPException(status_code=404, detail="Shout-out not found")

    new_report = models.Report(
        reporter_id=current_user.id,
        target_id=shoutout_id,
        target_type="shoutout",
        reason=report_data.reason
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report
