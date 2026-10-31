import json
from fastapi import APIRouter, Request
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from app.core.agent import agent_loop

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    async def event_generator():
        async for chunk in agent_loop.run(session_id=req.session_id, user_message=req.message):
            yield {
                "event": "message",
                "data": json.dumps(chunk)
            }

    return EventSourceResponse(event_generator())

