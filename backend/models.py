from sqlalchemy import Column, Integer, String, Text, Enum, TIMESTAMP, ForeignKey, Table
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from database import Base
import enum

# ─────────────────────────────────────────────
# ENUM: User Role
# Defines the two roles a user can have in the system
# ─────────────────────────────────────────────
class UserRole(str, enum.Enum):
    employee = "employee"  # Regular logged-in user
    admin = "admin"        # Admin with elevated privileges (can delete posts, manage reports)


# ─────────────────────────────────────────────
# TABLE: departments
# Represents a company department (e.g., Engineering, HR)
# ─────────────────────────────────────────────
class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)        # Department name (must be unique)
    description = Column(String, nullable=True)                           # Optional description

    # One department can have many users and many brags
    users = relationship("User", back_populates="department")
    brags = relationship("Brag", back_populates="department")


# ─────────────────────────────────────────────
# TABLE: users
# Represents a registered user of the BragBoard app
# ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    # Core user identity fields
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)  # Must be unique across all users
    password = Column(String, nullable=False)                        # Stored as a hashed value (argon2)

    # Department association — a user belongs to one department (optional)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = relationship("Department", back_populates="users")

    profile_picture = Column(Text, nullable=True)  # Base64 encoded image string (set by user in profile)

    role = Column(Enum(UserRole), default=UserRole.employee)               # Default role is employee
    joined_at = Column(TIMESTAMP(timezone=True), server_default=func.now()) # Auto-set on record creation

    # Relationships to other tables
    brags = relationship("Brag", back_populates="user")                               # All brags posted by this user
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")  # Notifications for this user


# ─────────────────────────────────────────────
# TABLE: brags
# A "Brag" is an achievement post made by a user within their department
# ─────────────────────────────────────────────
class Brag(Base):
    __tablename__ = "brags"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)          # Title of the brag post
    content = Column(String, nullable=False)        # Body/description text of the brag
    image_url = Column(Text, nullable=True)         # Base64 encoded image data (JSON list of images)
    video_url = Column(Text, nullable=True)         # Base64 encoded video data (JSON list of videos)
    tags = Column(String, nullable=True)            # Comma-separated tags for filtering (e.g., "python,frontend")

    # Foreign key to department (required — a brag always belongs to a department)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    department = relationship("Department", back_populates="brags")

    # Foreign key to user (the author of the brag)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="brags")

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())  # Auto-set timestamp

    # Computed property to get author's name without an extra query (via relationship)
    @property
    def author_name(self):
        return self.user.name if self.user else "Unknown"


# ─────────────────────────────────────────────
# ASSOCIATION TABLE: shoutout_recipients
# Many-to-many join table linking shoutouts to the users they are addressed to
# (One shoutout can have multiple recipients, one user can receive many shoutouts)
# ─────────────────────────────────────────────
shoutout_recipients = Table(
    "shoutout_recipients",
    Base.metadata,
    Column("shoutout_id", Integer, ForeignKey("shoutouts.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True)
)


# ─────────────────────────────────────────────
# TABLE: shoutouts
# A "Shoutout" is a public appreciation message sent from one user to one or more others
# ─────────────────────────────────────────────
class Shoutout(Base):
    __tablename__ = "shoutouts"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(Text, nullable=False)                              # The body of the shoutout message
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Who sent the shoutout
    sender_username = Column(String, nullable=True)                     # Denormalized sender name (for quick display)
    recipient_usernames = Column(Text, nullable=True)                   # Comma-separated recipient names (for quick display)
    image_url = Column(Text, nullable=True)                             # Optional attached image (Base64 or URL)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id])            # The user who sent this shoutout
    recipients = relationship("User", secondary=shoutout_recipients)   # All users tagged in this shoutout

    # Computed property to get sender's display name
    @property
    def sender_name(self):
        return self.sender.name if self.sender else "Unknown"


# ─────────────────────────────────────────────
# TABLE: notifications
# In-app notifications sent to users for events like brags, shoutouts, reactions, and comments
# ─────────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Which user receives this notification
    message = Column(String, nullable=False)                           # Human-readable notification text
    is_read = Column(Integer, default=0)  # 0 = unread, 1 = read (acts as a boolean flag)
    type = Column(String, default="shoutout")   # Type of event: "brag", "shoutout", "reaction", "comment"
    source_id = Column(Integer, nullable=True)  # ID of the related item (e.g., shoutout_id or brag_id)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")


# ─────────────────────────────────────────────
# TABLE: reactions
# A user's reaction (like/clap/star) on a brag or shoutout
# One user can only have ONE active reaction per target (LinkedIn style)
# ─────────────────────────────────────────────
class Reaction(Base):
    __tablename__ = "reactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)   # Who reacted
    target_id = Column(Integer, nullable=False)                         # ID of the item reacted to
    target_type = Column(String, nullable=False)                        # "brag" or "shoutout"
    reaction_type = Column(String, nullable=False)                      # "like", "clap", or "star"
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User")  # The user who made the reaction


# ─────────────────────────────────────────────
# TABLE: comments
# A comment left by a user on a brag or shoutout
# Supports nested replies via parent_id (threaded comments)
# ─────────────────────────────────────────────
class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)   # Who wrote the comment
    target_id = Column(Integer, nullable=False)                         # ID of the brag or shoutout being commented on
    target_type = Column(String, nullable=False)                        # "brag" or "shoutout"
    content = Column(Text, nullable=False)                              # The comment text
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Self-referential foreign key for threaded/nested replies
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)  # None = top-level; set = reply to another comment
    replies = relationship("Comment", backref=backref("parent", remote_side=[id]), cascade="all, delete-orphan")

    user = relationship("User")  # The user who wrote this comment


# ─────────────────────────────────────────────
# TABLE: reports
# A report filed by a user against a brag, shoutout, or comment for inappropriate content
# Admins can view and resolve reports from the admin dashboard
# ─────────────────────────────────────────────
class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who submitted the report
    target_id = Column(Integer, nullable=False)                            # ID of the reported item
    target_type = Column(String, nullable=False)                           # "brag", "shoutout", or "comment"
    reason = Column(Text, nullable=False)                                  # Explanation provided by the reporter
    status = Column(String, default="pending")                             # "pending" or "resolved" (set by admin)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    reporter = relationship("User")  # The user who filed the report
