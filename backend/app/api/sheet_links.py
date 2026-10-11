"""Confirmed cross-module links from analyzed sheets to workspace records."""

import logging
from datetime import date, datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import CalendarEvent, CalendarSheetAttachment, SheetGoal, SheetInsightNote, SheetRecord, SheetSuggestedTask

router = APIRouter(prefix="/sheet-links", tags=["sheet insights"])
logger = logging.getLogger(__name__)


class TaskConfirmation(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    reason: str = Field(..., min_length=1, max_length=500)
    priority: Literal["high", "medium", "low"]
    due_date: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    metric: str | None = Field(None, max_length=200)


class GoalConfirmation(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    target_value: float
    deadline: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    metric: str = Field(..., min_length=1, max_length=200)
    direction: Literal["increase", "reduce"] = "increase"


class MeetingAttachmentConfirmation(BaseModel):
    event_id: int = Field(..., gt=0)


class TaskStatusUpdate(BaseModel):
    status: Literal["todo", "in-progress", "done"]


def _require_analysis(sheet: SheetRecord) -> dict[str, Any]:
    if sheet.status != "analyzed" or not isinstance(sheet.analysis, dict):
        raise HTTPException(status_code=409, detail="Analyze this sheet before creating a linked record.")
    return sheet.analysis


def _metric_total(sheet: SheetRecord, analysis: dict[str, Any], metric: str) -> float:
    if not any(column.get("name") == metric and column.get("type") == "number" for column in sheet.columns or []):
        raise HTTPException(status_code=422, detail="Choose a numeric metric from the selected sheet.")
    numeric = analysis.get("key_metrics", {}).get("numeric", {})
    value = numeric.get(metric, {}).get("total")
    if not isinstance(value, (int, float)):
        raise HTTPException(status_code=422, detail="The selected metric has no calculated numeric value.")
    return float(value)


def _task_response(task: SheetSuggestedTask) -> dict[str, Any]:
    return {
        "id": task.id,
        "title": task.title,
        "reason": task.reason,
        "priority": task.priority,
        "due_date": task.due_date,
        "status": task.status,
        "sheet_id": task.sheet_id,
        "sheet_name": task.sheet_name,
        "metric": task.metric,
        "ai_suggested": task.ai_suggested,
        "created_at": task.created_at,
        "source_url": f"/sheets?sheet={task.sheet_id}",
    }


def _note_response(note: SheetInsightNote) -> dict[str, Any]:
    return {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "preview": note.preview,
        "date": datetime.fromisoformat(note.created_at).strftime("%b %d"),
        "tag": "Sheet insight",
        "color": "border-violet-200 bg-violet-50/50",
        "sheet_id": note.sheet_id,
        "sheet_name": note.sheet_name,
        "source_url": f"/sheets?sheet={note.sheet_id}",
        "ai_suggested": True,
    }


def _goal_response(goal: SheetGoal) -> dict[str, Any]:
    distance = goal.target_value - goal.baseline_value
    if goal.direction == "reduce":
        distance = goal.baseline_value - goal.target_value
        progress = ((goal.baseline_value - goal.current_value) / distance * 100) if distance > 0 else 100
        remaining = goal.current_value - goal.target_value
    else:
        progress = (goal.current_value / goal.target_value * 100) if goal.target_value > 0 else 100
        remaining = goal.target_value - goal.current_value
    return {
        "id": goal.id,
        "title": goal.title,
        "target_value": goal.target_value,
        "current_value": goal.current_value,
        "baseline_value": goal.baseline_value,
        "remaining_gap": max(0, remaining) if goal.direction == "increase" else max(0, remaining),
        "progress_percent": round(max(0, min(progress, 100)), 1),
        "deadline": goal.deadline,
        "direction": goal.direction,
        "sheet_id": goal.sheet_id,
        "sheet_name": goal.sheet_name,
        "metric": goal.metric,
        "source_url": f"/sheets?sheet={goal.sheet_id}",
        "updated_at": goal.updated_at,
    }


@router.get("/tasks")
async def list_sheet_tasks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SheetSuggestedTask).order_by(SheetSuggestedTask.id.desc()))
    return [_task_response(task) for task in result.scalars().all()]


