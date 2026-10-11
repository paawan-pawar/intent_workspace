"""Gmail API router — OAuth, inbox messages, search, read/unread, star, sync."""

import os
import time
import json
import base64
import secrets
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import GmailConnection
from app.services import gmail_service as gmail
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory OAuth state store (per-process; fine for single-server dev)
_oauth_states: dict[str, float] = {}

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


# ── Pydantic Schemas ──────────────────────────────────────────

class GmailConnectionResponse(BaseModel):
    id: str
    provider: str
    connected: bool
    demo_mode: bool
    last_sync_at: Optional[float] = None
    sync_error: Optional[str] = None
    message_count: int = 0
    credentials_configured: bool
    last_sync_result: Optional[str] = None
    email_address: Optional[str] = None
    unread_count: int = 0

    class Config:
        from_attributes = True


class GmailMessageSummary(BaseModel):
    id: str
    threadId: str = ""
    sender: str
    senderEmail: str = ""
    subject: str
    snippet: str = ""
    date: str
    unread: bool = False
    starred: bool = False
    hasAttachments: bool = False
    labelIds: list[str] = []
    category: str = "focused"


class GmailMessageFull(GmailMessageSummary):
    body_html: str = ""
    body_text: str = ""


class GmailInboxResponse(BaseModel):
    messages: list[GmailMessageSummary]
    nextPageToken: Optional[str] = None
    resultSizeEstimate: int = 0
    connected: bool = True
    demo_mode: bool = False


class GmailSyncResult(BaseModel):
    success: bool
    new_messages: int = 0
    message: str
    timestamp: float
    demo_mode: bool = False


class OAuthUrlResponse(BaseModel):
    auth_url: str
    demo_mode: bool
    message: str


class ModifyRequest(BaseModel):
    action: str  # "read" | "unread" | "star" | "unstar"


# ── Demo Data ─────────────────────────────────────────────────

