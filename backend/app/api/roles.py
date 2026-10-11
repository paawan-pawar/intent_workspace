from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

class Role(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    widgets: List[str]

@router.get("/roles", response_model=List[Role])
async def get_roles():
    """
    Get the available professional roles for the onboarding flow.
    """
    return [
        {
            "id": "software-engineer",
            "name": "Software Engineer",
            "description": "Code, review, and deploy with complete visibility.",
            "icon": "code",
            "widgets": ["sprint board", "assigned tickets", "pull requests", "incidents", "calendar", "messages"]
        },
        {
            "id": "doctor",
            "name": "Doctor",
            "description": "Focus on patient care with an organized daily schedule.",
            "icon": "stethoscope",
            "widgets": ["patient schedule", "appointments", "lab results", "prescriptions", "notes", "messages"]
        },
        {
            "id": "trader",
            "name": "Trader",
            "description": "Monitor the markets and manage your portfolios in real-time.",
            "icon": "trending-up",
            "widgets": ["market watch", "portfolio", "watchlist", "risk alerts", "news", "calendar"]
        },
        {
            "id": "salesperson",
            "name": "Salesperson",
            "description": "Track leads, close deals, and hit your quotas.",
            "icon": "briefcase",
            "widgets": ["lead pipeline", "recent contacts", "tasks", "meeting notes", "performance metrics", "inbox"]
        },
        {
            "id": "project-manager",
            "name": "Project Manager",
            "description": "Keep teams aligned and deliver projects on time.",
            "icon": "kanban",
            "widgets": ["project roadmap", "team velocity", "blockers", "milestones", "resource allocation", "updates"]
        },
        {
            "id": "student",
            "name": "Student",
            "description": "Manage assignments, exams, and study schedules.",
            "icon": "graduation-cap",
            "widgets": ["class schedule", "assignments due", "grades", "study timer", "notes", "university news"]
        }
    ]
