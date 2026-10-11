"""Gmail API service layer.

Handles OAuth 2.0 flow, token management, message fetching, searching,
read/unread management, starring, and incremental sync via history IDs.
Tokens are stored server-side in the database only.

Pub/Sub push notifications are supported when GMAIL_PUBSUB_TOPIC is configured.
Otherwise the frontend polls for updates.
"""

import os
import time
import base64
import logging
import re
from datetime import datetime, timezone
from typing import Optional
from email.utils import parseaddr

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]

# Reuse the same Google OAuth client credentials as Calendar
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI_GMAIL = os.getenv(
    "GOOGLE_REDIRECT_URI_GMAIL",
    "http://localhost:8001/api/gmail/oauth/callback",
)

# Pub/Sub push notifications (optional)
GMAIL_PUBSUB_TOPIC = os.getenv("GMAIL_PUBSUB_TOPIC", "")  # e.g. "projects/my-project/topics/gmail-push"


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


def is_pubsub_configured() -> bool:
    """Check if Pub/Sub push notifications are configured."""
    topic = GMAIL_PUBSUB_TOPIC.strip()
    return bool(topic and not topic.startswith("projects/your-"))


def _get_client_config() -> dict:
    """Build the client config dict for google-auth-oauthlib."""
    return {
        "web": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GOOGLE_REDIRECT_URI_GMAIL],
        }
    }


# ── OAuth Flow ────────────────────────────────────────────────

def create_auth_url() -> tuple[str, str]:
    """Create an OAuth authorization URL for Gmail. Returns (url, state)."""
    flow = Flow.from_client_config(
        _get_client_config(),
        scopes=GMAIL_SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI_GMAIL,
    )
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return auth_url, state


def exchange_code(code: str, state: str) -> dict:
    """Exchange authorization code for tokens.

    Returns dict with access_token, refresh_token, token_expiry, email_address.
    """
    flow = Flow.from_client_config(
        _get_client_config(),
        scopes=GMAIL_SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI_GMAIL,
        state=state,
    )
    flow.fetch_token(code=code)
    creds = flow.credentials

    # Fetch the user's email address
    service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    profile = service.users().getProfile(userId="me").execute()

    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_expiry": creds.expiry.timestamp() if creds.expiry else time.time() + 3600,
        "email_address": profile.get("emailAddress", ""),
    }


def _build_credentials(
    access_token: str,
    refresh_token: Optional[str],
    token_expiry: Optional[float],
) -> Credentials:
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
    """Build Gmail API service. Returns (service, creds) — creds may be refreshed."""
    creds = _build_credentials(access_token, refresh_token, token_expiry)
    creds, _ = _refresh_if_needed(creds)
    service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    return service, creds


def _check_refreshed_creds(creds: Credentials, original_token: str) -> Optional[dict]:
    """Return refreshed creds dict if token changed, else None."""
    if creds.token != original_token:
        return {
            "access_token": creds.token,
            "token_expiry": creds.expiry.timestamp() if creds.expiry else time.time() + 3600,
        }
    return None


# ── HTML Sanitization ─────────────────────────────────────────

def _sanitize_html(html: str) -> str:
    """Basic sanitization of email HTML content.

    Strips <script>, <style>, event handlers, and dangerous attributes.
    For production use, consider a library like bleach.
    """
    if not html:
        return ""
    # Remove script and style tags and their contents
    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
    # Remove event handler attributes
    html = re.sub(r'\s+on\w+="[^"]*"', "", html, flags=re.IGNORECASE)
    html = re.sub(r"\s+on\w+='[^']*'", "", html, flags=re.IGNORECASE)
    # Remove javascript: URLs
    html = re.sub(r'href\s*=\s*"javascript:[^"]*"', 'href="#"', html, flags=re.IGNORECASE)
    html = re.sub(r"href\s*=\s*'javascript:[^']*'", "href='#'", html, flags=re.IGNORECASE)
    return html


# ── Message Parsing ───────────────────────────────────────────

