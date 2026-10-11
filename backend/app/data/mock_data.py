from datetime import datetime, timedelta

# Shared Common Data
USERS = [
    {"id": "u1", "name": "Alice Johnson", "role": "software-engineer"},
    {"id": "u2", "name": "Dr. Sarah Chen", "role": "doctor"},
    {"id": "u3", "name": "Marcus Wright", "role": "trader"}
]

now = datetime.now()

CALENDAR_EVENTS = [
    {"id": "c1", "title": "Daily Standup", "time": (now.replace(hour=10, minute=0)).strftime("%I:%M %p"), "type": "meeting", "attendees": 5},
    {"id": "c2", "title": "Project Sync", "time": (now.replace(hour=13, minute=30)).strftime("%I:%M %p"), "type": "meeting", "attendees": 3},
    {"id": "c3", "title": "Performance Review", "time": (now + timedelta(days=1)).replace(hour=11, minute=0).strftime("%I:%M %p"), "type": "1-on-1", "attendees": 2},
]

MESSAGES = [
    {"id": "m1", "sender": "David (Product)", "subject": "Requirement Update", "preview": "Can we adjust the scope for the Q3 deliverable?", "unread": True, "time": "10m ago"},
    {"id": "m2", "sender": "System Alerts", "subject": "Action Required", "preview": "Your password will expire in 3 days.", "unread": False, "time": "2h ago"},
    {"id": "m3", "sender": "HR Dept", "subject": "Upcoming Holiday", "preview": "Reminder about the upcoming office closure.", "unread": False, "time": "1d ago"}
]

TASKS = [
    {"id": "t1", "title": "Review Q3 Roadmap", "owner": "Self", "due_date": "Today", "priority": "High", "completed": False},
    {"id": "t2", "title": "Submit expense report", "owner": "Self", "due_date": "Tomorrow", "priority": "Medium", "completed": False},
    {"id": "t3", "title": "Complete compliance training", "owner": "Self", "due_date": "Next Week", "priority": "Low", "completed": True}
]

COMMON_DATA = {
    "daily_briefing": {
        "demo_label": "Demo data",
        "briefing": "You have 3 meetings today including a Q4 Planning Sync. 2 high priority emails require attention. Your TPS report task is overdue."
    }
}

# Role-specific Data
# Software Engineering
ENGINEERING_DATA = {
    "sprint": {
        "name": "Sprint 42",
        "progress": 65,
        "days_left": 4,
        "tickets": {
            "todo": [{"id": "ENG-102", "title": "Implement cache layer", "points": 5}],
            "in_progress": [{"id": "ENG-101", "title": "Fix auth race condition", "points": 8}, {"id": "ENG-105", "title": "Update React 18", "points": 3}],
            "review": [{"id": "ENG-98", "title": "Optimize DB queries", "points": 5}],
            "done": [{"id": "ENG-95", "title": "Setup CI/CD", "points": 3}]
        }
    },
    "pull_requests": [
        {"id": "PR-142", "title": "feat: new dashboard layout", "author": "Alice", "status": "needs_review", "comments": 2},
        {"id": "PR-141", "title": "fix: mobile nav overflow", "author": "Bob", "status": "approved", "comments": 0}
    ],
    "incidents": [
        {"id": "INC-893", "title": "API Latency Spike in US-East", "severity": "High", "status": "Investigating", "started": "15m ago"}
    ],
    "meeting_summary": {
        "title": "Architecture Review Sync",
        "participants": ["Alice", "Bob", "Tech Lead"],
        "decisions": ["Migrate to Postgres", "Keep Redis for caching"],
        "action_items": ["Alice: Draft migration plan", "Bob: Verify Redis instance size"],
        "discussion": "Discussed the pros and cons of moving away from NoSQL to a relational model for the user service."
    }
}

# Healthcare
HEALTHCARE_DATA = {
    "patients": [
        {"id": "P-001", "name": "Emma Watson", "time": "09:00 AM", "type": "Annual Physical", "status": "Checked In"},
        {"id": "P-002", "name": "James Smith", "time": "09:45 AM", "type": "Follow-up", "status": "Waiting"},
        {"id": "P-003", "name": "Maria Garcia", "time": "10:30 AM", "type": "Lab Results Review", "status": "Not Arrived"}
    ],
    "lab_results": [
        {"id": "L-101", "patient": "John Doe", "test": "Lipid Panel", "status": "Abnormal", "flag": "High LDL"},
        {"id": "L-102", "patient": "Robert G.", "test": "CBC", "status": "Normal", "flag": "None"}
    ],
    "prescriptions": [
        {"patient": "Sarah W.", "drug": "Lisinopril 10mg", "status": "Pending Renewal"}
    ],
    "meeting_summary": {
        "title": "Morning Ward Handover",
        "participants": ["Dr. Chen", "Dr. Miller", "Head Nurse"],
        "decisions": ["Move Bed 4 to ICU", "Discharge Bed 12 today"],
        "action_items": ["Dr. Chen: Sign discharge papers for Bed 12", "Nurse: Monitor Bed 4 vitals hourly"],
        "discussion": "Patient in Bed 4 showed irregular heart rate overnight. Bed 12 has made a full recovery."
    }
}

# Trading
TRADING_DATA = {
    "market_watch": [
        {"symbol": "SPY", "price": 450.25, "change": "+1.2%", "trend": "up"},
        {"symbol": "QQQ", "price": 380.10, "change": "+1.5%", "trend": "up"},
        {"symbol": "VIX", "price": 14.50, "change": "-5.4%", "trend": "down"},
        {"symbol": "TLT", "price": 95.20, "change": "-0.2%", "trend": "down"}
    ],
    "portfolio": {
        "total_value": "$1,245,000",
        "daily_change": "+$12,450",
        "daily_change_pct": "+1.01%",
        "holdings": [
            {"asset": "AAPL", "weight": "15%", "pnl": "+4.2%"},
            {"asset": "MSFT", "weight": "12%", "pnl": "+2.1%"},
            {"asset": "TSLA", "weight": "8%", "pnl": "-1.5%"}
        ]
    },
    "risk_alerts": [
        {"asset": "TSLA", "alert": "Volatility Spike > 3z", "level": "High"},
        {"asset": "Portfolio", "alert": "Tech exposure > 40%", "level": "Medium"}
    ],
    "meeting_summary": {
        "title": "Macro Strategy Briefing",
        "participants": ["Marcus", "Lead Quant", "Risk Officer"],
        "decisions": ["Reduce duration exposure", "Increase cash buffer by 5%"],
        "action_items": ["Marcus: Execute bond sales", "Quant: Run stress test on new allocation"],
        "discussion": "Fed hints at higher for longer rates. Need to adjust portfolio duration immediately to minimize impact."
    }
}
