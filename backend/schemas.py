from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from models import UserRole

# ─────────────────────────────────────────────
# DEPARTMENT SCHEMAS
# Used for creating and returning department data
# ─────────────────────────────────────────────

class DepartmentBase(BaseModel):
    """Shared fields for department input/output."""
    name: str
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    """Schema for creating a new department (no extra fields needed beyond base)."""
    pass

class DepartmentResponse(DepartmentBase):
    """Schema returned to the client when fetching department info."""
    id: int

    class Config:
        from_attributes = True  # Enables ORM mode so SQLAlchemy models can be returned directly


# ─────────────────────────────────────────────
# USER SCHEMAS
# Used for registration, login, password reset, and profile management
# ─────────────────────────────────────────────

class UserCreate(BaseModel):
    """Schema for new user registration."""
    name: str
    email: EmailStr               # Validated email format
    password: str
    department_id: Optional[int] = None  # Optional during registration
    role: UserRole = UserRole.employee   # Default role is employee

class UserLogin(BaseModel):
    """Schema for login request — only email and password needed."""
    email: EmailStr
    password: str

class PasswordReset(BaseModel):
    """Schema for resetting a user's password without the old one (security note: no verification step)."""
    email: EmailStr
    new_password: str

class Token(BaseModel):
    """Schema returned after successful login — contains the JWT access token."""
    access_token: str
    token_type: str  # Always "bearer"

class TokenData(BaseModel):
    """Internal schema used during JWT decoding to hold the extracted email."""
    email: Optional[str] = None