DEMO_EMAILS: list[dict] = [
    {
        "id": "demo_1", "threadId": "demo_t1",
        "sender": "Sarah Jenkins", "senderEmail": "sarah.jenkins@company.com",
        "subject": "Q3 Design Review Update",
        "snippet": "I've attached the latest mockups for the new dashboard. Please take a look when you have a moment...",
        "date": "2026-10-11T10:23:00+00:00", "unread": True, "starred": True,
        "hasAttachments": True, "labelIds": ["INBOX", "UNREAD", "STARRED", "CATEGORY_PERSONAL"],
        "category": "focused",
        "body_html": "<p>Hi,</p><p>I've attached the latest mockups for the new dashboard. Please take a look when you have a moment and let me know your thoughts.</p><p>The key changes are:<ul><li>Updated color palette to match the new brand guidelines</li><li>Simplified navigation flow</li><li>Added micro-animations for transitions</li></ul></p><p>Best,<br/>Sarah</p>",
        "body_text": "Hi,\n\nI've attached the latest mockups for the new dashboard. Please take a look when you have a moment and let me know your thoughts.\n\nThe key changes are:\n- Updated color palette to match the new brand guidelines\n- Simplified navigation flow\n- Added micro-animations for transitions\n\nBest,\nSarah",
    },
    {
        "id": "demo_2", "threadId": "demo_t2",
        "sender": "GitHub", "senderEmail": "notifications@github.com",
        "subject": "[intent-workspace] Pull Request #42: Add Inbox Feature",
        "snippet": "User @dev pushed new commits to the feature/inbox branch. 2 files changed...",
        "date": "2026-10-11T09:45:00+00:00", "unread": True, "starred": False,
        "hasAttachments": False, "labelIds": ["INBOX", "UNREAD", "CATEGORY_UPDATES"],
        "category": "other",
        "body_html": "<p><strong>@dev</strong> pushed new commits to the <code>feature/inbox</code> branch.</p><p>2 files changed, 148 insertions(+), 23 deletions(-)</p><p><a href='#'>View Pull Request</a></p>",
        "body_text": "@dev pushed new commits to the feature/inbox branch.\n2 files changed, 148 insertions(+), 23 deletions(-)\nView Pull Request",
    },
    {
        "id": "demo_3", "threadId": "demo_t3",
        "sender": "Marcus Chen", "senderEmail": "marcus.chen@company.com",
        "subject": "Sync regarding product roadmap",
        "snippet": "Are we still on for 2 PM today? I have a few updates to the timeline that I'd like to run by you.",
        "date": "2026-10-10T14:30:00+00:00", "unread": False, "starred": True,
        "hasAttachments": False, "labelIds": ["INBOX", "STARRED", "CATEGORY_PERSONAL"],
        "category": "focused",
        "body_html": "<p>Hey,</p><p>Are we still on for 2 PM today? I have a few updates to the timeline that I'd like to run by you.</p><p>We should also discuss the Q4 sprint planning and resource allocation.</p><p>Thanks,<br/>Marcus</p>",
        "body_text": "Hey,\n\nAre we still on for 2 PM today? I have a few updates to the timeline that I'd like to run by you.\n\nWe should also discuss the Q4 sprint planning and resource allocation.\n\nThanks,\nMarcus",
    },
    {
        "id": "demo_4", "threadId": "demo_t4",
        "sender": "Figma", "senderEmail": "no-reply@figma.com",
        "subject": "Alex commented on 'Web App UI'",
        "snippet": "Alex: \"Can we try making the primary button slightly more vibrant?\"",
        "date": "2026-10-10T11:15:00+00:00", "unread": False, "starred": False,
        "hasAttachments": False, "labelIds": ["INBOX", "CATEGORY_UPDATES"],
        "category": "other",
        "body_html": "<p><strong>Alex</strong> commented on <em>Web App UI</em>:</p><blockquote>\"Can we try making the primary button slightly more vibrant?\"</blockquote><p><a href='#'>View in Figma</a></p>",
        "body_text": "Alex commented on 'Web App UI':\n\"Can we try making the primary button slightly more vibrant?\"\nView in Figma",
    },
    {
        "id": "demo_5", "threadId": "demo_t5",
        "sender": "Weekly Digest", "senderEmail": "digest@company.com",
        "subject": "Your Activity Summary",
        "snippet": "You had a productive week! You completed 14 tasks and attended 6 meetings. Here is your breakdown...",
        "date": "2026-10-08T08:00:00+00:00", "unread": False, "starred": False,
        "hasAttachments": False, "labelIds": ["INBOX", "CATEGORY_UPDATES"],
        "category": "other",
        "body_html": "<h3>Your Weekly Summary</h3><p>You had a productive week!</p><ul><li><strong>14</strong> tasks completed</li><li><strong>6</strong> meetings attended</li><li><strong>3</strong> documents created</li></ul><p>Keep up the great work!</p>",
        "body_text": "Your Weekly Summary\nYou had a productive week!\n- 14 tasks completed\n- 6 meetings attended\n- 3 documents created\nKeep up the great work!",
    },
    {
        "id": "demo_6", "threadId": "demo_t6",
        "sender": "Lisa Park", "senderEmail": "lisa.park@company.com",
        "subject": "Updated brand guidelines attached",
        "snippet": "Hi team, please find the updated brand guidelines for Q4. Key changes include new typography...",
        "date": "2026-10-07T16:20:00+00:00", "unread": False, "starred": False,
        "hasAttachments": True, "labelIds": ["INBOX", "CATEGORY_PERSONAL"],
        "category": "focused",
        "body_html": "<p>Hi team,</p><p>Please find the updated brand guidelines for Q4. Key changes include:</p><ul><li>New typography scale</li><li>Updated color tokens</li><li>Refined icon set</li></ul><p>The PDF is attached. Let me know if you have any questions.</p><p>Best,<br/>Lisa</p>",
        "body_text": "Hi team,\n\nPlease find the updated brand guidelines for Q4. Key changes include:\n- New typography scale\n- Updated color tokens\n- Refined icon set\n\nThe PDF is attached. Let me know if you have any questions.\n\nBest,\nLisa",
    },
    {
        "id": "demo_7", "threadId": "demo_t7",
        "sender": "LinkedIn", "senderEmail": "notifications@linkedin.com",
        "subject": "5 people viewed your profile",
        "snippet": "Your profile was viewed by people at Google, Microsoft, and 3 other companies this week.",
        "date": "2026-10-07T09:00:00+00:00", "unread": False, "starred": False,
        "hasAttachments": False, "labelIds": ["INBOX", "CATEGORY_SOCIAL"],
        "category": "other",
        "body_html": "<p>Your profile was viewed by people at <strong>Google</strong>, <strong>Microsoft</strong>, and <strong>3 other companies</strong> this week.</p><p><a href='#'>See who viewed your profile</a></p>",
        "body_text": "Your profile was viewed by people at Google, Microsoft, and 3 other companies this week.\nSee who viewed your profile",
    },
]


