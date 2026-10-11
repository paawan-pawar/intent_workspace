from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.ai_service import generate_dashboard_update
from app.api.dashboard import DashboardPlan

router = APIRouter()

class PromptRequest(BaseModel):
    prompt: str
    role: str
    currentWidgets: List[Dict[str, Any]]
    pinnedIds: List[str] = []
    hiddenIds: List[str] = []

@router.post("/prompt", response_model=DashboardPlan)
async def process_prompt(request: PromptRequest):
    """
    Process an intent prompt to dynamically update the dashboard plan.
    """
    try:
        # Call the AI service to generate a new dashboard structure
        result = await generate_dashboard_update(
            prompt=request.prompt,
            role=request.role,
            current_widgets=request.currentWidgets,
            pinned_ids=request.pinnedIds,
            hidden_ids=request.hiddenIds
        )
        
        # Format the result back into the standard DashboardPlan structure
        # (Assuming the DashboardPlan model gets extended with clarificationQuestion below)
        return result.model_dump()
        
    except Exception as e:
        print(f"Error processing prompt: {e}")
        # Safe fallback
        return {
            "role": request.role,
            "title": "Fallback Workspace",
            "explanation": "Something went wrong while applying your prompt. Returned your previous widgets safely.",
            "clarificationQuestion": None,
            "widgets": request.currentWidgets
        }
