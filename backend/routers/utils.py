from sqlalchemy.orm import Session
import models, schemas

# ─────────────────────────────────────────────
# SHARED UTILITY FUNCTIONS
# These helpers are reused across multiple routers (brags, shoutouts, reactions, comments)
# to avoid code duplication
# ─────────────────────────────────────────────


def get_reaction_summary(target_id: int, target_type: str, db: Session, user_id: int):
    """
    Calculates the reaction summary for a given brag or shoutout.
    Returns counts for each reaction type (like, clap, star),
    which reactions the current user has used,
    and a list of all reactors with their user info.

    Args:
        target_id   - The ID of the brag or shoutout
        target_type - "brag" or "shoutout"
        db          - Active database session
        user_id     - ID of the currently logged-in user (used to determine user_reactions)
    """
    from sqlalchemy.orm import joinedload

    # Fetch all reactions for this target, and eagerly load each reactor's user info
    reactions = db.query(models.Reaction).options(joinedload(models.Reaction.user)).filter(
        models.Reaction.target_id == target_id,
        models.Reaction.target_type == target_type
    ).all()

    return schemas.ReactionSummary(
        like_count=len([r for r in reactions if r.reaction_type == "like"]),   # Count "like" reactions
        clap_count=len([r for r in reactions if r.reaction_type == "clap"]),   # Count "clap" reactions
        star_count=len([r for r in reactions if r.reaction_type == "star"]),   # Count "star" reactions
        user_reactions=[r.reaction_type for r in reactions if r.user_id == user_id],  # What THIS user reacted with
        reactors=[
            schemas.ReactorInfo(
                user_id=r.user_id,
                name=r.user.name,
                reaction_type=r.reaction_type
            ) for r in reactions  # Full list of all users who reacted (for tooltip display in UI)
        ]
    )


def check_has_reported(target_id: int, target_type: str, db: Session, user_id: int):
    """
    Checks whether the current user has already reported a specific item.
    Used to prevent duplicate reports and to show the correct "Report" button state in UI.

    Args:
        target_id   - The ID of the brag, shoutout, or comment
        target_type - "brag", "shoutout", or "comment"
        db          - Active database session
        user_id     - ID of the currently logged-in user

    Returns:
        True if the user has already submitted a report for this item, False otherwise.
    """
    return db.query(models.Report).filter(
        models.Report.target_id == target_id,
        models.Report.target_type == target_type,
        models.Report.reporter_id == user_id
    ).first() is not None
