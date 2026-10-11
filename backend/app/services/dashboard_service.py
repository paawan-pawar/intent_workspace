from app.data.mock_data import (
    CALENDAR_EVENTS, MESSAGES, TASKS,
    ENGINEERING_DATA, HEALTHCARE_DATA, TRADING_DATA, COMMON_DATA
)

def get_base_widgets(role_id: str):
    """Return common widgets everyone gets."""
    return [
        {
            "id": "cmn-0", "type": "daily_briefing", "title": "Daily Briefing", "span": 4, "order": 1, "visible": True,
            "data": COMMON_DATA["daily_briefing"],
            "reason": "Summary of your day.",
            "actions": []
        },
        {
            "id": "cmn-1", "type": "calendar", "title": "Schedule", "span": 2, "order": 10, "visible": True,
            "data": {"demo_label": "Demo data", "events": CALENDAR_EVENTS},
            "reason": "You have upcoming events today.",
            "actions": ["Open Calendar"]
        },
        {
            "id": "cmn-2", "type": "messages", "title": "Inbox", "span": 2, "order": 11, "visible": True,
            "data": {"demo_label": "Demo data", "messages": MESSAGES},
            "reason": "You have 1 unread message.",
            "actions": ["Compose", "View All"]
        },
        {
            "id": "cmn-3", "type": "tasks", "title": "My Tasks", "span": 2, "order": 12, "visible": True,
            "data": {"demo_label": "Demo data", "tasks": TASKS},
            "reason": "1 High priority task due today.",
            "actions": ["Add Task"]
        }
    ]

def get_dashboard_plan(role: str):
    base = get_base_widgets(role)
    
    if role == "software-engineer":
        role_widgets = [
            {
                "id": "se-1", "type": "sprint_board", "title": "Active Sprint", "span": 4, "order": 1, "visible": True,
                "data": {"demo_label": "Demo data", "sprint": ENGINEERING_DATA["sprint"]},
                "reason": "Your sprint ends in 4 days. 3 tickets are in progress.",
                "actions": ["View Board"]
            },
            {
                "id": "se-2", "type": "incidents", "title": "Active Incidents", "span": 2, "order": 2, "visible": True,
                "data": {"demo_label": "Demo data", "incidents": ENGINEERING_DATA["incidents"]},
                "reason": "High severity incident detected in production.",
                "actions": ["Acknowledge"]
            },
            {
                "id": "se-3", "type": "pull_requests", "title": "Pull Requests", "span": 2, "order": 3, "visible": True,
                "data": {"demo_label": "Demo data", "prs": ENGINEERING_DATA["pull_requests"]},
                "reason": "1 PR requires your review.",
                "actions": ["Review PRs"]
            },
            {
                "id": "se-4", "type": "meeting_summary", "title": "Last Sync Summary", "span": 2, "order": 4, "visible": True,
                "data": {"demo_label": "Demo data", "summary": ENGINEERING_DATA["meeting_summary"]},
                "reason": "You have action items from the Architecture Sync.",
                "actions": ["View Notes"]
            },
            {
                "id": "se-5", "type": "meeting_notes", "title": "Quick Notes", "span": 2, "order": 5, "visible": True,
                "data": {"demo_label": "Demo data", "content": "- Remind ops about the new env vars\n- Check log aggregation metrics"},
                "reason": "Your active scratchpad.",
                "actions": ["Open Notes"]
            }
        ]
        return {
            "role": role,
            "title": "Engineering Workspace (Demo)",
            "explanation": "Based on your role, we've prioritized sprint progress, active incidents, and code reviews to keep you in flow.",
            "widgets": role_widgets + base
        }
        
    elif role == "doctor":
        role_widgets = [
            {
                "id": "doc-1", "type": "patient_schedule", "title": "Today's Patients", "span": 3, "order": 1, "visible": True,
                "data": {"demo_label": "Demo data", "patients": HEALTHCARE_DATA["patients"]},
                "reason": "You have 3 patients lined up for this morning.",
                "actions": ["View Schedule"]
            },
            {
                "id": "doc-2", "type": "lab_results", "title": "Urgent Lab Results", "span": 1, "order": 2, "visible": True,
                "data": {"demo_label": "Demo data", "results": HEALTHCARE_DATA["lab_results"]},
                "reason": "1 lab result is abnormal and requires review.",
                "actions": ["Review All"]
            },
            {
                "id": "doc-3", "type": "meeting_summary", "title": "Morning Handover", "span": 2, "order": 3, "visible": True,
                "data": {"demo_label": "Demo data", "summary": HEALTHCARE_DATA["meeting_summary"]},
                "reason": "Action items from Ward Handover.",
                "actions": ["View Full Notes"]
            }
        ]
        return {
            "role": role,
            "title": "Clinical Workspace (Demo)",
            "explanation": "We've organized your patient schedule and urgent lab results for your rounds.",
            "widgets": role_widgets + base
        }
        
    elif role == "trader":
        role_widgets = [
            {
                "id": "trd-1", "type": "market_watch", "title": "Market Watch", "span": 4, "order": 1, "visible": True,
                "data": {"demo_label": "Demo data", "indices": TRADING_DATA["market_watch"]},
                "reason": "Major indices are volatile today.",
                "actions": ["View Charts"]
            },
            {
                "id": "trd-2", "type": "portfolio", "title": "Portfolio Position", "span": 2, "order": 2, "visible": True,
                "data": {"demo_label": "Demo data", "portfolio": TRADING_DATA["portfolio"]},
                "reason": "Your portfolio is outperforming the benchmark.",
                "actions": ["Rebalance"]
            },
            {
                "id": "trd-3", "type": "risk_alerts", "title": "Risk Alerts", "span": 2, "order": 3, "visible": True,
                "data": {"demo_label": "Demo data", "alerts": TRADING_DATA["risk_alerts"]},
                "reason": "Volatility detected in TSLA.",
                "actions": ["Manage Risk"]
            },
            {
                "id": "trd-4", "type": "meeting_summary", "title": "Strategy Briefing", "span": 2, "order": 4, "visible": True,
                "data": {"demo_label": "Demo data", "summary": TRADING_DATA["meeting_summary"]},
                "reason": "Macro strategy adjustments needed.",
                "actions": ["View Notes"]
            }
        ]
        return {
            "role": role,
            "title": "Trading Desk (Demo)",
            "explanation": "Your workspace highlights market volatility, portfolio risk, and active positions.",
            "widgets": role_widgets + base
        }
        
    else:
        # Fallback generic
        return {
            "role": role,
            "title": f"{role.replace('-', ' ').title()} Workspace (Demo)",
            "explanation": "Here is a generic workspace tailored to your profession.",
            "widgets": base
        }
