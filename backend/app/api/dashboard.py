from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.services.dashboard_service import get_dashboard_plan

router = APIRouter()

class Widget(BaseModel):
    id: str
    type: str
    title: str
    span: int = Field(ge=1, le=4)
    order: int
    visible: bool
    data: Dict[str, Any]
    reason: str
    actions: List[str]
    is_ai_suggested: Optional[bool] = False

class DashboardPlan(BaseModel):
    role: str
    title: str
    explanation: str
    clarificationQuestion: Optional[str] = None
    widgets: List[Widget]

@router.get("/dashboard/{role}", response_model=DashboardPlan)
async def get_dashboard(role: str):
    """
    Get the default dashboard plan for a specific role.
    """
    return get_dashboard_plan(role)
