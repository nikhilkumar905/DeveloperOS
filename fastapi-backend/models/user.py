from typing import Optional
from datetime import datetime
from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel
import bcrypt

# bcrypt only uses the first 72 bytes of a password; longer inputs are rejected at validation time
BCRYPT_MAX_BYTES = 72

# Compared against when an email isn't registered, so login takes the same time either way
# (prevents discovering registered emails by timing)
_DUMMY_HASH = bcrypt.hashpw(b"timing-equalizer", bcrypt.gensalt()).decode()


class User(Document):
    name: str
    email: str
    # None for accounts created through Google sign-in
    password: Optional[str] = None
    # Accounts created before email verification existed default to verified
    emailVerified: bool = True
    googleId: Optional[str] = None
    # Bumped to revoke every outstanding token (password reset, "log out everywhere")
    tokenVersion: int = 0
    failedLoginAttempts: int = 0
    lockedUntil: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    lastLoginAt: Optional[datetime] = None

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("email", ASCENDING)], unique=True),
            IndexModel([("googleId", ASCENDING)], unique=True, partialFilterExpression={"googleId": {"$type": "string"}}),
        ]

    def verify_password(self, plain_password: str) -> bool:
        if not self.password:
            # Still spend the bcrypt time so Google-only accounts aren't distinguishable
            bcrypt.checkpw(plain_password.encode("utf-8")[:BCRYPT_MAX_BYTES], _DUMMY_HASH.encode())
            return False
        return bcrypt.checkpw(plain_password.encode("utf-8")[:BCRYPT_MAX_BYTES], self.password.encode("utf-8"))

    @staticmethod
    def hash_password(plain_password: str) -> str:
        return bcrypt.hashpw(plain_password.encode("utf-8")[:BCRYPT_MAX_BYTES], bcrypt.gensalt(rounds=12)).decode("utf-8")

    @staticmethod
    def burn_password_check(plain_password: str) -> None:
        """Equalize timing when no user matches the email."""
        bcrypt.checkpw(plain_password.encode("utf-8")[:BCRYPT_MAX_BYTES], _DUMMY_HASH.encode())