def _parse_message(msg: dict) -> dict:
    """Parse a Gmail API message resource into a flat dict for the frontend.

    Returns dict with: id, threadId, sender, senderEmail, subject, snippet,
    date, unread, starred, hasAttachments, labelIds, category, body_html, body_text.
    """
    headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
    label_ids = msg.get("labelIds", [])

    # Parse sender
    from_header = headers.get("from", "")
    sender_name, sender_email = parseaddr(from_header)
    if not sender_name:
        sender_name = sender_email.split("@")[0] if sender_email else "Unknown"

    # Parse date
    internal_date_ms = int(msg.get("internalDate", 0))
    date_iso = datetime.fromtimestamp(internal_date_ms / 1000, tz=timezone.utc).isoformat()

    # Determine category from Gmail labels
    category = "focused"
    category_labels = {
        "CATEGORY_PROMOTIONS": "other",
        "CATEGORY_SOCIAL": "other",
        "CATEGORY_UPDATES": "other",
        "CATEGORY_FORUMS": "other",
        "CATEGORY_PERSONAL": "focused",
    }
    for label in label_ids:
        if label in category_labels:
            category = category_labels[label]
            break

    # Check attachments
    has_attachments = False
    payload = msg.get("payload", {})
    parts = payload.get("parts", [])
    if parts:
        for part in parts:
            if part.get("filename"):
                has_attachments = True
                break

    # Extract body
    body_html = ""
    body_text = ""

    def _extract_body(payload_part: dict):
        nonlocal body_html, body_text
        mime = payload_part.get("mimeType", "")
        body_data = payload_part.get("body", {}).get("data", "")
        if body_data:
            decoded = base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")
            if "html" in mime:
                body_html = decoded
            elif "plain" in mime:
                body_text = decoded
        for sub_part in payload_part.get("parts", []):
            _extract_body(sub_part)

    _extract_body(payload)

    return {
        "id": msg["id"],
        "threadId": msg.get("threadId", ""),
        "sender": sender_name,
        "senderEmail": sender_email,
        "subject": headers.get("subject", "(No subject)"),
        "snippet": msg.get("snippet", ""),
        "date": date_iso,
        "unread": "UNREAD" in label_ids,
        "starred": "STARRED" in label_ids,
        "hasAttachments": has_attachments,
        "labelIds": label_ids,
        "category": category,
        "body_html": _sanitize_html(body_html),
        "body_text": body_text,
    }


def _parse_message_summary(msg: dict) -> dict:
    """Parse a Gmail message into a lightweight summary (no body content).

    Used for list views to reduce payload size.
    """
    full = _parse_message(msg)
    # Strip body for list view
    full.pop("body_html", None)
    full.pop("body_text", None)
    return full


# ── Gmail API Operations ─────────────────────────────────────

def list_messages(
    access_token: str,
    refresh_token: Optional[str],
    token_expiry: Optional[float],
    query: str = "",
    max_results: int = 25,
    page_token: Optional[str] = None,
    label_ids: Optional[list[str]] = None,
) -> dict:
    """List messages from Gmail inbox.

    Returns {messages: list, nextPageToken: str|None, resultSizeEstimate: int,
             refreshed_creds: dict|None}
    """
    service, creds = _build_service(access_token, refresh_token, token_expiry)

    kwargs: dict = {
        "userId": "me",
        "maxResults": max_results,
    }
    if query:
        kwargs["q"] = query
    if page_token:
        kwargs["pageToken"] = page_token
    if label_ids:
        kwargs["labelIds"] = label_ids
    else:
        kwargs["labelIds"] = ["INBOX"]

    result = service.users().messages().list(**kwargs).execute()
    message_ids = result.get("messages", [])

    # Batch-fetch message details
    messages = []
    if message_ids:
        # Use batch for efficiency (up to 100 per batch)
        batch_ids = [m["id"] for m in message_ids]
        for msg_id in batch_ids:
            try:
                msg = service.users().messages().get(
                    userId="me", id=msg_id, format="metadata",
                    metadataHeaders=["From", "Subject", "Date"],
                ).execute()
                messages.append(_parse_message_summary(msg))
            except HttpError as e:
                logger.warning(f"Failed to fetch message {msg_id}: {e}")

    return {
        "messages": messages,
        "nextPageToken": result.get("nextPageToken"),
        "resultSizeEstimate": result.get("resultSizeEstimate", 0),
        "refreshed_creds": _check_refreshed_creds(creds, access_token),
    }


def get_message(
    access_token: str,
    refresh_token: Optional[str],
    token_expiry: Optional[float],
    message_id: str,
) -> dict:
    """Get a full message by ID.

    Returns {message: dict, refreshed_creds: dict|None}
    """
    service, creds = _build_service(access_token, refresh_token, token_expiry)

    msg = service.users().messages().get(
        userId="me", id=message_id, format="full",
    ).execute()

    return {
        "message": _parse_message(msg),
        "refreshed_creds": _check_refreshed_creds(creds, access_token),
    }


def search_messages(
    access_token: str,
    refresh_token: Optional[str],
    token_expiry: Optional[float],
    query: str,
    max_results: int = 25,
    page_token: Optional[str] = None,
) -> dict:
    """Search Gmail messages. Uses Gmail's native search syntax.

    Returns same shape as list_messages.
    """
    return list_messages(
        access_token, refresh_token, token_expiry,
        query=query, max_results=max_results, page_token=page_token,
    )


