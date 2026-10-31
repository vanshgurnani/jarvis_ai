from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "FRIDAY AI Sidecar",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "0.1.0"
    }

