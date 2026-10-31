from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class ConversationModel(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True, default="default")
    role = Column(String(32))  # 'user', 'assistant', 'system', 'tool'
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class FactModel(Base):
    __tablename__ = "facts"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(64), default="general")  # 'preference', 'routine', 'project', etc.
    fact = Column(Text, nullable=False)
    approved = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ApprovalModel(Base):
    __tablename__ = "approvals"

    id = Column(String(64), primary_key=True, index=True)
    tool_name = Column(String(128), nullable=False)
    arguments_json = Column(Text, nullable=False)
    status = Column(String(32), default="pending")  # 'pending', 'approved', 'rejected'
    created_at = Column(DateTime, default=datetime.utcnow)