class UserResponse(BaseModel):
    """Full user data returned to the frontend after login or /me endpoint."""
    id: int
    name: str
    email: EmailStr
    department: Optional[DepartmentResponse] = None  # Nested department info
    role: UserRole
    joined_at: datetime
    profile_picture: Optional[str] = None  # Base64 image string if set

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    """Schema for partial user profile updates (all fields are optional)."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department_id: Optional[int] = None
    profile_picture: Optional[str] = None  # Base64-encoded image or empty string to clear


# ─────────────────────────────────────────────
# REACTION SCHEMAS
# Used for emoji reactions (like, clap, star) on brags and shoutouts
# ─────────────────────────────────────────────

class ReactorInfo(BaseModel):
    """Info about a single user who reacted to a post."""
    user_id: int
    name: str
    reaction_type: str  # "like", "clap", or "star"

class ReactionSummary(BaseModel):
    """Aggregated reaction counts and info for a brag or shoutout."""
    like_count: int = 0
    clap_count: int = 0
    star_count: int = 0
    user_reactions: List[str] = []  # List of reaction types the currently logged-in user has used on this item
    reactors: List[ReactorInfo] = []  # Full list of all users who reacted (for tooltip/popup display)

class ReactionToggle(BaseModel):
    """Payload sent when a user clicks a reaction button."""
    target_id: int
    target_type: str   # "brag" or "shoutout"
    reaction_type: str # "like", "clap", or "star"


# ─────────────────────────────────────────────
# COMMENT SCHEMAS
# Used for creating and returning comments on brags and shoutouts
# Supports threaded replies via parent_id
# ─────────────────────────────────────────────

class CommentCreate(BaseModel):
    """Payload for posting a new comment or reply."""
    target_id: int
    target_type: str        # "brag" or "shoutout"
    content: str
    parent_id: Optional[int] = None  # Set this to reply to another comment

class CommentResponse(BaseModel):
    """Comment data returned to the frontend."""
    id: int
    user_id: int
    content: str
    created_at: datetime
    parent_id: Optional[int] = None  # None if top-level comment, else the parent comment's ID
    user: UserResponse               # Nested user info (so frontend can display name/avatar)
    has_reported: bool = False       # Whether the current user has reported this comment

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# BRAG SCHEMAS
# Used for creating, updating, and returning brag posts
# ─────────────────────────────────────────────

class BragBase(BaseModel):
    """Shared brag fields used by both Create and Response schemas."""
    title: str
    content: str
    image_url: Optional[List[str]] = None  # List of Base64 image strings
    video_url: Optional[List[str]] = None  # List of Base64 video strings
    tags: Optional[str] = None             # Comma-separated tag string (e.g., "teamwork,python")

class BragCreate(BragBase):
    """Schema for creating or updating a brag (no extra fields needed beyond base)."""
    pass

class BragResponse(BragBase):
    """Full brag data returned to the frontend including computed fields."""
    id: int
    user_id: int
    department_id: int
    created_at: datetime
    author_name: str               # Computed from the related User (not stored in DB directly)
    image_url: Optional[List[str]] = None
    video_url: Optional[List[str]] = None
    tags: Optional[str] = None
    reactions: Optional[ReactionSummary] = None  # Aggregated reaction counts/info (added at query time)
    has_reported: bool = False                   # Whether current user has already reported this brag

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# SHOUTOUT SCHEMAS
# Used for creating, updating, and returning shoutout posts
# ─────────────────────────────────────────────

class ShoutoutBase(BaseModel):
    """Shared shoutout fields."""
    message: str

class ShoutoutCreate(ShoutoutBase):
    """Payload for creating a new shoutout — includes list of recipient user IDs."""
    recipient_ids: List[int]              # User IDs of all the people being shouted out
    image_url: Optional[str] = None       # Optional image (Base64 or URL)

class ShoutoutUpdate(BaseModel):
    """Schema for editing an existing shoutout (all fields optional for partial update)."""
    message: Optional[str] = None
    recipient_ids: Optional[List[int]] = None
    image_url: Optional[str] = None

class ShoutoutResponse(ShoutoutBase):
    """Full shoutout data returned to the frontend."""
    id: int
    sender_id: int
    sender_name: str                          # Computed from sender User object
    sender_username: Optional[str] = None     # Denormalized name stored in DB
    recipient_usernames: Optional[str] = None # Comma-separated names for quick display
    recipients: List[UserResponse]            # Full recipient user objects (for UI display)
    image_url: Optional[str] = None
    created_at: datetime
    reactions: Optional[ReactionSummary] = None  # Aggregated reactions
    comment_count: int = 0                       # Total number of comments on this shoutout
    has_reported: bool = False                   # Whether current user has already reported this shoutout

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# NOTIFICATION SCHEMAS
# Used for displaying in-app notifications to the user
# ─────────────────────────────────────────────

class NotificationResponse(BaseModel):
    """Notification data returned to the frontend for the notification bell."""
    id: int
    message: str           # Human-readable description (e.g., "Shruti gave you a shout-out!")
    is_read: int           # 0 = unread (shows dot/badge), 1 = already read
    type: str              # Event type: "brag", "shoutout", "reaction", "comment"
    source_id: Optional[int]  # ID of the related item (for navigation on click)
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationUpdate(BaseModel):
    """Used when marking a notification as read (sends is_read = 1)."""
    is_read: int


# ─────────────────────────────────────────────
# REPORT SCHEMAS
# Used when a user reports a brag, shoutout, or comment for inappropriate content
# ─────────────────────────────────────────────

class ReportCreate(BaseModel):
    """Payload sent when a user files a report."""
    target_id: int
    target_type: str  # "brag", "shoutout", or "comment"
    reason: str       # The reason text provided by the reporter

class ReportResponse(BaseModel):
    """Full report data returned to the admin dashboard."""
    id: int
    reporter_id: int
    target_id: int
    target_type: str
    reason: str
    status: str          # "pending" (default) or "resolved" (set by admin)
    created_at: datetime
    reporter: UserResponse  # Nested reporter info (to show who submitted the report)

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# ADMIN DASHBOARD SCHEMAS
# Used only by admin-level endpoints to return stats and leaderboard data
# ─────────────────────────────────────────────

class ContributorStats(BaseModel):
    """Stats for a single user — used in the leaderboard and top contributors widget."""
    user_id: int
    name: str
    count: int       # Number of posts/tags (for counting purposes)
    points: int = 0  # Calculated engagement score based on activity

class AdminStatsResponse(BaseModel):
    """Admin dashboard summary response — includes top contributors and most tagged users."""
    top_contributors: List[ContributorStats]  # Users who posted/sent the most
    most_tagged: List[ContributorStats]       # Users who received the most shoutouts
