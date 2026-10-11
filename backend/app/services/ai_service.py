import os
import json
import logging
from openai import AsyncOpenAI
from app.services.dashboard_service import get_dashboard_plan
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Re-defining models here for the AI generation to be validated
class WidgetPlan(BaseModel):
    id: str
    type: str
    title: str
    span: int
    order: int
    visible: bool
    data: Dict[str, Any]
    reason: str
    actions: List[str]
    is_ai_suggested: Optional[bool] = False

class AIPromptResponse(BaseModel):
    role: str
    title: str
    explanation: str
    clarificationQuestion: Optional[str] = None
    widgets: List[WidgetPlan] = []

SYSTEM_PROMPT = """
You are the Intent Workspace AI Planner. Your job is to adapt the user's dashboard based on their professional role and current goal/prompt.

Rules:
1. Understand the user's professional role and their request.
2. Keep the dashboard focused with 3–6 widgets by default.
3. Select ONLY from the allowed widget catalog: messages, calendar, meeting_summary, meeting_notes, tasks, follow_ups, sprint_board, pull_requests, incidents, patient_schedule, lab_results, market_watch, portfolio, risk_alerts, custom.
4. Add a meeting scheduler, calendar availability, and discussion-points widget when the user asks to schedule or prepare for a meeting.
5. Add task and follow-up widgets when the user asks to track work.
6. Do NOT invent real meetings, clients, patients, trades, or tasks. Use generic or clearly labeled mock data (e.g., "demo_label": "Demo data").
7. Preserve any pinned widgets (marked as pinned in the input) by keeping them in the list.
8. Remove any hidden widgets (do not include them).
9. Reorder widgets so the most relevant to the prompt are first.
10. Do NOT generate React, HTML, CSS, or arbitrary UI code. You must output ONLY valid JSON.
11. If the prompt is highly ambiguous or lacks enough intent to make a decision, set the "clarificationQuestion" string instead of guessing, and leave "widgets" as the current ones.
12. Return a short, friendly "explanation" for why the dashboard changed.

You MUST respond strictly with a valid JSON matching this schema:
{
  "role": "string",
  "title": "string",
  "explanation": "string",
  "clarificationQuestion": "string or null",
  "widgets": [
    {
      "id": "string", "type": "string", "title": "string", "span": 1-4, "order": 1, "visible": true,
      "data": {"demo_label": "Demo data", ...},
      "reason": "string",
      "actions": ["string"],
      "is_ai_suggested": true
    }
  ]
}
"""

async def generate_dashboard_update(prompt: str, role: str, current_widgets: List[Dict[str, Any]], pinned_ids: List[str], hidden_ids: List[str]) -> AIPromptResponse:
    # Try using OpenAI if configured
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        try:
            client = AsyncOpenAI(api_key=api_key)
            user_message = f"""
Role: {role}
Current Goal/Prompt: {prompt}
Current Widgets: {json.dumps(current_widgets)}
Pinned Widget IDs (Must Keep): {pinned_ids}
Hidden Widget IDs (Must Drop): {hidden_ids}

Return the adapted dashboard plan JSON.
"""
            response = await client.chat.completions.create(
                model="gpt-4o",  # or a similar JSON supporting model
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message}
                ],
                response_format={"type": "json_object"},
                temperature=0.7
            )
            
            content = response.choices[0].message.content
            parsed = json.loads(content)
            return AIPromptResponse(**parsed)
        except Exception as e:
            logger.error(f"OpenAI API failed: {e}")
            # Fall back to simulation on error
            pass

    # Simulation fallback if no key or API fails (Local prototype logic)
    # We'll simulate a basic response that adds a "meeting_notes" and "tasks" if it mentions "meeting", etc.
    return _simulate_ai_response(prompt, role, current_widgets, pinned_ids, hidden_ids)

