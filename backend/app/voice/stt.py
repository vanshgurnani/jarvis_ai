import os
from pathlib import Path

class STTEngine:
    @staticmethod
    async def transcribe(audio_path: Path, language: str = "en") -> str:
        """
        Transcribe audio file.
        In Phase 1, provides fallback or faster-whisper integration.
        """
        try:
            # Check if faster-whisper is installed
            from faster_whisper import WhisperModel
            model = WhisperModel("base", device="cpu", compute_type="int8")
            segments, _ = model.transcribe(str(audio_path), language=language if language != "auto" else None)
            return " ".join([seg.text for seg in segments]).strip()
        except ImportError:
            return "[Voice input received - faster-whisper can be installed via 'pip install faster-whisper']"
        except Exception as e:
            return f"[Transcription error: {str(e)}]"

stt_engine = STTEngine()

