from typing import Optional
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, IndexModel


class EmailOtp(Document):
    """A one-time code emailed for registration or password reset.

    Only a keyed hash of the code is stored. For registration the account itself isn't created
    until the code is verified, so the pending name/password hash live here.
    """
    email: str
    purpose: str  # "register" | "reset"
    codeHash: str
    expiresAt: datetime
    attempts: int = 0
    lastSentAt: datetime = Field(default_factory=datetime.utcnow)
    pendingName: Optional[str] = None
    pendingPasswordHash: Optional[str] = None

    class Settings:
        name = "emailotps"
        indexes = [
            IndexModel([("email", ASCENDING), ("purpose", ASCENDING)], unique=True),
            # MongoDB deletes expired codes automatically
            IndexModel([("expiresAt", ASCENDING)], expireAfterSeconds=0),
        ]


class RefreshToken(Document):
    """A refresh token (stored only as a SHA-256 hash), rotated on every use.

    Tokens issued from the same login share a family; presenting an already-rotated token means it
    was stolen, so the whole family is revoked.
    """
    user: PydanticObjectId
    tokenHash: str
    family: str
    expiresAt: datetime
    revokedAt: Optional[datetime] = None
    replacedAt: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    userAgent: str = ""
    ip: str = ""

    class Settings:
        name = "refreshtokens"
        indexes = [
            IndexModel([("tokenHash", ASCENDING)], unique=True),
            IndexModel([("user", ASCENDING)]),
            IndexModel([("family", ASCENDING)]),
            IndexModel([("expiresAt", ASCENDING)], expireAfterSeconds=0),
        ]
