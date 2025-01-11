from fastapi import HTTPException
import base64
import json
import os

def text_to_speech(text: str) -> str:
    """Convert text to speech using browser's built-in API"""
    # This will be handled by the frontend using the Web Speech API
    return text

def speech_to_text(audio_base64: str) -> str:
    """Convert speech to text using browser's built-in API"""
    # This will be handled by the frontend using the Web Speech API
    return ""