@router.post("/sheets/{sheet_id}/tasks", status_code=201)
async def confirm_sheet_task(
    sheet_id: str,
    payload: TaskConfirmation,
    db: AsyncSession = Depends(get_db),
):
    sheet = await db.get(SheetRecord, sheet_id)
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found.")
    analysis = _require_analysis(sheet)
    if payload.metric:
        _metric_total(sheet, analysis, payload.metric)
    if payload.due_date and not any(
        str(row.get(column.get("name", "")))[:10] == payload.due_date
        for column in sheet.columns or []
        if column.get("type") == "date"
        for row in sheet.rows or []
    ):
        raise HTTPException(status_code=422, detail="Suggested due date must come from a date in the source sheet.")
    task = SheetSuggestedTask(
        title=payload.title.strip(),
        reason=payload.reason.strip(),
        priority=payload.priority,
        due_date=payload.due_date,
        status="todo",
        sheet_id=sheet.id,
        sheet_name=sheet.name,
        metric=payload.metric,
        ai_suggested=True,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return _task_response(task)


@router.patch("/tasks/{task_id}")
async def update_sheet_task(task_id: int, payload: TaskStatusUpdate, db: AsyncSession = Depends(get_db)):
    task = await db.get(SheetSuggestedTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Sheet task not found.")
    task.status = payload.status
    await db.commit()
    await db.refresh(task)
    return _task_response(task)


@router.get("/notes")
async def list_sheet_notes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SheetInsightNote).order_by(SheetInsightNote.id.desc()))
    return [_note_response(note) for note in result.scalars().all()]


@router.post("/sheets/{sheet_id}/notes", status_code=201)
async def confirm_sheet_note(sheet_id: str, db: AsyncSession = Depends(get_db)):
    sheet = await db.get(SheetRecord, sheet_id)
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found.")
    analysis = _require_analysis(sheet)
    summary = analysis.get("summary", {})
    metrics = analysis.get("key_metrics", {}).get("numeric", {})
    date_range = summary.get("date_range")
    date_label = f"{date_range['start']} – {date_range['end']}" if date_range else "Not available"
    metric_lines = [
        f"- {name}: total {values.get('total')}, average {values.get('average')}"
        for name, values in metrics.items()
    ]
    plan = analysis.get("dashboard_plan") or {}
    recommended = [
        f"{suggestion.get('title')}: {suggestion.get('reason')}"
        for suggestion in plan.get("task_suggestions", [])
        if suggestion.get("title") and suggestion.get("reason")
    ] + [
        action
        for widget in plan.get("widgets", [])
        if widget.get("type") == "sheet_task_suggestions"
        for action in widget.get("actions", [])
    ]
    content = "\n".join([
        f"Source sheet: {sheet.name}",
        f"Date range: {date_label}",
        f"Calculated metrics (backend):\n" + ("\n".join(metric_lines) or "- No numeric metrics"),
        f"AI insight: {plan.get('explanation') or 'AI insight unavailable; showing calculated analysis.'}",
        "AI-recommended actions:\n" + ("\n".join(f"- {item}" for item in recommended) or "- None"),
        f"Source: /sheets?sheet={sheet.id}",
    ])
    now = datetime.now(timezone.utc).isoformat()
    note = SheetInsightNote(
        title=f"Insight: {sheet.name}",
        content=content,
        preview=content[:220],
        sheet_id=sheet.id,
        sheet_name=sheet.name,
        created_at=now,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return _note_response(note)


@router.get("/goals")
async def list_sheet_goals(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SheetGoal).order_by(SheetGoal.id.desc()))
    return [_goal_response(goal) for goal in result.scalars().all()]


