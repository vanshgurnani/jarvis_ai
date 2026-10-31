import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HOST: str = "127.0.0.1"
    PORT: int = 8765
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "info"
    AUTH_TOKEN: str = "friday-dev-secret-token"

    # LLM Provider Selection: "custom_llm", "llama_gateway", "cloudflare_worker", "mock"
    LLM_PROVIDER: str = "custom_llm"

    # Custom LLM / Gateway Settings
    CUSTOM_LLM_URL: str = "https://llama-api-gateway.onrender.com"
    CUSTOM_LLM_TOKEN: str = "Tw23BYtHmaAz9o/K76ZzCS6wNOnLSWrz47PqPa+dWyM="
    CUSTOM_LLM_MODEL: str = "@cf/meta/llama-3.2-3b-instruct"

    # Backward compatible Llama Gateway Settings
    LLAMA_GATEWAY_URL: str = "https://llama-api-gateway.onrender.com"
    LLAMA_GATEWAY_TOKEN: str = "Tw23BYtHmaAz9o/K76ZzCS6wNOnLSWrz47PqPa+dWyM="
    LLAMA_GATEWAY_MODEL: str = "@cf/meta/llama-3.2-3b-instruct"

    CLOUDFLARE_WORKER_URL: str = "http://localhost:8787/chat"
    CLOUDFLARE_WORKER_AUTH_TOKEN: str = ""
    CLOUDFLARE_MODEL_NAME: str = "meta-llama/Meta-Llama-3.1-8B-Instruct"

    # Fallback Direct Provider
    FALLBACK_OPENAI_API_KEY: str = ""
    FALLBACK_OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    FALLBACK_MODEL: str = "gpt-4o-mini"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///friday.db"

    # Persona & Voice
    DEFAULT_LOCALE: str = "en-IN"
    ENABLE_HINGLISH: bool = True
    TTS_ENGINE: str = "edge-tts"
    TTS_VOICE_HI: str = "hi-IN-SwaraNeural"
    TTS_VOICE_EN: str = "en-IN-NeerjaNeural"

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    PERSONA_PATH: Path = BASE_DIR / "persona.yaml"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
