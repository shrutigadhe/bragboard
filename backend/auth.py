from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from database import get_db
import models

# ─────────────────────────────────────────────
# JWT CONFIGURATION
# These settings control token generation and verification
# ─────────────────────────────────────────────
SECRET_KEY = "your_secret_key_here_change_this_checking"  # Secret key used to sign/verify JWTs (should be in env vars in production)
ALGORITHM = "HS256"                    # Hashing algorithm for JWT signatures
ACCESS_TOKEN_EXPIRE_MINUTES = 30       # How long a token stays valid (30 minutes)

# Password hashing context using argon2 (more secure than bcrypt)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# OAuth2 scheme — extracts the Bearer token from the "Authorization" header
# auto_error=False means it won't raise an error if token is missing (optional auth)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)


# ─────────────────────────────────────────────
# Hash class — handles password operations
# ─────────────────────────────────────────────
class Hash:
    @staticmethod
    def verify(plain_password, hashed_password):
        """Compare a plain password against a stored hashed password."""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def make(password: str):
        """Hash a plain password before storing it in the database."""
        return pwd_context.hash(password)


# ─────────────────────────────────────────────
# Token Creation
# Builds a JWT token with user email as the subject ("sub")
# and an expiry time embedded inside the token payload
# ─────────────────────────────────────────────
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})  # Add expiry timestamp to token payload
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# ─────────────────────────────────────────────
# Dependency: get_current_user
# Used in protected routes — requires a valid Bearer token
# Decodes the JWT, extracts the email, and returns the full User object from the DB
# Raises 401 if the token is missing, expired, or invalid
# ─────────────────────────────────────────────
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the JWT and extract the email ("sub" field)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Fetch the user from DB using the email in the token, and load their department too
    user = db.query(models.User).options(joinedload(models.User.department)).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


# ─────────────────────────────────────────────
# Dependency: get_current_user_optional
# Same as get_current_user, but returns None instead of raising an error
# Used in public endpoints where auth is optional (e.g., viewing shoutouts without login)
# ─────────────────────────────────────────────
def get_current_user_optional(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        user = db.query(models.User).filter(models.User.email == email).first()
        return user
    except:
        return None  # If anything goes wrong (expired token, no token, etc.), return None silently
