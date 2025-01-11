from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    pdfs = relationship("PDF", back_populates="user")
    chat_histories = relationship("ChatHistory", back_populates="user")

class PDF(Base):
    __tablename__ = "pdfs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    content = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="pdfs")
    chat_histories = relationship("ChatHistory", back_populates="pdf")
    annotations = relationship("Annotation", back_populates="pdf")

class ChatHistory(Base):
    __tablename__ = "chat_histories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    pdf_id = Column(Integer, ForeignKey("pdfs.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="chat_histories")
    pdf = relationship("PDF", back_populates="chat_histories")
    messages = relationship("Message", back_populates="chat_history")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    role = Column(String)  # 'user' or 'assistant'
    chat_history_id = Column(Integer, ForeignKey("chat_histories.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chat_history = relationship("ChatHistory", back_populates="messages")

class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)  # 'highlight' or 'circle'
    content = Column(Text)  # JSON string containing coordinates and metadata
    page_number = Column(Integer)
    pdf_id = Column(Integer, ForeignKey("pdfs.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    pdf = relationship("PDF", back_populates="annotations")
