from sqlalchemy import Column, String, JSON, Integer, Text, Boolean, Float
from app.db.database import Base

class Preference(Base):
    __tablename__ = "preferences"

    role_id = Column(String, primary_key=True, index=True)
    pinned_ids = Column(JSON, default=list)
    hidden_ids = Column(JSON, default=list)
    widget_order = Column(JSON, default=dict)
    widget_spans = Column(JSON, default=dict)
    saved_layouts = Column(JSON, default=dict)


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    date = Column(String, nullable=False)          # ISO date: "2026-10-11"
    start_time = Column(String, nullable=False)     # "HH:MM" 24h format
    end_time = Column(String, nullable=False)       # "HH:MM" 24h format
    location = Column(String, default="")
    attendees = Column(JSON, default=list)           # list of strings
    calendar = Column(String, default="work")        # "work" | "personal"
    sync_status = Column(String, default="local")    # "local" | "synced" | "pending" | "failed" | "demo"
    google_event_id = Column(String, nullable=True, index=True)  # Google Calendar event ID for dedup
    google_etag = Column(String, nullable=True)      # Google etag for conflict detection


class CalendarConnection(Base):
    """Tracks integration connections (e.g. Google Calendar)."""
    __tablename__ = "calendar_connections"

    id = Column(String, primary_key=True, index=True)          # e.g. "google-calendar"
    provider = Column(String, nullable=False)                   # "Google Calendar"
    connected = Column(Boolean, default=False)
    demo_mode = Column(Boolean, default=True)
    last_sync_at = Column(Float, default=None, nullable=True)   # Unix timestamp
    sync_error = Column(Text, default=None, nullable=True)
    event_count = Column(Integer, default=0)
    credentials_configured = Column(Boolean, default=False)
    # OAuth tokens — stored server-side only, never exposed to frontend
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(Float, nullable=True)                 # Unix timestamp
    # Google Calendar incremental sync token
    google_sync_token = Column(String, nullable=True)
    # Last sync result message for display
    last_sync_result = Column(Text, nullable=True)