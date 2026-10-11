"""Calendar events CRUD API router.

When a Google Calendar connection is active, CRUD operations are
automatically mirrored to Google Calendar. In demo mode, only local
DB operations are performed.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import CalendarEvent, CalendarConnection
from app.services import google_calendar as gcal

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────

class CalendarEventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    location: str = ""
    attendees: list[str] = []
    calendar: str = Field(default="work", pattern=r"^(work|personal)$")
    sync_status: str = Field(default="local", pattern=r"^(local|synced|pending|failed|demo)$")


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    start_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    end_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    location: Optional[str] = None
    attendees: Optional[list[str]] = None
    calendar: Optional[str] = Field(None, pattern=r"^(work|personal)$")
    sync_status: Optional[str] = Field(None, pattern=r"^(local|synced|pending|failed|demo)$")


class CalendarEventResponse(BaseModel):
    id: int
    title: str
    description: str
    date: str
    start_time: str
    end_time: str
    location: str
    attendees: list[str]
    calendar: str
    sync_status: str

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────

def _row_to_dict(row: CalendarEvent) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "description": row.description or "",
        "date": row.date,
        "start_time": row.start_time,
        "end_time": row.end_time,
        "location": row.location or "",
        "attendees": row.attendees or [],
        "calendar": row.calendar or "work",
        "sync_status": row.sync_status or "local",
    }


async def _get_active_connection(db: AsyncSession) -> Optional[CalendarConnection]:
    """Get the active Google Calendar connection, if any."""
    result = await db.execute(
        select(CalendarConnection).where(
            CalendarConnection.id == "google-calendar",
            CalendarConnection.connected == True,
        )
    )
    return result.scalar_one_or_none()


async def _push_to_google(event: CalendarEvent, conn: CalendarConnection, db: AsyncSession) -> None:
    """Push a local event to Google Calendar. Updates google_event_id on the event."""
    if conn.demo_mode or not conn.access_token:
        return
    
    try:
        body = gcal._local_to_google(event)
        created = gcal.create_google_event(
            conn.access_token, conn.refresh_token, conn.token_expiry, body
        )
        event.google_event_id = created.get("id")
        event.google_etag = created.get("etag")
        event.sync_status = "synced"
    except Exception as e:
        logger.warning(f"Failed to push event {event.id} to Google: {e}")
        event.sync_status = "failed"


async def _update_on_google(event: CalendarEvent, conn: CalendarConnection, db: AsyncSession) -> None:
    """Update an event on Google Calendar."""
    if conn.demo_mode or not conn.access_token or not event.google_event_id:
        return
    
    try:
        body = gcal._local_to_google(event)
        updated = gcal.update_google_event(
            conn.access_token, conn.refresh_token, conn.token_expiry,
            event.google_event_id, body
        )
        event.google_etag = updated.get("etag")
        event.sync_status = "synced"
    except Exception as e:
        logger.warning(f"Failed to update event {event.id} on Google: {e}")
        event.sync_status = "failed"


async def _delete_from_google(event: CalendarEvent, conn: CalendarConnection) -> None:
    """Delete an event from Google Calendar."""
    if conn.demo_mode or not conn.access_token or not event.google_event_id:
        return
    
    try:
        gcal.delete_google_event(
            conn.access_token, conn.refresh_token, conn.token_expiry,
            event.google_event_id
        )
    except Exception as e:
        logger.warning(f"Failed to delete event {event.id} from Google: {e}")


# ── Routes ────────────────────────────────────────────────────

@router.get("/calendar/events", response_model=list[CalendarEventResponse])
async def list_events(
    start_date: Optional[str] = Query(None, description="Filter from date (inclusive, YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter to date (inclusive, YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
):
    """List calendar events, optionally filtered by date range."""
    stmt = select(CalendarEvent)
    conditions = []
    if start_date:
        conditions.append(CalendarEvent.date >= start_date)
    if end_date:
        conditions.append(CalendarEvent.date <= end_date)
    if conditions:
        stmt = stmt.where(and_(*conditions))
    stmt = stmt.order_by(CalendarEvent.date, CalendarEvent.start_time)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [_row_to_dict(r) for r in rows]


@router.post("/calendar/events", response_model=CalendarEventResponse, status_code=201)
async def create_event(
    body: CalendarEventCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new calendar event. Pushes to Google Calendar if connected."""
    conn = await _get_active_connection(db)
    
    event = CalendarEvent(
        title=body.title,
        description=body.description,
        date=body.date,
        start_time=body.start_time,
        end_time=body.end_time,
        location=body.location,
        attendees=body.attendees,
        calendar=body.calendar,
        sync_status=body.sync_status,
    )
    db.add(event)
    await db.flush()  # Get the ID before pushing to Google
    
    # Push to Google if connected (non-demo)
    if conn and not conn.demo_mode:
        await _push_to_google(event, conn, db)
    elif conn and conn.demo_mode:
        event.sync_status = "demo"
    
    await db.commit()
    await db.refresh(event)
    return _row_to_dict(event)


@router.get("/calendar/events/{event_id}", response_model=CalendarEventResponse)
async def get_event(event_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single calendar event by ID."""
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return _row_to_dict(event)


@router.put("/calendar/events/{event_id}", response_model=CalendarEventResponse)
async def update_event(
    event_id: int,
    body: CalendarEventUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing calendar event. Mirrors to Google Calendar if connected."""
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)

    # Mirror update to Google if connected
    conn = await _get_active_connection(db)
    if conn and not conn.demo_mode:
        await _update_on_google(event, conn, db)

    await db.commit()
    await db.refresh(event)
    return _row_to_dict(event)


@router.delete("/calendar/events/{event_id}", status_code=204)
async def delete_event(event_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a calendar event. Removes from Google Calendar if connected."""
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Delete from Google if connected
    conn = await _get_active_connection(db)
    if conn and not conn.demo_mode:
        await _delete_from_google(event, conn)
    
    await db.delete(event)
    await db.commit()