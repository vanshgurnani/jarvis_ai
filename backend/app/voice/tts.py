import os
import subprocess
import tempfile
from pathlib import Path
from app.core.config import settings
from app.voice.lang_detect import detect_language

class TTSEngine:
    @staticmethod
    async def synthesize_to_file(text: str) -> Path:
        """
        Synthesize speech from text. Tries edge-tts first; falls back to macOS native `say`.
        Returns the path to the generated audio file.
        """
        lang = detect_language(text)
        voice = settings.TTS_VOICE_HI if (lang in ["hi-IN", "hinglish"]) else settings.TTS_VOICE_EN

        # Try edge-tts if installed
        try:
            import edge_tts
            temp_output = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
            temp_path = Path(temp_output.name)
            temp_output.close()

            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(str(temp_path))
            return temp_path
        except Exception:
            # Fallback to native macOS say command producing AIFF then converting to WAV/playable
            temp_output = tempfile.NamedTemporaryFile(suffix=".aiff", delete=False)
            temp_path = Path(temp_output.name)
            temp_output.close()
            subprocess.run(["say", "-o", str(temp_path), text], check=False)
            return temp_path

tts_engine = TTSEngine()

