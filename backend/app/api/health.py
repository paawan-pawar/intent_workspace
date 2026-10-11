from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone

router = APIRouter()

class HealthResponse(BaseModel):
    status: str
    message: str
    timestamp: str

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Basic health check endpoint.
    Used by the frontend to verify backend connectivity.
    """
    return HealthResponse(
        status="ok",
        message="Backend connected",
        timestamp=datetime.now(timezone.utc).isoformat()
    )
