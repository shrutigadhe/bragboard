from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth
from typing import List

# ─────────────────────────────────────────────
# NOTIFICATIONS ROUTER
# Manages in-app notifications for the logged-in user
# Notifications are created automatically by other routers (brags, shoutouts, reactions, comments)
# Routes: /api/notifications/
# ─────────────────────────────────────────────
router = APIRouter(
    prefix="/api/notifications",
    tags=["notifications"]
)


# ─────────────────────────────────────────────
# GET /api/notifications/
# Returns all notifications for the currently logged-in user
# Sorted by newest first (most recent notifications shown at top)
# ─────────────────────────────────────────────
@router.get("/", response_model=List[schemas.NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).all()


# ─────────────────────────────────────────────
# PUT /api/notifications/{notification_id}/read
# Marks a single specific notification as read (is_read = 1)
# Only the notification's owner can mark it as read
# ─────────────────────────────────────────────
@router.put("/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Find the notification by ID AND verify it belongs to the current user
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id  # Security: prevents marking other users' notifications
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    # Set is_read to 1 (treated as True — means "read")
    notification.is_read = 1
    db.commit()
    db.refresh(notification)
    return notification


# ─────────────────────────────────────────────
# PUT /api/notifications/read-all
# Marks ALL unread notifications for the current user as read at once
# Returns 204 No Content on success (no response body needed)
# ─────────────────────────────────────────────
@router.put("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Bulk update all unread notifications belonging to this user
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == 0  # Only target unread ones (is_read == 0)
    ).update({"is_read": 1})
    db.commit()
    return None
