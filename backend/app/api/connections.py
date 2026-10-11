"""Connections API router — integration management, OAuth, and sync operations."""

import os
import time
import secrets
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import CalendarConnection, CalendarEvent
from app.services import google_calendar as gcal

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory OAuth state store (per-process; fine for single-server dev)
_oauth_states: dict[str, float] = {}

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


# ── Pydantic schemas ──────────────────────────────────────────

class ConnectionResponse(BaseModel):
    id: str
    provider: str
    connected: bool
    demo_mode: bool
    last_sync_at: Optional[float] = None
    sync_error: Optional[str] = None
    event_count: int
    credentials_configured: bool
    last_sync_result: Optional[str] = None

    class Config:
        from_attributes = True


class ConnectionAction(BaseModel):
    """Payload for connect / disconnect actions."""
    action: str  # "connect" | "disconnect"


class SyncResult(BaseModel):
    success: bool
    events_synced: int
    message: str
    timestamp: float
    demo_mode: bool


class OAuthUrlResponse(BaseModel):
    auth_url: str
    demo_mode: bool
    message: str


# ── Helpers ───────────────────────────────────────────────────

def _conn_to_dict(row: CalendarConnection) -> dict:
    """Convert a CalendarConnection row to a response dict.
    
    NEVER includes tokens in the response.
    """
    return {
        "id": row.id,
        "provider": row.provider,
        "connected": row.connected,
        "demo_mode": row.demo_mode,
        "last_sync_at": row.last_sync_at,
        "sync_error": row.sync_error,
        "event_count": row.event_count,
        "credentials_configured": row.credentials_configured,
        "last_sync_result": row.last_sync_result,
    }


async def _ensure_default_connection(db: AsyncSession) -> CalendarConnection:
    """Ensure the default Google Calendar connection row exists."""
    result = await db.execute(
        select(CalendarConnection).where(CalendarConnection.id == "google-calendar")
    )
    conn = result.scalar_one_or_none()
    if not conn:
        conn = CalendarConnection(
            id="google-calendar",
            provider="Google Calendar",
            connected=False,
            demo_mode=True,
            last_sync_at=None,
            sync_error=None,
            event_count=0,
            credentials_configured=gcal.is_configured(),
        )
        db.add(conn)
        await db.commit()
        await db.refresh(conn)
    else:
        # Update credentials_configured flag on each check
        conn.credentials_configured = gcal.is_configured()
        await db.commit()
    return conn


async def _do_demo_sync(conn: CalendarConnection, db: AsyncSession) -> SyncResult:
    """Perform demo-mode synchronization — operates on real DB data."""
    now = time.time()
    events_result = await db.execute(
        select(CalendarEvent).order_by(CalendarEvent.date, CalendarEvent.start_time)
    )
    all_events = events_result.scalars().all()
    synced_count = len(all_events)

    for event in all_events:
        if event.sync_status in ("local", "pending", "failed"):
            event.sync_status = "demo"

    conn.last_sync_at = now
    conn.sync_error = None
    conn.event_count = synced_count
    msg = f"Synchronized {synced_count} event{'s' if synced_count != 1 else ''} (demo mode — no external provider)"
    conn.last_sync_result = msg

    await db.commit()
    await db.refresh(conn)

    return SyncResult(
        success=True,
        events_synced=synced_count,
        message=msg,
        timestamp=now,
        demo_mode=True,
    )