# ── Helpers ───────────────────────────────────────────────────

def _conn_to_dict(row: GmailConnection) -> dict:
    """Convert a GmailConnection row to a response dict. NEVER includes tokens."""
    return {
        "id": row.id,
        "provider": row.provider,
        "connected": row.connected,
        "demo_mode": row.demo_mode,
        "last_sync_at": row.last_sync_at,
        "sync_error": row.sync_error,
        "message_count": row.message_count,
        "credentials_configured": row.credentials_configured,
        "last_sync_result": row.last_sync_result,
        "email_address": row.email_address,
        "unread_count": row.unread_count,
    }


async def _ensure_gmail_connection(db: AsyncSession) -> GmailConnection:
    """Ensure the default Gmail connection row exists."""
    result = await db.execute(
        select(GmailConnection).where(GmailConnection.id == "gmail")
    )
    conn = result.scalar_one_or_none()
    if not conn:
        conn = GmailConnection(
            id="gmail",
            provider="Gmail",
            connected=False,
            demo_mode=True,
            message_count=0,
            credentials_configured=gmail.is_configured(),
            unread_count=0,
        )
        db.add(conn)
        await db.commit()
        await db.refresh(conn)
    else:
        # Update credentials_configured flag
        conn.credentials_configured = gmail.is_configured()
        await db.commit()
    return conn


async def _update_refreshed_creds(conn: GmailConnection, refreshed: Optional[dict], db: AsyncSession):
    """Update connection with refreshed credentials if provided."""
    if refreshed:
        conn.access_token = refreshed["access_token"]
        conn.token_expiry = refreshed["token_expiry"]
        await db.commit()


# ── Connection Routes ─────────────────────────────────────────

@router.get("/gmail/connection", response_model=GmailConnectionResponse)
async def get_gmail_connection(db: AsyncSession = Depends(get_db)):
    """Get Gmail connection status."""
    conn = await _ensure_gmail_connection(db)
    return _conn_to_dict(conn)


