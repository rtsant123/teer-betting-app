from pydantic import BaseModel
from typing import Optional

class PasswordResetRequest(BaseModel):
    username: str

class PasswordResetConfirm(BaseModel):
    username: str
    reset_code: str
    new_password: str

class PasswordResetResponse(BaseModel):
    message: str
    success: bool

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ChangePasswordResponse(BaseModel):
    message: str
    success: bool
