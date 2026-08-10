from fastapi import FastAPI, Depends
# Trigger reload
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, get_db
import models
# Import all feature routers
from routers import auth_router as auth, brags, departments, shoutouts, notifications, reactions, comments, admin

# ─────────────────────────────────────────────
# DATABASE INITIALIZATION
# Creates all tables in the database if they don't already exist
# This runs on every startup — safe to call repeatedly (won't recreate existing tables)
# ─────────────────────────────────────────────
models.Base.metadata.create_all(bind=engine)

# Seed default departments if empty
from database import SessionLocal
with SessionLocal() as db:
    if db.query(models.Department).count() == 0:
        default_depts = ["Engineering", "Product", "Design", "Marketing", "Sales", "HR"]
        for dept in default_depts:
            db.add(models.Department(name=dept, description=f"{dept} Department"))
        db.commit()

# Create the main FastAPI app instance
app = FastAPI()

# ─────────────────────────────────────────────
# CORS MIDDLEWARE
# Allows the frontend (React app) to make API calls to this backend
# Without this, browsers would block cross-origin requests
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",                          # Local development frontend
        "http://127.0.0.1:3000",                          # Alternate local URL
        "https://bragboard-frontend-bney.onrender.com",   # Production frontend on Render
    ],
    allow_credentials=True,   # Allow cookies and Authorization headers
    allow_methods=["*"],      # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],      # Allow all request headers
)

# ─────────────────────────────────────────────
# ROUTER REGISTRATION
# Each router handles a different feature of the app
# They are defined in the /routers/ folder and registered here with URL prefixes
# ─────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")       # Auth routes: /api/register, /api/login, /api/me, etc.
app.include_router(brags.router)                     # Brag routes: /api/brags/
app.include_router(departments.router)               # Department routes: /api/departments/
app.include_router(shoutouts.router)                 # Shoutout routes: /api/shoutouts/
app.include_router(notifications.router)             # Notification routes: /api/notifications/
app.include_router(reactions.router)                 # Reaction routes: /api/reactions/
app.include_router(comments.router)                  # Comment routes: /api/comments/
app.include_router(admin.router)                     # Admin routes: /api/admin/


# ─────────────────────────────────────────────
# UTILITY / TEST ENDPOINTS
# Simple endpoints used for health checks and debugging
# ─────────────────────────────────────────────

# Greet endpoint — confirms the app is running
@app.get('/api/greet')
async def greet():
    return {"message": "This is BragBoard."}

# Echo endpoint — returns whatever JSON body was sent (useful for debugging)
@app.post("/api/echo")
def echo(data: dict):
    return {"you_sent": data}

# Root endpoint — confirms tables were created on startup
@app.get("/")
def read_root():
    return {"message": "Database tables created successfully!"}

# DB connection test endpoint — checks if the database session can be obtained
@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    return {"status": "Database is connected"}

# Temporary endpoint to make shruti@example.com an admin
@app.get("/make-admin")
def make_admin(db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == "shruti@example.com").first()
    if user:
        user.role = "admin"
        db.commit()
        return {"message": "Success! shruti@example.com is now an admin."}
    return {"message": "User not found. Make sure you registered with shruti@example.com first."}
