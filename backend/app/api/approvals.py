from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter()

class ApprovalAction(BaseModel):
    decision: str  # "approve" or "reject"

@router.post("/approvals/{approval_id}")
async def handle_approval(approval_id: str, action: ApprovalAction):
    return {
        "approval_id": approval_id,
        "decision": action.decision,
        "status": "processed"
    }

