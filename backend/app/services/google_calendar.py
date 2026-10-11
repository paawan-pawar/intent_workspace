"""Google Calendar API service layer.

Handles OAuth 2.0 flow, token management, and all Google Calendar API
interactions. Tokens are stored server-side in the database only.
"""

import os
import time
import logging
from datetime import datetime, timezone
from typing import Optional

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8001/api/connections/google-calendar/oauth/callback")

SCOPES = ["https://www.googleapis.com/auth/calendar"]

def is_configured() -> bool:
    """Check if Google OAuth credentials are configured with real values."""
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    return bool(
        client_id
        and client_secret
        and not client_id.startswith("your-")
        and not client_secret.startswith("your-")
        and not client_id.startswith("<")
    )


def _get_client_config() -> dict:
    """Build the client config dict for google-auth-oauthlib."""
    return {
        "web": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8001/api/connections/google-calendar/oauth/callback")],
        }
    }


# ── OAuth Flow ────────────────────────────────────────────────

def create_auth_url() -> tuple[str, str]:
    """Create an OAuth authorization URL. Returns (url, state)."""
    flow = Flow.from_client_config(
        _get_client_config(),
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
    )
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",  # Force consent to always get refresh_token
    )
    return auth_url, state


def exchange_code(code: str, state: str) -> dict:
    """Exchange authorization code for tokens.
    
    Returns dict with access_token, refresh_token, token_expiry.
    """
    flow = Flow.from_client_config(
        _get_client_config(),
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
        state=state,
    )
    flow.fetch_token(code=code)
    creds = flow.credentials
    
    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_expiry": creds.expiry.timestamp() if creds.expiry else time.time() + 3600,
    }


def _build_credentials(access_token: str, refresh_token: Optional[str], token_expiry: Optional[float]) -> Credentials:
    """Build Credentials object from stored tokens."""
    expiry = datetime.fromtimestamp(token_expiry, tz=timezone.utc) if token_expiry else None
    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
        expiry=expiry,
    )
    return creds


def _refresh_if_needed(creds: Credentials) -> tuple[Credentials, bool]:
    """Refresh credentials if expired. Returns (creds, was_refreshed)."""
    if creds.expired and creds.refresh_token:
        import google.auth.transport.requests
        request = google.auth.transport.requests.Request()
        creds.refresh(request)
        return creds, True
    return creds, False


def _build_service(access_token: str, refresh_token: Optional[str], token_expiry: Optional[float]):
    """Build Google Calendar API service. Returns (service, creds) — creds may be refreshed."""
    creds = _build_credentials(access_token, refresh_token, token_expiry)
    creds, _ = _refresh_if_needed(creds)
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    return service, creds


# ── Event Conversion ──────────────────────────────────────────

def _local_to_google(event_row) -> dict:
    """Convert a local CalendarEvent row to a Google Calendar event body."""
    # Build start/end datetime in basic ISO format
    start_dt = f"{event_row.date}T{event_row.start_time}:00"
    end_dt = f"{event_row.date}T{event_row.end_time}:00"
    
    body: dict = {
        "summary": event_row.title,
        "description": event_row.description or "",
        "location": event_row.location or "",
        "start": {"dateTime": start_dt, "timeZone": "UTC"},
        "end": {"dateTime": end_dt, "timeZone": "UTC"},
    }
    
    if event_row.attendees:
        body["attendees"] = [{"email": a} for a in event_row.attendees if "@" in a]
    
    return body


