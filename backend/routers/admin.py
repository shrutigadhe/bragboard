from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from database import get_db
import models, schemas, auth
from typing import List

# ─────────────────────────────────────────────
# ADMIN ROUTER
# Provides admin-only endpoints for managing the platform
# All endpoints (except /leaderboard) require admin role
# Routes: /api/admin/
# ─────────────────────────────────────────────
router = APIRouter(
    prefix="/api/admin",
    tags=["admin"]
)


# ─────────────────────────────────────────────
# HELPER: check_admin
# Raises 403 if the user does not have the admin role
# Called at the start of every admin-only endpoint
# ─────────────────────────────────────────────
def check_admin(user: models.User):
    if user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")


# ─────────────────────────────────────────────
# GET /api/admin/stats
# Returns stats for the admin dashboard:
#   - Top 5 contributors (users with most brags + shoutouts sent combined)
#   - Top 5 most tagged (users who received the most shoutouts)
# Requires: admin role
# ─────────────────────────────────────────────
@router.get("/stats", response_model=schemas.AdminStatsResponse)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    check_admin(current_user)

    # Step 1: Count brags per user (top 5 users by brag count)
    brag_counts = db.query(
        models.User.id,
        models.User.name,
        func.count(models.Brag.id).label("count")
    ).join(models.Brag).group_by(models.User.id).order_by(desc("count")).limit(5).all()

    # Step 2: Count shoutouts sent per user (top 5 senders)
    shoutout_counts = db.query(
        models.User.id,
        models.User.name,
        func.count(models.Shoutout.id).label("count")
    ).join(models.Shoutout).group_by(models.User.id).order_by(desc("count")).limit(5).all()

    # Step 3: Merge both counts into a single "top contributors" list
    # If a user appears in both (brags and shoutouts), sum their counts
    contributors = {}
    for u_id, name, count in brag_counts:
        contributors[u_id] = {"name": name, "count": count}
    for u_id, name, count in shoutout_counts:
        if u_id in contributors:
            contributors[u_id]["count"] += count  # Add shoutout count to existing brag count
        else:
            contributors[u_id] = {"name": name, "count": count}

    # Sort by combined count and take the top 5
    top_contributors = sorted(
        [{"user_id": k, "name": v["name"], "count": v["count"]} for k, v in contributors.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:5]

    # Step 4: Count how many shoutouts each user has RECEIVED (via the join table)
    most_tagged_raw = db.query(
        models.User.id,
        models.User.name,
        func.count(models.shoutout_recipients.c.shoutout_id).label("count")
    ).join(models.shoutout_recipients, models.User.id == models.shoutout_recipients.c.user_id)\
     .group_by(models.User.id).order_by(desc("count")).limit(5).all()

    most_tagged = [{"user_id": r[0], "name": r[1], "count": r[2]} for r in most_tagged_raw]

    return {
        "top_contributors": top_contributors,
        "most_tagged": most_tagged
    }


# ─────────────────────────────────────────────
# GET /api/admin/leaderboard
# Returns all users ranked by their engagement points
# Point system:
#   - Each brag posted = 10 pts
#   - Each shoutout sent = 5 pts
#   - Each shoutout received = 15 pts
#   - Each reaction received (on brags or shoutouts) = 2 pts
# Accessible to all logged-in users (not admin-only)
# ─────────────────────────────────────────────
@router.get("/leaderboard", response_model=List[schemas.ContributorStats])
def get_leaderboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Initialize every user with 0 points and 0 count
    users = db.query(models.User).all()
    points_map = {u.id: {"name": u.name, "points": 0, "count": 0} for u in users}

    # 1. Award 10 points for each brag posted
    brag_data = db.query(models.Brag.user_id, func.count(models.Brag.id)).group_by(models.Brag.user_id).all()
    for u_id, count in brag_data:
        if u_id in points_map:
            points_map[u_id]["points"] += count * 10
            points_map[u_id]["count"] += count

    # 2. Award 5 points for each shoutout sent
    shoutout_sent = db.query(models.Shoutout.sender_id, func.count(models.Shoutout.id)).group_by(models.Shoutout.sender_id).all()
    for u_id, count in shoutout_sent:
        if u_id in points_map:
            points_map[u_id]["points"] += count * 5
            points_map[u_id]["count"] += count

    # 3. Award 15 points for each shoutout received (being tagged in a shoutout)
    shoutout_received = db.query(models.shoutout_recipients.c.user_id, func.count(models.shoutout_recipients.c.shoutout_id)).group_by(models.shoutout_recipients.c.user_id).all()
    for u_id, count in shoutout_received:
        if u_id in points_map:
            points_map[u_id]["points"] += count * 15

    # 4. Award 2 points for each reaction received on a brag
    brag_reactions = db.query(models.Brag.user_id, func.count(models.Reaction.id))\
        .join(models.Reaction, (models.Reaction.target_id == models.Brag.id) & (models.Reaction.target_type == 'brag'))\
        .group_by(models.Brag.user_id).all()
    for u_id, count in brag_reactions:
        if u_id in points_map:
            points_map[u_id]["points"] += count * 2

    # 4b. Award 2 points for each reaction received on a shoutout (for the sender)
    shoutout_reactions = db.query(models.Shoutout.sender_id, func.count(models.Reaction.id))\
        .join(models.Reaction, (models.Reaction.target_id == models.Shoutout.id) & (models.Reaction.target_type == 'shoutout'))\
        .group_by(models.Shoutout.sender_id).all()
    for u_id, count in shoutout_reactions:
        if u_id in points_map:
            points_map[u_id]["points"] += count * 2

    # Sort all users by total points descending and return the full ranked list
    leaderboard = sorted(
        [{"user_id": k, "name": v["name"], "count": v["count"], "points": v["points"]} for k, v in points_map.items()],
        key=lambda x: x["points"],
        reverse=True
    )

    return leaderboard


# ─────────────────────────────────────────────
# GET /api/admin/reports
# Returns all user-submitted reports (brags, shoutouts, comments)
# Sorted newest first
# Requires: admin role
# ─────────────────────────────────────────────
@router.get("/reports", response_model=List[schemas.ReportResponse])
def get_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    check_admin(current_user)
    return db.query(models.Report).order_by(models.Report.created_at.desc()).all()


# ─────────────────────────────────────────────
# PATCH /api/admin/reports/{report_id}
# Updates the status of a specific report (e.g., "pending" → "resolved")
# Requires: admin role
# ─────────────────────────────────────────────
@router.patch("/reports/{report_id}", response_model=schemas.ReportResponse)
def update_report_status(
    report_id: int,
    status: str,         # New status value passed as a query param (e.g., ?status=resolved)
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    check_admin(current_user)

    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Update the report status (typically "pending" or "resolved")
    report.status = status
    db.commit()
    db.refresh(report)
    return report
