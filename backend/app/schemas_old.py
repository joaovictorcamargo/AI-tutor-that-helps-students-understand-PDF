from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    class Config:
        from_attributes = True

class PDFUpload(BaseModel):
    filename: str
    content: str

class ChatMessage(BaseModel):
    content: str
    role: str  # 'user' or 'assistant'

class Annotation(BaseModel):
    type: str  # 'highlight' or 'circle'
    content: str  # JSON string containing coordinates and metadata
    pageNumber: int
