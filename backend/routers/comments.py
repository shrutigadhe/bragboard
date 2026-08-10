from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from database import get_db
import models, schemas, auth
from typing import List, Optional
from .utils import check_has_reported

# ─────────────────────────────────────────────
# COMMENTS ROUTER
# Handles CRUD for comments on brags and shoutouts
# Also supports threaded replies via parent_id
# Routes: /api/comments/
# ─────────────────────────────────────────────
router = APIRouter(
    prefix="/api/comments",
    tags=["comments"]
)


# ─────────────────────────────────────────────
# POST /api/comments
# Creates a new comment (or reply) on a brag or shoutout
# Sends a notification to the author of the target (brag/shoutout) if different from commenter
# ─────────────────────────────────────────────
@router.post("", response_model=schemas.CommentResponse)
def create_comment(
    comment: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify the target (brag or shoutout) actually exists before attaching a comment
    if comment.target_type == "brag":
        target = db.query(models.Brag).filter(models.Brag.id == comment.target_id).first()
    elif comment.target_type == "shoutout":
        target = db.query(models.Shoutout).filter(models.Shoutout.id == comment.target_id).first()
    else:
        raise HTTPException(status_code=400, detail="Invalid target type")

    if not target:
        raise HTTPException(status_code=404, detail=f"{comment.target_type.capitalize()} not found")

    # Create the new comment record (parent_id will be None for top-level comments)
    new_comment = models.Comment(
        user_id=current_user.id,
        target_id=comment.target_id,
        target_type=comment.target_type,
        content=comment.content,
        parent_id=comment.parent_id  # Set to reply to another comment, or None for top-level
    )
    db.add(new_comment)

    # Notify the original author of the brag/shoutout that someone commented
    # Don't notify if the commenter IS the author (no self-notifications)
    author_id = target.user_id if comment.target_type == "brag" else target.sender_id
    if author_id != current_user.id:
        new_notif = models.Notification(
            user_id=author_id,
            message=f"{current_user.name} commented on your {comment.target_type}: '{comment.content[:30]}...'",
            type="comment",
            source_id=comment.target_id
        )
        db.add(new_notif)

    db.commit()
    db.refresh(new_comment)

    # Eagerly reload the comment with user relationship so the response includes user info
    new_comment = db.query(models.Comment).options(joinedload(models.Comment.user)).filter(models.Comment.id == new_comment.id).first()

    new_comment.has_reported = check_has_reported(new_comment.id, "comment", db, current_user.id)
    return new_comment


# ─────────────────────────────────────────────
# GET /api/comments/{target_type}/{target_id}
# Fetches all comments for a specific brag or shoutout
# Returns in chronological order (oldest first, for natural conversation flow)
# Auth is optional — if logged in, has_reported will reflect the user's report status
# ─────────────────────────────────────────────
@router.get("/{target_type}/{target_id}", response_model=List[schemas.CommentResponse])
def get_comments(
    target_type: str,
    target_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)  # Optional auth
):
    # Fetch all comments for this target, with user info loaded for each
    comments = db.query(models.Comment).options(joinedload(models.Comment.user)).filter(
        models.Comment.target_id == target_id,
        models.Comment.target_type == target_type
    ).order_by(models.Comment.created_at.asc()).all()  # Ascending order for a chat-like experience

    # Mark each comment with whether the current user has reported it
    for c in comments:
        c.has_reported = check_has_reported(c.id, "comment", db, current_user.id if current_user else 0)

    return comments


# ─────────────────────────────────────────────
# PUT /api/comments/{comment_id}
# Updates the content of an existing comment
# Only the comment's author can edit it
# ─────────────────────────────────────────────
@router.put("/{comment_id}", response_model=schemas.CommentResponse)
def update_comment(
    comment_id: int,
    updated_content: schemas.CommentCreate,  # We can reuse the same schema for content
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    # Only the comment's author is allowed to edit it
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")

    comment.content = updated_content.content
    db.commit()
    db.refresh(comment)
    comment.has_reported = check_has_reported(comment.id, "comment", db, current_user.id)
    return comment


# ─────────────────────────────────────────────
# DELETE /api/comments/{comment_id}
# Deletes a comment by ID
# Only the comment's author OR an admin can delete it
# ─────────────────────────────────────────────
@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    # Author or admin can delete
    if comment.user_id != current_user.id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    db.delete(comment)
    db.commit()
    return None


# ─────────────────────────────────────────────
# POST /api/comments/{comment_id}/report
# Allows a logged-in user to report a comment for inappropriate content
# ─────────────────────────────────────────────
@router.post("/{comment_id}/report", response_model=schemas.ReportResponse)
def report_comment(
    comment_id: int,
    report_data: schemas.ReportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Confirm the comment exists
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    new_report = models.Report(
        reporter_id=current_user.id,
        target_id=comment_id,
        target_type="comment",
        reason=report_data.reason
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report
