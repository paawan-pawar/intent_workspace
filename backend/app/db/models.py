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


class GmailConnection(Base):
    """Tracks Gmail integration connection state and tokens."""
    __tablename__ = "gmail_connections"

    id = Column(String, primary_key=True, index=True)          # "gmail"
    provider = Column(String, nullable=False, default="Gmail")
    connected = Column(Boolean, default=False)
    demo_mode = Column(Boolean, default=True)
    last_sync_at = Column(Float, default=None, nullable=True)   # Unix timestamp
    sync_error = Column(Text, default=None, nullable=True)
    message_count = Column(Integer, default=0)
    credentials_configured = Column(Boolean, default=False)
    email_address = Column(String, nullable=True)               # Connected Gmail address
    # OAuth tokens — stored server-side only, never exposed to frontend
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(Float, nullable=True)                 # Unix timestamp
    # Gmail history ID for incremental sync
    history_id = Column(String, nullable=True)
    # Pub/Sub watch expiration (Unix timestamp ms)
    watch_expiration = Column(Float, nullable=True)
    # Last sync result message for display
    last_sync_result = Column(Text, nullable=True)
    # Unread count cache
    unread_count = Column(Integer, default=0)


class SheetRecord(Base):
    __tablename__ = "sheets"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    source = Column(String, nullable=False)
    file_name = Column(String, nullable=True)
    file_size = Column(Integer, nullable=False, default=0)
    updated_at = Column(String, nullable=False)
    row_count = Column(Integer, nullable=False, default=0)
    column_count = Column(Integer, nullable=False, default=0)
    columns = Column(JSON, nullable=False, default=list)
    rows = Column(JSON, nullable=False, default=list)
    status = Column(String, nullable=False, default="not_analyzed")
    analysis = Column(JSON, nullable=True)


class SheetSuggestedTask(Base):
    __tablename__ = "sheet_suggested_tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    priority = Column(String, nullable=False, default="medium")
    due_date = Column(String, nullable=True)
    status = Column(String, nullable=False, default="todo")
    sheet_id = Column(String, nullable=False, index=True)
    sheet_name = Column(String, nullable=False)
    metric = Column(String, nullable=True)
    ai_suggested = Column(Boolean, nullable=False, default=True)
    created_at = Column(String, nullable=False)


class SheetInsightNote(Base):
    __tablename__ = "sheet_insight_notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    preview = Column(Text, nullable=False)
    sheet_id = Column(String, nullable=False, index=True)
    sheet_name = Column(String, nullable=False)
    created_at = Column(String, nullable=False)


class SheetGoal(Base):
    __tablename__ = "sheet_goals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    target_value = Column(Float, nullable=False)
    current_value = Column(Float, nullable=False)
    baseline_value = Column(Float, nullable=False)
    deadline = Column(String, nullable=False)
    direction = Column(String, nullable=False, default="increase")
    sheet_id = Column(String, nullable=False, index=True)
    sheet_name = Column(String, nullable=False)
    metric = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)


class CalendarSheetAttachment(Base):
    __tablename__ = "calendar_sheet_attachments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(Integer, nullable=False, index=True)
    sheet_id = Column(String, nullable=False, index=True)
    attached_at = Column(String, nullable=False)