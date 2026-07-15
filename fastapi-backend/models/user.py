from typing import Optional
from beanie import Document
import bcrypt
from pydantic import EmailStr

class User(Document):
    name: str
    email: str
    password: str

    class Settings:
        name = "users"

    def verify_password(self, plain_password: str) -> bool:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            self.password.encode('utf-8')
        )

    @staticmethod
    def hash_password(plain_password: str) -> str:
        return bcrypt.hashpw(
            plain_password.encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')
