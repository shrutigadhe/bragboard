from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth

# ─────────────────────────────────────────────
# REACTIONS ROUTER
# Handles emoji reactions (like 👍, clap 👏, star ⭐) on brags and shoutouts
# Uses a "LinkedIn-style" toggle: one reaction per user per post,
# clicking the same reaction removes it; clicking a different one switches to it
# Routes: /api/reactions/
# ─────────────────────────────────────────────
router = APIRouter(
    prefix="/api/reactions",
    tags=["reactions"]
)


# ─────────────────────────────────────────────
# POST /api/reactions/toggle
# Toggles a reaction on/off for the current user on a brag or shoutout
# Behavior:
#   - If no reaction exists → ADD the new reaction
#   - If same reaction already exists → REMOVE it (toggle off)
#   - If a different reaction exists → SWITCH to the new one
# Returns the updated reaction summary for the post
# ─────────────────────────────────────────────
@router.post("/toggle", response_model=schemas.ReactionSummary)
def toggle_reaction(
    reaction: schemas.ReactionToggle,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    print(f"DEBUG: Toggling {reaction.reaction_type} for {reaction.target_type} {reaction.target_id} by user {current_user.id}")

    # Verify the target (brag or shoutout) exists before allowing the reaction
    if reaction.target_type == "brag":
        target = db.query(models.Brag).filter(models.Brag.id == reaction.target_id).first()
    elif reaction.target_type == "shoutout":
        target = db.query(models.Shoutout).filter(models.Shoutout.id == reaction.target_id).first()
    else:
        raise HTTPException(status_code=400, detail="Invalid target type")

    if not target:
        print(f"DEBUG: Target {reaction.target_type} {reaction.target_id} NOT FOUND")
        raise HTTPException(status_code=404, detail=f"{reaction.target_type.capitalize()} not found")

    # LinkedIn-style logic: Check if this user already has ANY reaction on this target
    # (Only one reaction type allowed per user per target)
    existing_any = db.query(models.Reaction).filter(
        models.Reaction.user_id == current_user.id,
        models.Reaction.target_id == reaction.target_id,
        models.Reaction.target_type == reaction.target_type
    ).first()

    if existing_any:
        if existing_any.reaction_type == reaction.reaction_type:
            # Same reaction type clicked again → TOGGLE OFF (remove the reaction)
            print(f"DEBUG: Toggling OFF same type {reaction.reaction_type}")
            db.delete(existing_any)
        else:
            # Different reaction type → SWITCH (delete old, add new)
            print(f"DEBUG: Switching from {existing_any.reaction_type} to {reaction.reaction_type}")
            db.delete(existing_any)
            new_reaction = models.Reaction(
                user_id=current_user.id,
                target_id=reaction.target_id,
                target_type=reaction.target_type,
                reaction_type=reaction.reaction_type
            )
            db.add(new_reaction)
    else:
        # No existing reaction → ADD a new one
        print(f"DEBUG: Adding new reaction {reaction.reaction_type}")
        new_reaction = models.Reaction(
            user_id=current_user.id,
            target_id=reaction.target_id,
            target_type=reaction.target_type,
            reaction_type=reaction.reaction_type
        )
        db.add(new_reaction)

        # Notify the author of the post only when adding/switching a reaction (not when removing)
        # Determine who the author is (brags use user_id, shoutouts use sender_id)
        author_id = target.user_id if reaction.target_type == "brag" else target.sender_id
        # Don't notify the user if they reacted to their own post
        if author_id != current_user.id:
            new_notif = models.Notification(
                user_id=author_id,
                message=f"{current_user.name} reacted '{reaction.reaction_type}' to your {reaction.target_type}!",
                type="reaction",
                source_id=reaction.target_id
            )
            db.add(new_notif)

    db.commit()

    # Recalculate and return the updated reaction summary for the post
    from routers.utils import get_reaction_summary
    return get_reaction_summary(reaction.target_id, reaction.target_type, db, current_user.id)