def _google_to_local(g_event: dict) -> dict:
    """Convert a Google Calendar event to local event fields."""
    # Parse start/end
    start = g_event.get("start", {})
    end = g_event.get("end", {})
    
    start_dt = start.get("dateTime", start.get("date", ""))
    end_dt = end.get("dateTime", end.get("date", ""))
    
    # Extract date and time
    if "T" in start_dt:
        date_part = start_dt[:10]
        start_time = start_dt[11:16]
    else:
        date_part = start_dt[:10]
        start_time = "00:00"
    
    if "T" in end_dt:
        end_time = end_dt[11:16]
    else:
        end_time = "23:59"
    
    attendees = []
    for a in g_event.get("attendees", []):
        email = a.get("email", "")
        if email:
            attendees.append(email)
    
    return {
        "title": g_event.get("summary", "(No title)"),
        "description": g_event.get("description", ""),
        "date": date_part,
        "start_time": start_time,
        "end_time": end_time,
        "location": g_event.get("location", ""),
        "attendees": attendees,
        "google_event_id": g_event.get("id"),
        "google_etag": g_event.get("etag"),
    }


# ── Calendar API Operations ──────────────────────────────────

def fetch_events(access_token: str, refresh_token: Optional[str], 
                 token_expiry: Optional[float], sync_token: Optional[str] = None,
                 time_min: Optional[str] = None, time_max: Optional[str] = None) -> dict:
    """Fetch events from Google Calendar.
    
    Uses incremental sync if sync_token is provided.
    Falls back to full sync if sync_token is expired (410 Gone).
    
    Returns {events: list, next_sync_token: str, refreshed_creds: dict|None}
    """
    service, creds = _build_service(access_token, refresh_token, token_expiry)
    
    all_events = []
    page_token = None
    next_sync_token = None
    
    kwargs: dict = {"calendarId": "primary", "singleEvents": True, "orderBy": "startTime", "maxResults": 250}
    
    if sync_token:
        kwargs["syncToken"] = sync_token
        # Remove time filters when using syncToken
    else:
        if time_min:
            kwargs["timeMin"] = time_min
        if time_max:
            kwargs["timeMax"] = time_max
    
    try:
        while True:
            if page_token:
                kwargs["pageToken"] = page_token
            
            result = service.events().list(**kwargs).execute()
            items = result.get("items", [])
            all_events.extend(items)
            
            page_token = result.get("nextPageToken")
            if not page_token:
                next_sync_token = result.get("nextSyncToken")
                break
    except HttpError as e:
        if e.resp.status == 410:
            # Sync token expired — do full sync
            logger.info("Sync token expired, performing full sync")
            return fetch_events(access_token, refresh_token, token_expiry, 
                              sync_token=None, time_min=time_min, time_max=time_max)
        raise
    
    # Check if creds were refreshed
    refreshed = None
    if creds.token != access_token:
        refreshed = {
            "access_token": creds.token,
            "token_expiry": creds.expiry.timestamp() if creds.expiry else time.time() + 3600,
        }
    
    return {
        "events": all_events,
        "next_sync_token": next_sync_token,
        "refreshed_creds": refreshed,
    }


def create_google_event(access_token: str, refresh_token: Optional[str],
                        token_expiry: Optional[float], event_body: dict) -> dict:
    """Create an event in Google Calendar. Returns the created event."""
    service, creds = _build_service(access_token, refresh_token, token_expiry)
    result = service.events().insert(calendarId="primary", body=event_body).execute()
    return result


def update_google_event(access_token: str, refresh_token: Optional[str],
                        token_expiry: Optional[float],
                        google_event_id: str, event_body: dict) -> dict:
    """Update an event in Google Calendar. Returns the updated event."""
    service, creds = _build_service(access_token, refresh_token, token_expiry)
    result = service.events().update(
        calendarId="primary", eventId=google_event_id, body=event_body
    ).execute()
    return result


def delete_google_event(access_token: str, refresh_token: Optional[str],
                        token_expiry: Optional[float], google_event_id: str) -> None:
    """Delete an event from Google Calendar."""
    service, creds = _build_service(access_token, refresh_token, token_expiry)
    try:
        service.events().delete(calendarId="primary", eventId=google_event_id).execute()
    except HttpError as e:
        if e.resp.status == 404 or e.resp.status == 410:
            logger.info(f"Google event {google_event_id} already deleted")
        else:
            raise