async def _do_google_sync(conn: CalendarConnection, db: AsyncSession) -> SyncResult:
    """Perform real Google Calendar synchronization."""
    now = time.time()

    try:
        # 1. Fetch events from Google (incremental or full)
        result = gcal.fetch_events(
            access_token=conn.access_token,
            refresh_token=conn.refresh_token,
            token_expiry=conn.token_expiry,
            sync_token=conn.google_sync_token,
        )

        g_events = result["events"]
        new_sync_token = result.get("next_sync_token")

        # Update tokens if they were refreshed
        if result.get("refreshed_creds"):
            rc = result["refreshed_creds"]
            conn.access_token = rc["access_token"]
            conn.token_expiry = rc["token_expiry"]

        if new_sync_token:
            conn.google_sync_token = new_sync_token

        # 2. Upsert Google events into local DB
        imported_count = 0
        for g_event in g_events:
            g_id = g_event.get("id")
            if not g_id:
                continue

            # Skip cancelled events (deletions from incremental sync)
            if g_event.get("status") == "cancelled":
                # Remove from local DB if it exists
                existing = await db.execute(
                    select(CalendarEvent).where(CalendarEvent.google_event_id == g_id)
                )
                local_event = existing.scalar_one_or_none()
                if local_event:
                    await db.delete(local_event)
                continue

            local_data = gcal._google_to_local(g_event)

            # Check if event already exists locally
            existing = await db.execute(
                select(CalendarEvent).where(CalendarEvent.google_event_id == g_id)
            )
            local_event = existing.scalar_one_or_none()

            if local_event:
                # Update existing
                for key, value in local_data.items():
                    if key not in ("google_event_id",) and value is not None:
                        setattr(local_event, key, value)
                local_event.sync_status = "synced"
            else:
                # Create new
                new_event = CalendarEvent(
                    title=local_data["title"],
                    description=local_data.get("description", ""),
                    date=local_data["date"],
                    start_time=local_data["start_time"],
                    end_time=local_data["end_time"],
                    location=local_data.get("location", ""),
                    attendees=local_data.get("attendees", []),
                    calendar="work",
                    sync_status="synced",
                    google_event_id=g_id,
                    google_etag=local_data.get("google_etag"),
                )
                db.add(new_event)
                imported_count += 1

        # 3. Push local-only events to Google
        local_only = await db.execute(
            select(CalendarEvent).where(
                CalendarEvent.sync_status.in_(["local", "pending", "failed"]),
                CalendarEvent.google_event_id.is_(None),
            )
        )
        pushed_count = 0
        for event in local_only.scalars().all():
            try:
                body = gcal._local_to_google(event)
                created = gcal.create_google_event(
                    conn.access_token, conn.refresh_token, conn.token_expiry, body
                )
                event.google_event_id = created.get("id")
                event.google_etag = created.get("etag")
                event.sync_status = "synced"
                pushed_count += 1
            except Exception as push_err:
                logger.warning(f"Failed to push event {event.id} to Google: {push_err}")
                event.sync_status = "failed"

        # 4. Update connection metadata
        count_result = await db.execute(select(func.count(CalendarEvent.id)))
        total_events = count_result.scalar() or 0

        conn.last_sync_at = now
        conn.sync_error = None
        conn.event_count = total_events
        total_synced = len(g_events) + pushed_count
        msg = f"Synchronized {total_synced} event{'s' if total_synced != 1 else ''} with Google Calendar"
        if imported_count:
            msg += f" ({imported_count} imported)"
        if pushed_count:
            msg += f" ({pushed_count} pushed)"
        conn.last_sync_result = msg

        await db.commit()
        await db.refresh(conn)

        return SyncResult(
            success=True,
            events_synced=total_synced,
            message=msg,
            timestamp=now,
            demo_mode=False,
        )

    except Exception as e:
        error_msg = str(e)
        # Check for revoked access
        if "invalid_grant" in error_msg.lower() or "token has been expired or revoked" in error_msg.lower():
            conn.connected = False
            conn.demo_mode = True
            conn.access_token = None
            conn.refresh_token = None
            conn.token_expiry = None
            conn.google_sync_token = None
            conn.sync_error = "Google access was revoked. Please reconnect."
            conn.last_sync_result = "Failed: access revoked"
            await db.commit()
            raise HTTPException(status_code=401, detail="Google Calendar access was revoked. Please reconnect.")

        conn.sync_error = error_msg
        conn.last_sync_at = now
        conn.last_sync_result = f"Failed: {error_msg[:100]}"
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Sync failed: {error_msg}")


# ── Routes ────────────────────────────────────────────────────

@router.get("/connections", response_model=list[ConnectionResponse])
async def list_connections(db: AsyncSession = Depends(get_db)):
    """List all integration connections."""
    await _ensure_default_connection(db)
    result = await db.execute(select(CalendarConnection))
    rows = result.scalars().all()
    return [_conn_to_dict(r) for r in rows]


