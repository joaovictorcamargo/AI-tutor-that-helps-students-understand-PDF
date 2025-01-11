from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class TokenData(BaseModel):
    email: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class PDFBase(BaseModel):
    filename: str
    content: str

class PDFCreate(PDFBase):
    pass

class PDF(PDFBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class MessageBase(BaseModel):
    content: str
    role: str

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    chat_history_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChatHistoryBase(BaseModel):
    pass

class ChatHistoryCreate(ChatHistoryBase):
    pass

class ChatHistory(ChatHistoryBase):
    id: int
    user_id: int
    pdf_id: int
    messages: List[Message] = []
    created_at: datetime
    
    class Config:
        from_attributes = True

class AnnotationBase(BaseModel):
    type: str
    content: str
    page_number: int

class AnnotationCreate(AnnotationBase):
    pass

class Annotation(AnnotationBase):
    id: int
    pdf_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