def modify_message(
    access_token: str,
    refresh_token: Optional[str],
    token_expiry: Optional[float],
    message_id: str,
    add_labels: Optional[list[str]] = None,
    remove_labels: Optional[list[str]] = None,
) -> dict:
    """Modify a message's labels (read/unread, star, etc).

    Returns {message: dict, refreshed_creds: dict|None}
    """
    service, creds = _build_service(access_token, refresh_token, token_expiry)

    body: dict = {}
    if add_labels:
        body["addLabelIds"] = add_labels
    if remove_labels:
        body["removeLabelIds"] = remove_labels

    msg = service.users().messages().modify(
        userId="me", id=message_id, body=body,
    ).execute()

    return {
        "message": _parse_message_summary(msg),
        "refreshed_creds": _check_refreshed_creds(creds, access_token),
    }


def mark_as_read(access_token: str, refresh_token: Optional[str],
                 token_expiry: Optional[float], message_id: str) -> dict:
    """Mark a message as read."""
    return modify_message(access_token, refresh_token, token_expiry,
                          message_id, remove_labels=["UNREAD"])


def mark_as_unread(access_token: str, refresh_token: Optional[str],
                   token_expiry: Optional[float], message_id: str) -> dict:
    """Mark a message as unread."""
    return modify_message(access_token, refresh_token, token_expiry,
                          message_id, add_labels=["UNREAD"])


def star_message(access_token: str, refresh_token: Optional[str],
                 token_expiry: Optional[float], message_id: str) -> dict:
    """Star a message."""
    return modify_message(access_token, refresh_token, token_expiry,
                          message_id, add_labels=["STARRED"])


def unstar_message(access_token: str, refresh_token: Optional[str],
                   token_expiry: Optional[float], message_id: str) -> dict:
    """Unstar a message."""
    return modify_message(access_token, refresh_token, token_expiry,
                          message_id, remove_labels=["STARRED"])


# ── History-based Incremental Sync ────────────────────────────

def get_history(
    access_token: str,
    refresh_token: Optional[str],
    token_expiry: Optional[float],
    start_history_id: str,
) -> dict:
    """Get mailbox changes since start_history_id.

    Returns {history: list, historyId: str, refreshed_creds: dict|None}
    Raises HttpError(404) if history ID is too old (requires full resync).
    """
    service, creds = _build_service(access_token, refresh_token, token_expiry)

    all_history = []
    page_token = None
    latest_history_id = start_history_id

    try:
        while True:
            kwargs: dict = {
                "userId": "me",
                "startHistoryId": start_history_id,
                "historyTypes": ["messageAdded", "messageDeleted", "labelAdded", "labelRemoved"],
                "labelId": "INBOX",
            }
            if page_token:
                kwargs["pageToken"] = page_token

            result = service.users().history().list(**kwargs).execute()
            history = result.get("history", [])
            all_history.extend(history)
            latest_history_id = result.get("historyId", latest_history_id)

            page_token = result.get("nextPageToken")
            if not page_token:
                break
    except HttpError as e:
        if e.resp.status == 404:
            # History ID is too old — caller should do full resync
            raise
        raise

    return {
        "history": all_history,
        "historyId": latest_history_id,
        "refreshed_creds": _check_refreshed_creds(creds, access_token),
    }


def get_profile(
    access_token: str,
    refresh_token: Optional[str],
    token_expiry: Optional[float],
) -> dict:
    """Get the user's Gmail profile. Returns {emailAddress, historyId, messagesTotal, threadsTotal}."""
    service, creds = _build_service(access_token, refresh_token, token_expiry)
    profile = service.users().getProfile(userId="me").execute()
    return {
        **profile,
        "refreshed_creds": _check_refreshed_creds(creds, access_token),
    }


# ── Pub/Sub Watch ─────────────────────────────────────────────

def setup_watch(
    access_token: str,
    refresh_token: Optional[str],
    token_expiry: Optional[float],
) -> dict:
    """Set up Gmail push notifications via Pub/Sub.

    Must be called to start receiving push notifications, and re-called
    before expiration (max ~7 days).

    Returns {historyId: str, expiration: int (ms), refreshed_creds: dict|None}
    """
    if not is_pubsub_configured():
        raise ValueError("GMAIL_PUBSUB_TOPIC is not configured")

    service, creds = _build_service(access_token, refresh_token, token_expiry)

    result = service.users().watch(
        userId="me",
        body={
            "topicName": GMAIL_PUBSUB_TOPIC,
            "labelIds": ["INBOX"],
            "labelFilterBehavior": "include",
        },
    ).execute()

    return {
        "historyId": result.get("historyId", ""),
        "expiration": result.get("expiration", 0),
        "refreshed_creds": _check_refreshed_creds(creds, access_token),
    }


def stop_watch(
    access_token: str,
    refresh_token: Optional[str],
    token_expiry: Optional[float],
) -> dict:
    """Stop Gmail push notifications."""
    service, creds = _build_service(access_token, refresh_token, token_expiry)
    service.users().stop(userId="me").execute()
    return {
        "refreshed_creds": _check_refreshed_creds(creds, access_token),
    }