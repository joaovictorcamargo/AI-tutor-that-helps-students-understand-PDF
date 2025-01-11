from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os
import json
from typing import List
from io import BytesIO
import PyPDF2
import openai

from . import models, schemas
from .database import SessionLocal, engine, get_db
from .auth import (
    authenticate_user, create_access_token, get_current_user,
    get_password_hash, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES
)

app = FastAPI()
openai.api_key = os.getenv("OPENAI_API_KEY")

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/register", response_model=schemas.User)
async def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = models.User(email=user.email, password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/token", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/upload-pdf", response_model=schemas.PDF)
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = await file.read()
    pdf_reader = PyPDF2.PdfReader(BytesIO(content))
    text_content = ""
    for page in pdf_reader.pages:
        text_content += page.extract_text()
    
    db_pdf = models.PDF(
        filename=file.filename,
        content=text_content,
        user_id=current_user.id
    )
    db.add(db_pdf)
    db.commit()
    db.refresh(db_pdf)
    return db_pdf

@app.post("/chat/{pdf_id}", response_model=schemas.ChatHistory)
async def chat(
    pdf_id: int,
    message: schemas.MessageCreate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify PDF access
    pdf = db.query(models.PDF).filter(
        models.PDF.id == pdf_id,
        models.PDF.user_id == current_user.id
    ).first()
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    # Get chat history
    chat_history = db.query(models.ChatHistory).filter(
        models.ChatHistory.pdf_id == pdf_id,
        models.ChatHistory.user_id == current_user.id
    ).first()
    
    if not chat_history:
        chat_history = models.ChatHistory(
            user_id=current_user.id,
            pdf_id=pdf_id
        )
        db.add(chat_history)
        db.commit()
        db.refresh(chat_history)
    
    # Add user message
    user_message = models.Message(
        content=message.content,
        role='user',
        chat_history_id=chat_history.id
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    
    # Prepare conversation for OpenAI
    messages = [
        {
            "role": "system",
            "content": f"""You are a helpful AI tutor. Use the following PDF content to answer questions. 
            When referencing specific parts of the document, use page numbers and create annotations to highlight relevant content.
            To create annotations, use the following format in your response:
            [ANNOTATION]{{
                "type": "highlight"|"circle",
                "pageNumber": number,
                "content": "text being referenced",
                "coordinates": {{
                    "x": number,
                    "y": number,
                    "width": number,
                    "height": number,
                    "radius": number
                }}
            }}[/ANNOTATION]
            
            To navigate to a specific page, use:
            [PAGE]number[/PAGE]
            
            PDF Content:
            {pdf.content}"""
        }
    ]
    
    # Add chat history
    db_messages = db.query(models.Message).filter(
        models.Message.chat_history_id == chat_history.id
    ).all()
    messages.extend([{"role": msg.role, "content": msg.content} for msg in db_messages])
    
    # Get AI response
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=messages,
        temperature=0.7,
        max_tokens=1000
    )
    
    ai_message = response.choices[0].message.content
    
    # Extract and save annotations
    import re
    annotation_pattern = r'\[ANNOTATION\](.*?)\[/ANNOTATION\]'
    page_pattern = r'\[PAGE\](\d+)\[/PAGE\]'
    
    annotations = []
    for annotation_json in re.findall(annotation_pattern, ai_message):
        try:
            annotation_data = json.loads(annotation_json)
            db_annotation = models.Annotation(
                type=annotation_data['type'],
                content=annotation_data['content'],
                page_number=annotation_data['pageNumber'],
                coordinates=json.dumps(annotation_data['coordinates']),
                pdf_id=pdf_id
            )
            db.add(db_annotation)
            db.commit()
            db.refresh(db_annotation)
            annotations.append(db_annotation)
        except json.JSONDecodeError:
            continue
    
    # Remove annotation and page markup from message
    clean_message = re.sub(annotation_pattern, '', ai_message)
    clean_message = re.sub(page_pattern, r'(Page \1)', clean_message).strip()
    
    # Save AI response
    ai_db_message = models.Message(
        content=clean_message,
        role='assistant',
        chat_history_id=chat_history.id
    )
    db.add(ai_db_message)
    db.commit()
    db.refresh(ai_db_message)
    
    return {
        "response": clean_message,
        "annotations": annotations,
        "pages": [int(p) for p in re.findall(page_pattern, ai_message)]
    }

@app.post("/annotate/{pdf_id}", response_model=schemas.Annotation)
async def create_annotation(
    pdf_id: int,
    annotation: schemas.AnnotationCreate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify PDF access
    pdf = db.query(models.PDF).filter(
        models.PDF.id == pdf_id,
        models.PDF.user_id == current_user.id
    ).first()
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    db_annotation = models.Annotation(
        type=annotation.type,
        content=annotation.content,
        page_number=annotation.page_number,
        pdf_id=pdf_id
    )
    db.add(db_annotation)
    db.commit()
    db.refresh(db_annotation)
    return db_annotation

@app.post("/speech-to-text")
async def speech_to_text(
    audio_base64: str,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Convert speech to text using browser's built-in API"""
    # This endpoint exists for compatibility, but actual conversion happens in frontend
    return {"text": audio_base64}

@app.post("/text-to-speech")
async def text_to_speech(
    text: str,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Convert text to speech using browser's built-in API"""
    # This endpoint exists for compatibility, but actual conversion happens in frontend
    return {"audio": text}

@app.get("/chat-history/{pdf_id}", response_model=schemas.ChatHistory)
async def get_chat_history(
    pdf_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat_history = db.query(models.ChatHistory).filter(
        models.ChatHistory.pdf_id == pdf_id,
        models.ChatHistory.user_id == current_user.id
    ).first()
    if not chat_history:
        return {"messages": []}
    return chat_history