@router.get("/connections/{connection_id}", response_model=ConnectionResponse)
async def get_connection(connection_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single connection's status."""
    result = await db.execute(
        select(CalendarConnection).where(CalendarConnection.id == connection_id)
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    return _conn_to_dict(conn)


# ── OAuth Flow ────────────────────────────────────────────────

@router.get("/connections/google-calendar/oauth/start", response_model=OAuthUrlResponse)
async def start_oauth(db: AsyncSession = Depends(get_db)):
    """Start the Google OAuth flow.
    
    If credentials are not configured, returns demo mode instructions.
    Otherwise, returns the Google authorization URL.
    """
    if not gcal.is_configured():
        return OAuthUrlResponse(
            auth_url="",
            demo_mode=True,
            message="Google OAuth credentials not configured. Use demo mode or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )
    
    auth_url, state = gcal.create_auth_url()
    
    # Store state for validation (expires in 10 minutes)
    _oauth_states[state] = time.time() + 600
    
    return OAuthUrlResponse(
        auth_url=auth_url,
        demo_mode=False,
        message="Redirect user to auth_url to authorize Google Calendar access.",
    )


@router.get("/connections/google-calendar/oauth/callback")
async def oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Handle the Google OAuth callback.
    
    Validates state, exchanges the code for tokens, stores them in the DB,
    and redirects to the frontend Connections page.
    """
    # Validate state
    stored_expiry = _oauth_states.pop(state, None)
    if not stored_expiry or time.time() > stored_expiry:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/connections?error=invalid_state",
            status_code=302,
        )
    
    try:
        tokens = gcal.exchange_code(code, state)
    except Exception as e:
        logger.error(f"OAuth code exchange failed: {e}")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/connections?error=exchange_failed",
            status_code=302,
        )
    
    # Store tokens in the connection record
    await _ensure_default_connection(db)
    result = await db.execute(
        select(CalendarConnection).where(CalendarConnection.id == "google-calendar")
    )
    conn = result.scalar_one_or_none()
    
    conn.access_token = tokens["access_token"]
    conn.refresh_token = tokens.get("refresh_token")
    conn.token_expiry = tokens.get("token_expiry")
    conn.connected = True
    conn.demo_mode = False
    conn.credentials_configured = True
    conn.sync_error = None
    conn.last_sync_at = time.time()
    conn.last_sync_result = "Connected to Google Calendar"
    
    # Count existing events
    count_result = await db.execute(select(func.count(CalendarEvent.id)))
    conn.event_count = count_result.scalar() or 0
    
    await db.commit()
    
    return RedirectResponse(
        url=f"{FRONTEND_URL}/connections?connected=true",
        status_code=302,
    )


# ── Connect / Disconnect ─────────────────────────────────────

@router.post("/connections/{connection_id}/toggle", response_model=ConnectionResponse)
async def toggle_connection(
    connection_id: str,
    body: ConnectionAction,
    db: AsyncSession = Depends(get_db),
):
    """Connect or disconnect an integration.
    
    For 'connect' without OAuth credentials: enters demo mode.
    For 'disconnect': clears tokens and reverts events to local.
    """
    result = await db.execute(
        select(CalendarConnection).where(CalendarConnection.id == connection_id)
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    if body.action == "connect":
        # If we have stored OAuth tokens, we're already connected via OAuth
        # If not, enter demo mode
        if conn.access_token and conn.refresh_token:
            conn.connected = True
            conn.demo_mode = False
        else:
            conn.connected = True
            conn.demo_mode = True
        
        conn.sync_error = None
        conn.last_sync_at = time.time()

        # Count existing events
        count_result = await db.execute(select(func.count(CalendarEvent.id)))
        conn.event_count = count_result.scalar() or 0

        # Mark all existing events appropriately
        events_result = await db.execute(select(CalendarEvent))
        target_status = "demo" if conn.demo_mode else "pending"
        for event in events_result.scalars().all():
            if event.sync_status == "local":
                event.sync_status = target_status
        
        conn.last_sync_result = f"Connected {'(demo mode)' if conn.demo_mode else 'to Google Calendar'}"

    elif body.action == "disconnect":
        conn.connected = False
        conn.demo_mode = True
        conn.sync_error = None
        # Clear OAuth tokens on disconnect
        conn.access_token = None
        conn.refresh_token = None
        conn.token_expiry = None
        conn.google_sync_token = None
        conn.last_sync_result = "Disconnected"

        # Revert all events to local status
        events_result = await db.execute(select(CalendarEvent))
        for event in events_result.scalars().all():
            if event.sync_status in ("synced", "demo", "pending"):
                event.sync_status = "local"
            # Clear Google IDs when disconnecting
            event.google_event_id = None
            event.google_etag = None
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'connect' or 'disconnect'.")

    await db.commit()
    await db.refresh(conn)
    return _conn_to_dict(conn)


# ── Sync ──────────────────────────────────────────────────────

@router.post("/connections/{connection_id}/sync", response_model=SyncResult)
async def sync_connection(
    connection_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Trigger synchronization.
    
    In demo mode: reads/writes real DB data, simulates external sync.
    With Google OAuth: performs real Google Calendar API sync.
    """
    result = await db.execute(
        select(CalendarConnection).where(CalendarConnection.id == connection_id)
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    if not conn.connected:
        raise HTTPException(
            status_code=400,
            detail="Cannot sync — connection is not active. Connect first."
        )

    if conn.demo_mode:
        return await _do_demo_sync(conn, db)
    else:
        return await _do_google_sync(conn, db)