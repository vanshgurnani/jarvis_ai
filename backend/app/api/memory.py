from fastapi import APIRouter
from pydantic import BaseModel
from app.memory.sqlite import get_recent_messages, clear_conversation, get_all_facts, save_fact, delete_fact

router = APIRouter()

class FactCreate(BaseModel):
    fact: str
    category: str = "general"

@router.get("/conversations")
async def get_conversations(session_id: str = "default", limit: int = 50):
    messages = await get_recent_messages(session_id=session_id, limit=limit)
    return {"messages": messages}

@router.delete("/conversations")
async def reset_conversation(session_id: str = "default"):
    await clear_conversation(session_id=session_id)
    return {"status": "cleared", "session_id": session_id}

@router.get("/memory")
async def list_facts():
    facts = await get_all_facts()
    return {"facts": facts}

@router.post("/memory")
async def add_fact(body: FactCreate):
    fid = await save_fact(fact=body.fact, category=body.category)
    return {"status": "saved", "id": fid}

@router.delete("/memory/{fact_id}")
async def remove_fact(fact_id: int):
    await delete_fact(fact_id)
    return {"status": "deleted", "id": fact_id}