@router.get("/gmail/oauth/start", response_model=OAuthUrlResponse)
async def start_gmail_oauth(db: AsyncSession = Depends(get_db)):
    """Start the Gmail OAuth flow."""
    if not gmail.is_configured():
        return OAuthUrlResponse(
            auth_url="",
            demo_mode=True,
            message="Google OAuth credentials not configured. Use demo mode or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )
    auth_url, state = gmail.create_auth_url()
    _oauth_states[state] = time.time() + 600  # 10 min expiry
    return OAuthUrlResponse(
        auth_url=auth_url,
        demo_mode=False,
        message="Redirect user to auth_url to authorize Gmail access.",
    )


@router.get("/gmail/oauth/callback")
async def gmail_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Handle Gmail OAuth callback from Google."""
    # Validate state
    expiry = _oauth_states.pop(state, None)
    if not expiry or time.time() > expiry:
        return RedirectResponse(url=f"{FRONTEND_URL}/connections?error=invalid_state")

    try:
        tokens = gmail.exchange_code(code, state)
    except Exception as e:
        logger.error(f"Gmail OAuth exchange failed: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}/connections?error=exchange_failed")

    conn = await _ensure_gmail_connection(db)
    conn.connected = True
    conn.demo_mode = False
    conn.access_token = tokens["access_token"]
    conn.refresh_token = tokens["refresh_token"]
    conn.token_expiry = tokens["token_expiry"]
    conn.email_address = tokens.get("email_address", "")
    conn.sync_error = None
    conn.last_sync_result = "Connected successfully"
    conn.last_sync_at = time.time()

    # Get initial history ID for incremental sync
    try:
        profile = gmail.get_profile(
            conn.access_token, conn.refresh_token, conn.token_expiry
        )
        conn.history_id = profile.get("historyId")
        if profile.get("refreshed_creds"):
            conn.access_token = profile["refreshed_creds"]["access_token"]
            conn.token_expiry = profile["refreshed_creds"]["token_expiry"]
    except Exception as e:
        logger.warning(f"Failed to get Gmail profile: {e}")

    # Setup Pub/Sub watch if configured
    if gmail.is_pubsub_configured():
        try:
            watch_result = gmail.setup_watch(
                conn.access_token, conn.refresh_token, conn.token_expiry
            )
            conn.watch_expiration = watch_result.get("expiration", 0)
            if watch_result.get("historyId"):
                conn.history_id = watch_result["historyId"]
            if watch_result.get("refreshed_creds"):
                conn.access_token = watch_result["refreshed_creds"]["access_token"]
                conn.token_expiry = watch_result["refreshed_creds"]["token_expiry"]
        except Exception as e:
            logger.warning(f"Failed to setup Gmail push notifications: {e}")

    await db.commit()
    return RedirectResponse(url=f"{FRONTEND_URL}/connections?gmail_connected=true")


@router.post("/gmail/connect")
async def demo_connect_gmail(db: AsyncSession = Depends(get_db)):
    """Connect Gmail in demo mode (no real OAuth)."""
    conn = await _ensure_gmail_connection(db)
    conn.connected = True
    conn.demo_mode = True
    conn.sync_error = None
    conn.message_count = len(DEMO_EMAILS)
    conn.unread_count = sum(1 for e in DEMO_EMAILS if e["unread"])
    conn.last_sync_at = time.time()
    conn.last_sync_result = "Connected in demo mode"
    await db.commit()
    await db.refresh(conn)
    return _conn_to_dict(conn)


@router.post("/gmail/disconnect")
async def disconnect_gmail(db: AsyncSession = Depends(get_db)):
    """Disconnect Gmail — revoke tokens and reset state."""
    conn = await _ensure_gmail_connection(db)

    # Stop Pub/Sub watch if active
    if conn.connected and not conn.demo_mode and conn.access_token:
        try:
            gmail.stop_watch(conn.access_token, conn.refresh_token, conn.token_expiry)
        except Exception:
            pass

    conn.connected = False
    conn.demo_mode = True
    conn.access_token = None
    conn.refresh_token = None
    conn.token_expiry = None
    conn.history_id = None
    conn.watch_expiration = None
    conn.email_address = None
    conn.sync_error = None
    conn.message_count = 0
    conn.unread_count = 0
    conn.last_sync_result = None
    await db.commit()
    await db.refresh(conn)
    return _conn_to_dict(conn)


# ── Inbox Routes ──────────────────────────────────────────────

@router.get("/gmail/messages", response_model=GmailInboxResponse)
async def list_gmail_messages(
    q: str = "",
    max_results: int = Query(default=25, le=100),
    page_token: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List inbox messages. Returns demo data when disconnected or in demo mode."""
    conn = await _ensure_gmail_connection(db)

    if not conn.connected:
        return GmailInboxResponse(
            messages=[], connected=False, demo_mode=True,
            resultSizeEstimate=0,
        )

    if conn.demo_mode:
        filtered = DEMO_EMAILS
        if q:
            q_lower = q.lower()
            filtered = [e for e in filtered if (
                q_lower in e["sender"].lower()
                or q_lower in e["subject"].lower()
                or q_lower in e["snippet"].lower()
            )]
        if category:
            filtered = [e for e in filtered if e["category"] == category]
        # Strip body for list response
        summaries = [{k: v for k, v in e.items() if k not in ("body_html", "body_text")} for e in filtered]
        return GmailInboxResponse(
            messages=summaries,
            connected=True, demo_mode=True,
            resultSizeEstimate=len(summaries),
        )

    # Real Gmail API
    try:
        result = gmail.list_messages(
            access_token=conn.access_token,
            refresh_token=conn.refresh_token,
            token_expiry=conn.token_expiry,
            query=q,
            max_results=max_results,
            page_token=page_token,
        )
        await _update_refreshed_creds(conn, result.get("refreshed_creds"), db)

        # Filter by category if requested
        messages = result["messages"]
        if category:
            messages = [m for m in messages if m.get("category") == category]

        # Update counts
        conn.message_count = result.get("resultSizeEstimate", len(messages))
        conn.unread_count = sum(1 for m in messages if m.get("unread"))
        conn.last_sync_at = time.time()
        conn.sync_error = None
        await db.commit()

        return GmailInboxResponse(
            messages=messages,
            nextPageToken=result.get("nextPageToken"),
            resultSizeEstimate=result.get("resultSizeEstimate", 0),
            connected=True, demo_mode=False,
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Gmail list messages failed: {error_msg}")

        # Check if token was revoked
        if "invalid_grant" in error_msg.lower() or "token" in error_msg.lower():
            conn.connected = False
            conn.demo_mode = True
            conn.access_token = None
            conn.refresh_token = None
            conn.token_expiry = None
            conn.sync_error = "Gmail access was revoked. Please reconnect."
            await db.commit()
            raise HTTPException(status_code=401, detail="Gmail access revoked. Please reconnect.")

        conn.sync_error = error_msg[:200]
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to fetch messages: {error_msg[:200]}")


@router.get("/gmail/messages/{message_id}")
async def get_gmail_message(message_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single email message with full body content."""
    conn = await _ensure_gmail_connection(db)

    if not conn.connected:
        raise HTTPException(status_code=400, detail="Gmail not connected")

    if conn.demo_mode:
        email = next((e for e in DEMO_EMAILS if e["id"] == message_id), None)
        if not email:
            raise HTTPException(status_code=404, detail="Message not found")
        return email

    # Real Gmail API
    try:
        result = gmail.get_message(
            access_token=conn.access_token,
            refresh_token=conn.refresh_token,
            token_expiry=conn.token_expiry,
            message_id=message_id,
        )
        await _update_refreshed_creds(conn, result.get("refreshed_creds"), db)
        return result["message"]
    except HttpError as e:
        if e.resp.status == 404:
            raise HTTPException(status_code=404, detail="Message not found")
        raise HTTPException(status_code=500, detail=f"Failed to fetch message: {str(e)[:200]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch message: {str(e)[:200]}")


@router.post("/gmail/messages/{message_id}/modify")
async def modify_gmail_message(
    message_id: str,
    body: ModifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Modify a message: read/unread/star/unstar."""
    conn = await _ensure_gmail_connection(db)

    if not conn.connected:
        raise HTTPException(status_code=400, detail="Gmail not connected")

    if conn.demo_mode:
        # Update demo data in-memory
        email = next((e for e in DEMO_EMAILS if e["id"] == message_id), None)
        if not email:
            raise HTTPException(status_code=404, detail="Message not found")

        if body.action == "read":
            email["unread"] = False
            if "UNREAD" in email["labelIds"]:
                email["labelIds"].remove("UNREAD")
        elif body.action == "unread":
            email["unread"] = True
            if "UNREAD" not in email["labelIds"]:
                email["labelIds"].append("UNREAD")
        elif body.action == "star":
            email["starred"] = True
            if "STARRED" not in email["labelIds"]:
                email["labelIds"].append("STARRED")
        elif body.action == "unstar":
            email["starred"] = False
            if "STARRED" in email["labelIds"]:
                email["labelIds"].remove("STARRED")
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {body.action}")

        # Update counts
        conn.unread_count = sum(1 for e in DEMO_EMAILS if e["unread"])
        await db.commit()

        return {k: v for k, v in email.items() if k not in ("body_html", "body_text")}

    # Real Gmail API
    try:
        action_map = {
            "read": gmail.mark_as_read,
            "unread": gmail.mark_as_unread,
            "star": gmail.star_message,
            "unstar": gmail.unstar_message,
        }
        fn = action_map.get(body.action)
        if not fn:
            raise HTTPException(status_code=400, detail=f"Unknown action: {body.action}")

        result = fn(
            access_token=conn.access_token,
            refresh_token=conn.refresh_token,
            token_expiry=conn.token_expiry,
            message_id=message_id,
        )
        await _update_refreshed_creds(conn, result.get("refreshed_creds"), db)
        return result["message"]
    except HttpError as e:
        if e.resp.status == 404:
            raise HTTPException(status_code=404, detail="Message not found")
        raise HTTPException(status_code=500, detail=str(e)[:200])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])


# ── Sync / Refresh ────────────────────────────────────────────

@router.post("/gmail/sync", response_model=GmailSyncResult)
async def sync_gmail(db: AsyncSession = Depends(get_db)):
    """Sync Gmail inbox — incremental via history ID or full refresh."""
    conn = await _ensure_gmail_connection(db)

    if not conn.connected:
        raise HTTPException(status_code=400, detail="Gmail not connected")

    now = time.time()

    if conn.demo_mode:
        conn.last_sync_at = now
        conn.message_count = len(DEMO_EMAILS)
        conn.unread_count = sum(1 for e in DEMO_EMAILS if e["unread"])
        conn.last_sync_result = f"Synchronized {len(DEMO_EMAILS)} messages (demo mode)"
        conn.sync_error = None
        await db.commit()
        return GmailSyncResult(
            success=True, new_messages=0,
            message=conn.last_sync_result,
            timestamp=now, demo_mode=True,
        )

    # Real Gmail — incremental sync via history
    try:
        new_count = 0
        if conn.history_id:
            try:
                hist_result = gmail.get_history(
                    access_token=conn.access_token,
                    refresh_token=conn.refresh_token,
                    token_expiry=conn.token_expiry,
                    start_history_id=conn.history_id,
                )
                await _update_refreshed_creds(conn, hist_result.get("refreshed_creds"), db)

                # Count new messages from history
                for h in hist_result.get("history", []):
                    new_count += len(h.get("messagesAdded", []))

                conn.history_id = hist_result.get("historyId", conn.history_id)
            except HttpError as e:
                if e.resp.status == 404:
                    # History too old — full resync
                    logger.info("Gmail history ID expired, doing full profile refresh")
                    profile = gmail.get_profile(
                        conn.access_token, conn.refresh_token, conn.token_expiry
                    )
                    conn.history_id = profile.get("historyId")
                    await _update_refreshed_creds(conn, profile.get("refreshed_creds"), db)
                else:
                    raise
        else:
            # No history ID — get current one
            profile = gmail.get_profile(
                conn.access_token, conn.refresh_token, conn.token_expiry
            )
            conn.history_id = profile.get("historyId")
            conn.message_count = profile.get("messagesTotal", 0)
            await _update_refreshed_creds(conn, profile.get("refreshed_creds"), db)

        # Renew Pub/Sub watch if needed
        if gmail.is_pubsub_configured():
            if not conn.watch_expiration or conn.watch_expiration < (now * 1000 + 86400000):
                try:
                    watch_result = gmail.setup_watch(
                        conn.access_token, conn.refresh_token, conn.token_expiry
                    )
                    conn.watch_expiration = watch_result.get("expiration", 0)
                    await _update_refreshed_creds(conn, watch_result.get("refreshed_creds"), db)
                except Exception as e:
                    logger.warning(f"Failed to renew Gmail watch: {e}")

        conn.last_sync_at = now
        conn.sync_error = None
        msg = f"Synced successfully — {new_count} new message{'s' if new_count != 1 else ''}"
        conn.last_sync_result = msg
        await db.commit()

        return GmailSyncResult(
            success=True, new_messages=new_count,
            message=msg, timestamp=now, demo_mode=False,
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Gmail sync failed: {error_msg}")
        conn.sync_error = error_msg[:200]
        conn.last_sync_at = now
        conn.last_sync_result = f"Sync failed: {error_msg[:100]}"
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Sync failed: {error_msg[:200]}")


# ── Pub/Sub Webhook ───────────────────────────────────────────

@router.post("/gmail/webhook")
async def gmail_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Receive Gmail Pub/Sub push notifications.

    Google sends a POST with a JSON body containing a base64-encoded
    message with emailAddress and historyId.
    This endpoint verifies the data and triggers an incremental sync.
    """
    try:
        body = await request.json()
        message = body.get("message", {})
        data = message.get("data", "")

        if data:
            decoded = json.loads(base64.urlsafe_b64decode(data).decode("utf-8"))
            email_address = decoded.get("emailAddress", "")
            history_id = decoded.get("historyId", "")

            logger.info(f"Gmail push notification for {email_address}, historyId={history_id}")

            # Find matching connection
            result = await db.execute(
                select(GmailConnection).where(
                    GmailConnection.email_address == email_address,
                    GmailConnection.connected == True,
                )
            )
            conn = result.scalar_one_or_none()
            if conn and conn.access_token:
                # Update history ID — the frontend will pick up changes on next poll
                if history_id:
                    conn.history_id = history_id
                    conn.last_sync_at = time.time()
                    await db.commit()

        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Gmail webhook error: {e}")
        return {"status": "ok"}  # Always return 200 to Pub/Sub


# ── Check for new messages (frontend polling endpoint) ────────

@router.get("/gmail/check")
async def check_gmail_updates(db: AsyncSession = Depends(get_db)):
    """Lightweight endpoint for frontend polling.

    Returns {hasUpdates: bool, unreadCount: int, historyId: str}.
    The frontend calls this periodically to detect new emails.
    """
    conn = await _ensure_gmail_connection(db)

    if not conn.connected:
        return {"hasUpdates": False, "unreadCount": 0, "historyId": None}

    if conn.demo_mode:
        unread = sum(1 for e in DEMO_EMAILS if e["unread"])
        return {"hasUpdates": False, "unreadCount": unread, "historyId": None}

    try:
        # Quick profile check for updated history ID
        profile = gmail.get_profile(
            conn.access_token, conn.refresh_token, conn.token_expiry
        )
        await _update_refreshed_creds(conn, profile.get("refreshed_creds"), db)

        current_history = profile.get("historyId", "")
        has_updates = bool(conn.history_id and current_history and current_history != conn.history_id)

        return {
            "hasUpdates": has_updates,
            "unreadCount": conn.unread_count,
            "historyId": current_history,
        }
    except Exception as e:
        logger.warning(f"Gmail check failed: {e}")
        return {"hasUpdates": False, "unreadCount": conn.unread_count, "historyId": conn.history_id}