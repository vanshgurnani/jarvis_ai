from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, delete
from app.core.config import settings
from app.memory.models import Base, ConversationModel, FactModel, ApprovalModel

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session_factory = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def save_message(session_id: str, role: str, content: str):
    async with async_session_factory() as session:
        msg = ConversationModel(session_id=session_id, role=role, content=content)
        session.add(msg)
        await session.commit()

async def get_recent_messages(session_id: str = "default", limit: int = 20) -> List[Dict[str, Any]]:
    async with async_session_factory() as session:
        query = (
            select(ConversationModel)
            .where(ConversationModel.session_id == session_id)
            .order_by(ConversationModel.id.desc())
            .limit(limit)
        )
        res = await session.execute(query)
        rows = res.scalars().all()
        # Return in chronological order
        return [
            {"id": r.id, "role": r.role, "content": r.content, "created_at": r.created_at.isoformat()}
            for r in reversed(rows)
        ]

async def clear_conversation(session_id: str = "default"):
    async with async_session_factory() as session:
        query = delete(ConversationModel).where(ConversationModel.session_id == session_id)
        await session.execute(query)
        await session.commit()

async def save_fact(fact: str, category: str = "general") -> int:
    async with async_session_factory() as session:
        f = FactModel(fact=fact, category=category, approved=True)
        session.add(f)
        await session.commit()
        return f.id

async def get_all_facts() -> List[Dict[str, Any]]:
    async with async_session_factory() as session:
        res = await session.execute(select(FactModel).order_by(FactModel.id.desc()))
        return [
            {"id": f.id, "fact": f.fact, "category": f.category, "approved": f.approved, "created_at": f.created_at.isoformat()}
            for f in res.scalars().all()
        ]

async def delete_fact(fact_id: int):
    async with async_session_factory() as session:
        await session.execute(delete(FactModel).where(FactModel.id == fact_id))
        await session.commit()