@router.post("/sheets/{sheet_id}/goals", status_code=201)
async def confirm_sheet_goal(
    sheet_id: str,
    payload: GoalConfirmation,
    db: AsyncSession = Depends(get_db),
):
    sheet = await db.get(SheetRecord, sheet_id)
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found.")
    analysis = _require_analysis(sheet)
    if payload.deadline < date.today().isoformat():
        raise HTTPException(status_code=422, detail="Goal deadline cannot be in the past.")
    current = _metric_total(sheet, analysis, payload.metric)
    if payload.direction == "increase" and payload.target_value <= current:
        raise HTTPException(status_code=422, detail="An increase goal target must exceed the current value.")
    if payload.direction == "reduce" and payload.target_value >= current:
        raise HTTPException(status_code=422, detail="A reduce goal target must be below the current value.")
    goal = SheetGoal(
        title=payload.title.strip(),
        target_value=payload.target_value,
        current_value=current,
        baseline_value=current,
        deadline=payload.deadline,
        direction=payload.direction,
        sheet_id=sheet.id,
        sheet_name=sheet.name,
        metric=payload.metric,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return _goal_response(goal)


@router.post("/goals/{goal_id}/refresh")
async def refresh_sheet_goal(goal_id: int, db: AsyncSession = Depends(get_db)):
    goal = await db.get(SheetGoal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found.")
    sheet = await db.get(SheetRecord, goal.sheet_id)
    if not sheet:
        raise HTTPException(status_code=404, detail="Linked sheet not found.")
    analysis = _require_analysis(sheet)
    goal.current_value = _metric_total(sheet, analysis, goal.metric)
    goal.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(goal)
    return _goal_response(goal)


@router.get("/calendar/events/{event_id}/sheets")
async def get_event_sheet_attachments(event_id: int, db: AsyncSession = Depends(get_db)):
    event = await db.get(CalendarEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found.")
    result = await db.execute(
        select(CalendarSheetAttachment).where(CalendarSheetAttachment.event_id == event_id)
    )
    response = []
    for attachment in result.scalars().all():
        sheet = await db.get(SheetRecord, attachment.sheet_id)
        if not sheet or not isinstance(sheet.analysis, dict):
            continue
        analysis = sheet.analysis
        response.append({
            "sheet_id": sheet.id,
            "sheet_name": sheet.name,
            "source_url": f"/sheets?sheet={sheet.id}",
            "date_range": analysis.get("summary", {}).get("date_range"),
            "metrics": analysis.get("key_metrics", {}).get("numeric", {}),
            "trend": analysis.get("time_series", {}),
            "risks": analysis.get("anomalies", []),
            "discussion_points": (analysis.get("dashboard_plan") or {}).get("discussion_points", []),
            "ai_insight": (analysis.get("dashboard_plan") or {}).get("explanation", ""),
            "calculation_basis": "Metrics and risks are calculated by backend Python from the selected sheet.",
        })
    return response


@router.post("/sheets/{sheet_id}/calendar-attachments", status_code=201)
async def confirm_calendar_attachment(
    sheet_id: str,
    payload: MeetingAttachmentConfirmation,
    db: AsyncSession = Depends(get_db),
):
    sheet = await db.get(SheetRecord, sheet_id)
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found.")
    _require_analysis(sheet)
    event = await db.get(CalendarEvent, payload.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found.")
    existing = await db.execute(
        select(CalendarSheetAttachment).where(
            CalendarSheetAttachment.event_id == event.id,
            CalendarSheetAttachment.sheet_id == sheet.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This sheet is already attached to the selected event.")
    attachment = CalendarSheetAttachment(
        event_id=event.id,
        sheet_id=sheet.id,
        attached_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(attachment)
    await db.commit()
    return {
        "event_id": event.id,
        "event_title": event.title,
        "sheet_id": sheet.id,
        "sheet_name": sheet.name,
        "source_url": f"/sheets?sheet={sheet.id}",
    }