def _simulate_ai_response(prompt: str, role: str, current_widgets: List[Dict], pinned_ids: List[str], hidden_ids: List[str]) -> AIPromptResponse:
    lower_prompt = prompt.lower()
    
    # Simulate a clarification
    if len(prompt.strip()) < 4 or "help" in lower_prompt:
        return AIPromptResponse(
            role=role,
            title=f"{role.replace('-', ' ').title()} Workspace (Demo)",
            explanation="I need a bit more context.",
            clarificationQuestion="What specific task or meeting are you preparing for?",
            widgets=current_widgets
        )
        
    widgets_to_keep = []
    
    # Always keep pinned
    for w in current_widgets:
        if w["id"] in pinned_ids:
            widgets_to_keep.append(w)
            
    # Add newly requested context
    new_widgets = []
    
    # Specific Demo Scenario Check
    if "schedule" in lower_prompt and "points to discuss" in lower_prompt:
        new_widgets = [
            {
                "id": "demo-cal", "type": "calendar", "title": "Available meeting slots", "span": 2, "order": 1, "visible": True,
                "data": {"demo_label": "Demo data", "events": [{"time": "1:00 PM - 2:00 PM", "title": "Free Block"}, {"time": "3:30 PM - 4:30 PM", "title": "Free Block"}]},
                "reason": "Calendar was added to find available slots.",
                "actions": [],
                "is_ai_suggested": True
            },
            {
                "id": "demo-sched", "type": "meeting_scheduler", "title": "Schedule meeting", "span": 2, "order": 2, "visible": True,
                "data": {"demo_label": "Demo data"},
                "reason": "Scheduler was added to create the meeting.",
                "actions": [],
                "is_ai_suggested": True
            },
            {
                "id": "demo-pts", "type": "meeting_summary", "title": "Points to discuss", "span": 2, "order": 3, "visible": True,
                "data": {
                    "demo_label": "Demo data", 
                    "summary": {
                        "agenda": ["Review Q3 KPIs", "Discuss budget allocation", "Approve hiring plan"],
                        "questions": ["Are we on track for Q4?", "Do we need contractor budget?"],
                        "decisions": ["Finalize marketing spend", "Lock in release date"],
                        "risks": ["Vendor delay in EU", "Resource constraints in engineering"],
                        "follow_ups": ["Send updated deck", "Confirm with legal"]
                    }
                },
                "reason": "Discussion points were added to prepare for the meeting.",
                "actions": ["Edit Points"],
                "is_ai_suggested": True
            },
            {
                "id": "demo-tasks", "type": "tasks", "title": "Follow-up tasks", "span": 2, "order": 4, "visible": True,
                "data": {"demo_label": "Demo data", "tasks": [{"title": "Send pre-read materials", "due_date": "Today", "priority": "High", "completed": False}]},
                "reason": "Follow-up tasks were added to track actions after the meeting.",
                "actions": ["Confirm Tasks"],
                "is_ai_suggested": True
            },
            {
                "id": "demo-notes", "type": "meeting_notes", "title": "Meeting notes", "span": 4, "order": 5, "visible": True,
                "data": {"demo_label": "Demo data", "content": "Meeting Context:\n\n"},
                "reason": "Scratchpad for meeting minutes.",
                "actions": ["Save Notes"],
                "is_ai_suggested": True
            }
        ]
        
        return AIPromptResponse(
            role=role,
            title="Meeting Prep Workspace",
            explanation="Why these sections? Calendar was added to find available slots. Scheduler was added to create the meeting. Discussion points were added to prepare for the meeting. Follow-up tasks were added to track actions after the meeting.",
            widgets=new_widgets
        )

    if "meeting" in lower_prompt:
        new_widgets.append({
            "id": "ai-1", "type": "meeting_notes", "title": "Meeting Prep", "span": 2, "order": 1, "visible": True,
            "data": {"demo_label": "Demo data", "content": "- Review status\n- Ask about timelines\n- Assign owners"},
            "reason": "You asked to prepare for a meeting.",
            "actions": ["Save Notes"],
            "is_ai_suggested": True
        })
        new_widgets.append({
            "id": "ai-2", "type": "calendar", "title": "Availability", "span": 2, "order": 2, "visible": True,
            "data": {"demo_label": "Demo data", "events": [{"time": "Free: 2pm - 4pm", "title": "Open block"}]},
            "reason": "To help schedule your meeting.",
            "actions": ["Open Calendar"],
            "is_ai_suggested": True
        })
    elif "overdue" in lower_prompt or "work" in lower_prompt:
         new_widgets.append({
            "id": "ai-3", "type": "tasks", "title": "Overdue & Urgent", "span": 2, "order": 1, "visible": True,
            "data": {"demo_label": "Demo data", "tasks": [{"title": "Update TPS report", "due_date": "Yesterday", "completed": False, "priority": "High"}]},
            "reason": "You asked to see overdue work.",
            "actions": ["Confirm Priorities"],
            "is_ai_suggested": True
        })
    elif "follow" in lower_prompt or "summarize" in lower_prompt:
        new_widgets.append({
            "id": "ai-4", "type": "messages", "title": "Unanswered Emails", "span": 2, "order": 1, "visible": True,
            "data": {"demo_label": "Demo data", "messages": [{"sender": "Boss", "subject": "Status?", "preview": "Need this EOD", "unread": True, "time": "1h ago"}]},
            "reason": "Found unread communications to summarize and follow up on.",
            "actions": ["Reply All"],
            "is_ai_suggested": True
        })
    else:
        # Generic fallback
        new_widgets.append({
            "id": "ai-5", "type": "custom", "title": "AI Assistant", "span": 4, "order": 1, "visible": True,
            "data": {"demo_label": "Demo data"},
            "reason": f"Adapted for your request: {prompt}",
            "actions": [],
            "is_ai_suggested": True
        })
        
    combined = new_widgets + widgets_to_keep
    # Ensure no hidden widgets
    combined = [w for w in combined if w["id"] not in hidden_ids]
    
    # Fix order
    for i, w in enumerate(combined):
        w["order"] = i + 1

    return AIPromptResponse(
        role=role,
        title="Custom Intent Workspace",
        explanation=f"I've updated your dashboard based on: '{prompt}'.",
        widgets=combined
    )
