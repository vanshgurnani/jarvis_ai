import os
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.core.config import settings
from app.core.agent import agent_loop

router = APIRouter()

class LLMSettingsUpdate(BaseModel):
    provider: Optional[str] = None
    custom_url: Optional[str] = None
    token: Optional[str] = None
    model_name: Optional[str] = None

@router.get("/settings/llm")
async def get_llm_settings():
    token = settings.CUSTOM_LLM_TOKEN or settings.LLAMA_GATEWAY_TOKEN
    preview = f"{token[:4]}...{token[-4:]}" if token and len(token) > 8 else ("***" if token else "")
    return {
        "provider": settings.LLM_PROVIDER,
        "custom_url": settings.CUSTOM_LLM_URL or settings.LLAMA_GATEWAY_URL,
        "model_name": settings.CUSTOM_LLM_MODEL or settings.LLAMA_GATEWAY_MODEL,
        "has_token": bool(token),
        "token_preview": preview,
    }

@router.post("/settings/llm")
async def update_llm_settings(body: LLMSettingsUpdate):
    if body.provider:
        settings.LLM_PROVIDER = body.provider
    if body.custom_url:
        settings.CUSTOM_LLM_URL = body.custom_url
        settings.LLAMA_GATEWAY_URL = body.custom_url
    if body.token is not None:
        settings.CUSTOM_LLM_TOKEN = body.token
        settings.LLAMA_GATEWAY_TOKEN = body.token
    if body.model_name:
        settings.CUSTOM_LLM_MODEL = body.model_name
        settings.LLAMA_GATEWAY_MODEL = body.model_name

    # Reload active provider in memory
    agent_loop.reload_provider(
        provider_type=settings.LLM_PROVIDER,
        custom_url=settings.CUSTOM_LLM_URL,
        auth_token=settings.CUSTOM_LLM_TOKEN,
        model_name=settings.CUSTOM_LLM_MODEL
    )

    return {
        "status": "updated",
        "provider": settings.LLM_PROVIDER,
        "custom_url": settings.CUSTOM_LLM_URL,
        "model_name": settings.CUSTOM_LLM_MODEL,
        "has_token": bool(settings.CUSTOM_LLM_TOKEN)
    }

