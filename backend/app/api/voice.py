import os
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.voice.tts import tts_engine
from app.voice.stt import stt_engine
import tempfile
from pathlib import Path

router = APIRouter()

class SpeakRequest(BaseModel):
    text: str

@router.post("/voice/speak")
async def speak_text(req: SpeakRequest):
    audio_file = await tts_engine.synthesize_to_file(req.text)
    return FileResponse(
        path=audio_file,
        media_type="audio/mpeg" if str(audio_file).endswith(".mp3") else "audio/aiff",
        filename="speech.mp3"
    )

@router.post("/voice/transcribe")
async def transcribe_audio(file: UploadFile = File(...), language: str = "auto"):
    temp_in = tempfile.NamedTemporaryFile(suffix=Path(file.filename or "audio.webm").suffix, delete=False)
    temp_path = Path(temp_in.name)
    try:
        content = await file.read()
        temp_in.write(content)
        temp_in.close()
        text = await stt_engine.transcribe(temp_path, language=language)
        return {"text": text}
    finally:
        if temp_path.exists():
            os.remove(temp_path)

