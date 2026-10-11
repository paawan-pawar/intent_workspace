from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any
from app.api.dashboard import DashboardPlan

router = APIRouter()

class ScheduleMeetingRequest(BaseModel):
    title: str
    date: str
    time: str
    duration: str
    attendees: str
    currentPlan: Dict[str, Any]

@router.post("/schedule-meeting", response_model=DashboardPlan)
async def schedule_meeting(request: ScheduleMeetingRequest):
    """
    Simulates scheduling a meeting.
    Takes the current dashboard plan, adds the meeting to the calendar,
    adds a task to follow up, and updates the explanation.
    """
    plan = request.currentPlan
    
    # Add meeting to calendar widget
    for w in plan.get("widgets", []):
        if w["type"] == "calendar":
            events = w["data"].get("events", [])
            events.append({
                "time": request.time,
                "title": request.title,
                "type": "Scheduled Meeting",
                "status": "Confirmed"
            })
            w["data"]["events"] = events
            w["reason"] = f"Newly scheduled meeting: {request.title}"
            
        elif w["type"] == "tasks":
            tasks = w["data"].get("tasks", [])
            tasks.append({
                "title": f"Follow up on '{request.title}'",
                "due_date": request.date,
                "priority": "High",
                "completed": False
            })
            w["data"]["tasks"] = tasks
            w["reason"] = "Added a follow-up task for your new meeting."

    # Update explanation
    plan["explanation"] = f"Successfully scheduled '{request.title}' for {request.date} at {request.time}."
    plan["clarificationQuestion"] = None

    return plan
