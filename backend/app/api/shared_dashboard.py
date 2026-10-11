"""
API endpoints for creating and viewing shared dashboard links.

POST /shared-dashboards       → Create a new shared link (returns the token + URL)
GET  /shared-dashboards/{token} → Get the dashboard snapshot by token (public, no auth)
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any, Optional

from app.db.database import get_db
from app.db.models import SharedDashboard

router = APIRouter()


# ── Request / Response Schemas ──────────────────────────────

class WidgetSnapshot(BaseModel):
    id: str
    type: str
    title: str
    span: int = Field(ge=1, le=4)
    order: int
    visible: bool
    data: Dict[str, Any]
    reason: str
    actions: List[str]
    is_ai_suggested: Optional[bool] = False


class CreateSharedDashboardRequest(BaseModel):
    role_id: str
    role_name: str
    title: str
    explanation: Optional[str] = None
    theme: Optional[str] = "indigo"
    widgets: List[WidgetSnapshot]
    shared_by: str = "Prototype User"


class SharedDashboardResponse(BaseModel):
    token: str
    title: str
    role_name: str
    explanation: Optional[str] = None
    theme: Optional[str] = "indigo"
    widgets: List[Dict[str, Any]]
    shared_by: str
    created_at: str
    view_count: int


class CreateSharedDashboardResponse(BaseModel):
    token: str
    share_url: str
    created_at: str


# ── Endpoints ───────────────────────────────────────────────

@router.post("/shared-dashboards", response_model=CreateSharedDashboardResponse)
async def create_shared_dashboard(
    req: CreateSharedDashboardRequest,
    db: AsyncSession = Depends(get_db),
):
    """Snapshot the current dashboard and return a shareable token."""
    token = uuid.uuid4().hex[:12]
    now = datetime.now(timezone.utc).isoformat()

    record = SharedDashboard(
        token=token,
        role_id=req.role_id,
        role_name=req.role_name,
        title=req.title,
        explanation=req.explanation,
        theme=req.theme,
        widgets=[w.model_dump() for w in req.widgets],
        shared_by=req.shared_by,
        created_at=now,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return CreateSharedDashboardResponse(
        token=token,
        share_url=f"/shared/{token}",
        created_at=now,
    )


@router.get("/shared-dashboards/{token}", response_model=SharedDashboardResponse)
async def get_shared_dashboard(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a shared dashboard snapshot by its token (public endpoint)."""
    result = await db.execute(
        select(SharedDashboard).where(SharedDashboard.token == token)
    )
    record = result.scalars().first()

    if not record:
        raise HTTPException(status_code=404, detail="Shared dashboard not found or link has expired.")

    # Bump view count
    record.view_count = (record.view_count or 0) + 1
    await db.commit()
    await db.refresh(record)

    return SharedDashboardResponse(
        token=record.token,
        title=record.title,
        role_name=record.role_name,
        explanation=record.explanation,
        theme=record.theme,
        widgets=record.widgets or [],
        shared_by=record.shared_by,
        created_at=record.created_at,
        view_count=record.view_count,
    )
