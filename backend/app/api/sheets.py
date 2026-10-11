"""Persisted spreadsheet uploads and clearly labeled demo sheet connections."""

import json
import logging
import re
import uuid
from datetime import date, datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ValidationError, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import SheetGoal, SheetRecord
from app.services.sheet_analysis import build_sheet_analysis, detect_columns
from app.services.ai_service import groq_chat
from app.api.dashboard import DashboardPlan, Widget

router = APIRouter()
logger = logging.getLogger(__name__)

SheetSource = Literal["google_sheets", "excel_upload", "csv_upload"]
ColumnType = Literal["text", "number", "date", "boolean", "category"]
SHEET_WIDGET_TYPES = {
    "sheet_summary", "kpi_cards", "revenue_trend", "category_breakdown", "data_table",
    "anomaly_alerts", "goal_progress", "sheet_task_suggestions",
}
SHEET_THEMES = {"red-black", "ocean", "forest", "sunset", "citrus", "violet", "indigo"}
TaskPriority = Literal["high", "medium", "low"]
NUMBER_WORDS = re.compile(
    r"\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|"
    r"eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|"
    r"twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|"
    r"first|second|third)\b",
    re.IGNORECASE,
)


class SheetColumn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    type: ColumnType


class SheetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    source: SheetSource
    file_name: Optional[str] = Field(None, max_length=255)
    file_size: int = Field(0, ge=0, le=10 * 1024 * 1024)
    row_count: int = Field(..., ge=0, le=5000)
    column_count: int = Field(..., ge=1, le=100)
    columns: list[SheetColumn] = Field(..., min_length=1, max_length=100)
    rows: list[dict[str, Any]] = Field(..., max_length=5000)


class SheetTaskSuggestion(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    reason: str = Field(..., min_length=1, max_length=280)
    priority: TaskPriority
    due_date_suggestion: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    metric: Optional[str] = Field(None, max_length=200)


class SheetDashboardPlan(DashboardPlan):
    task_suggestions: list[SheetTaskSuggestion] = Field(default_factory=list, max_length=8)
    discussion_points: list[str] = Field(default_factory=list, max_length=8)

    @field_validator("widgets")
    @classmethod
    def only_approved_sheet_widgets(cls, widgets: list[Widget]) -> list[Widget]:
        if any(widget.type not in SHEET_WIDGET_TYPES for widget in widgets):
            raise ValueError("The plan contains an unapproved widget type.")
        return widgets


class SheetAnalysis(BaseModel):
    sheet_metadata: dict[str, Any]
    summary: dict[str, Any]
    detected_columns: list[SheetColumn]
    key_metrics: dict[str, Any]
    time_series: dict[str, Any]
    category_breakdown: dict[str, Any]
    anomalies: list[dict[str, Any]]
    dataset_summary: dict[str, Any]
    ai_summary: Optional[str] = None
    ai_insights: list[str] = Field(default_factory=list)
    dashboard_plan: Optional[SheetDashboardPlan] = None
    theme: str = "indigo"
    engine: Literal["ai", "statistics"]
    created_at: str


class AddToDashboardRequest(BaseModel):
    role: str = Field(..., min_length=1, max_length=100)


class SheetAnalysisFilters(BaseModel):
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    dimensions: dict[str, str] = Field(default_factory=dict)
    metric: Optional[str] = None
    role: str = Field("analyst", min_length=1, max_length=100)
    intent: Optional[str] = Field(None, max_length=500)


def _normalized_rows(payload: SheetCreate) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    columns = detect_columns(
        [column.model_dump() for column in payload.columns],
        payload.rows,
    )
    rows = [
        {column["name"]: row.get(column["name"]) for column in columns}
        for row in payload.rows
    ]
    return rows, columns


def _sheet_response(sheet: SheetRecord) -> dict[str, Any]:
    analysis = sheet.analysis
    current_analysis_fields = {
        "sheet_metadata", "summary", "detected_columns", "key_metrics", "time_series",
        "category_breakdown", "anomalies", "dataset_summary", "ai_summary",
        "ai_insights", "dashboard_plan", "engine", "created_at",
    }
    if not isinstance(analysis, dict) or not current_analysis_fields.issubset(analysis):
        analysis = None
        status = "not_analyzed" if sheet.status == "analyzed" else sheet.status
    else:
        status = sheet.status
    return {
        "id": sheet.id,
        "name": sheet.name,
        "source": sheet.source,
        "file_name": sheet.file_name,
        "file_size": sheet.file_size,
        "updated_at": sheet.updated_at,
        "row_count": sheet.row_count,
        "column_count": sheet.column_count,
        "columns": sheet.columns or [],
        "rows": sheet.rows or [],
        "status": status,
        "analysis": analysis,
    }


def _safe_ai_text(value: Any, limit: int = 280) -> str:
    if not isinstance(value, str) or re.search(r"\d", value) or NUMBER_WORDS.search(value):
        return ""
    return " ".join(value.split())[:limit]


def _deterministic_sheet_theme(sheet_name: str, columns: list[dict[str, Any]]) -> str:
    signal = f"{sheet_name} {' '.join(str(column.get('name', '')) for column in columns)}".casefold()
    if any(term in signal for term in ("sales", "revenue", "profit", "region")):
        return "red-black"
    if any(term in signal for term in ("marketing", "campaign", "conversion", "engagement")):
        return "sunset"
    if any(term in signal for term in ("health", "patient", "clinical", "medical")):
        return "forest"
    if any(term in signal for term in ("finance", "expense", "cost", "budget", "forecast")):
        return "citrus"
    if any(term in signal for term in ("risk", "incident", "security", "compliance")):
        return "violet"
    return "ocean"


def _validated_sheet_plan(
    response: str | None,
    role: str,
    sheet_name: str,
    analysis: dict[str, Any],
    source_dates: set[str],
) -> SheetDashboardPlan | None:
    if not response:
        return None
    try:
        plan = SheetDashboardPlan.model_validate_json(response)
    except (ValidationError, ValueError) as error:
        logger.warning("Grok returned an invalid sheet dashboard plan: %s", error)
        return None

    plan.role = role
    plan.title = f"{sheet_name} insights"
    plan.theme = plan.theme if plan.theme in SHEET_THEMES else "indigo"
    plan.explanation = _safe_ai_text(plan.explanation)
    plan.clarificationQuestion = _safe_ai_text(plan.clarificationQuestion)
    for widget in plan.widgets:
        widget.title = widget.type.replace("_", " ").title()
        widget.reason = _safe_ai_text(widget.reason)
        widget.actions = [
            safe_action
            for action in widget.actions[:5]
            if (safe_action := _safe_ai_text(action, 160))
        ]
        widget.data = {}
        widget.is_ai_suggested = True
    available_metrics = list(analysis.get("key_metrics", {}).get("numeric", {}))
    valid_tasks = []
    for task in plan.task_suggestions:
        task.title = _safe_ai_text(task.title, 200)
        task.reason = _safe_ai_text(task.reason)
        if task.metric not in available_metrics:
            text = f"{task.title} {task.reason}".casefold()
            metric_terms = (
                ("revenue", "sales"), ("expense", "cost", "spend"), ("profit",),
            )
            task.metric = next(
                (
                    metric
                    for terms in metric_terms
                    if any(term in text for term in terms)
                    for metric in available_metrics
                    if any(term in metric.casefold() for term in terms)
                ),
                available_metrics[0] if available_metrics else None,
            )
        if task.due_date_suggestion:
            try:
                date.fromisoformat(task.due_date_suggestion)
            except ValueError:
                task.due_date_suggestion = None
            if task.due_date_suggestion not in source_dates:
                task.due_date_suggestion = None
        if task.title and task.reason:
            valid_tasks.append(task)
    plan.task_suggestions = valid_tasks
    plan.discussion_points = [
        safe_text
        for item in plan.discussion_points[:8]
        if (safe_text := _safe_ai_text(item))
    ]
    return plan


def _sheet_dashboard_widgets(sheet: SheetRecord, role: str) -> list[dict[str, Any]]:
    analysis = sheet.analysis or {}
    metrics = analysis.get("key_metrics", {}).get("numeric", {})
    summary = analysis.get("summary", {})
    time_series = analysis.get("time_series", {})
    categories = analysis.get("category_breakdown", {})
    anomalies = analysis.get("anomalies", [])
    plan_data = analysis.get("dashboard_plan")
    try:
        plan = SheetDashboardPlan.model_validate(plan_data) if plan_data else None
    except ValidationError:
        logger.warning("Ignoring invalid stored dashboard plan for sheet %s", sheet.id)
        plan = None
    if plan and plan.role != role:
        plan = None

    suggested = {widget.type: widget for widget in plan.widgets} if plan else {}
    date_range = summary.get("date_range")
    date_label = (
        f"{date_range['start']} – {date_range['end']}"
        if isinstance(date_range, dict) and date_range.get("start") and date_range.get("end")
        else "No date range"
    )
    status_column = next(
        (column["name"] for column in (sheet.columns or []) if "status" in column["name"].casefold()),
        None,
    )
    profit_column = next(
        (column["name"] for column in (sheet.columns or []) if "profit" in column["name"].casefold()),
        None,
    )

    def risk_rank(row: dict[str, Any]) -> int:
        status = str(row.get(status_column) or "").casefold() if status_column else ""
        try:
            negative_profit = profit_column is not None and float(row.get(profit_column) or 0) < 0
        except (TypeError, ValueError):
            negative_profit = False
        return 0 if negative_profit or any(
            token in status for token in ("risk", "overdue", "stalled", "blocked", "missed")
        ) else 1

    important_rows = sorted(sheet.rows or [], key=risk_rank)[:10]
    columns = sheet.columns or []
    ai_summary = _safe_ai_text(plan.explanation) if plan else ""
    common = {
        "source_sheet_id": sheet.id,
        "source_sheet": sheet.name,
        "source": sheet.source.replace("_", " "),
        "date_range": date_range,
        "date_range_label": date_label,
        "row_count": summary.get("row_count", sheet.row_count),
        "data_source_label": "From sheet",
        "ai_insight": False,
        "columns": columns,
        "rows": important_rows,
        "metrics": metrics,
        "time_series": time_series,
        "category_breakdown": categories,
        "anomalies": anomalies,
        "main_insight": ai_summary or "Metrics and visualizations are calculated from this sheet.",
        "uncertainty_warning": _safe_ai_text(plan.clarificationQuestion) if plan else "",
        "recommended_actions": [],
        "relevant_goals": [],
        "task_suggestions": [task.model_dump() for task in plan.task_suggestions] if plan else [],
        "discussion_points": plan.discussion_points if plan else [],
        "theme": analysis.get("theme", "indigo"),
    }
    widgets: list[Widget] = []

    def add_widget(widget_type: str, order: int, *, span: int = 2, ai_insight: bool = False) -> None:
        suggestion = suggested.get(widget_type)
        data = dict(common)
        has_ai_text = plan is not None and (
            (widget_type == "sheet_summary" and bool(ai_summary)) or
            (suggestion is not None and bool(suggestion.reason or suggestion.actions))
        )
        data["ai_insight"] = ai_insight and has_ai_text
        if widget_type == "sheet_task_suggestions":
            data["recommended_actions"] = suggestion.actions if suggestion else []
        elif widget_type == "goal_progress":
            data["relevant_goals"] = suggestion.actions if suggestion else []
        reason = _safe_ai_text(suggestion.reason) if suggestion else ""
        widgets.append(Widget(
            id=f"sheet-{sheet.id}-{widget_type}",
            type=widget_type,
            title={
                "sheet_summary": "Sheet summary",
                "kpi_cards": "Key metrics",
                "revenue_trend": "Trend over time",
                "category_breakdown": "Category breakdown",
                "data_table": "Important rows",
                "anomaly_alerts": "Risks and anomalies",
                "goal_progress": "Relevant goals",
                "sheet_task_suggestions": "Suggested actions",
            }[widget_type],
            span=span,
            order=order,
            visible=True,
            data=data,
            reason=reason or f"Calculated and sourced from {sheet.name}.",
            actions=[],
            is_ai_suggested=bool(ai_insight and has_ai_text),
        ))

    if plan:
        for suggestion in sorted(plan.widgets, key=lambda widget: widget.order):
            add_widget(suggestion.type, suggestion.order, span=suggestion.span, ai_insight=True)
    else:
        order = 1
        add_widget("sheet_summary", order, ai_insight=True)
        order += 1
        if metrics:
            add_widget("kpi_cards", order)
            order += 1
        if time_series.get("series") and time_series.get("metrics"):
            add_widget("revenue_trend", order)
            order += 1
        if categories:
            add_widget("category_breakdown", order)
            order += 1
        add_widget("data_table", order)
        order += 1
        if anomalies:
            add_widget("anomaly_alerts", order, ai_insight=True)
            order += 1
        if any(
            any(token in column["name"].casefold() for token in ("target", "goal", "completion", "progress"))
            for column in columns
        ):
            add_widget("goal_progress", order, ai_insight=True)
            order += 1
        if common["task_suggestions"]:
            add_widget("sheet_task_suggestions", order, ai_insight=True)
    return [widget.model_dump() for widget in widgets]


DEMO_SHEETS = [
    {
        "name": "Sales Performance 2026",
        "columns": [
            {"name": "Date", "type": "date"}, {"name": "Region", "type": "category"},
            {"name": "Product", "type": "category"}, {"name": "Revenue", "type": "number"},
            {"name": "Expenses", "type": "number"}, {"name": "Profit", "type": "number"},
            {"name": "Status", "type": "category"}, {"name": "Owner", "type": "category"},
            {"name": "Tasks", "type": "number"},
        ],
        "rows": [
            {"Date": "2026-01-15", "Region": "West", "Product": "Cloud Suite", "Revenue": 84200, "Expenses": 51600, "Profit": 32600, "Status": "On track", "Owner": "A. Chen", "Tasks": 18},
            {"Date": "2026-02-15", "Region": "West", "Product": "Analytics", "Revenue": 91800, "Expenses": 53200, "Profit": 38600, "Status": "On track", "Owner": "A. Chen", "Tasks": 21},
            {"Date": "2026-03-15", "Region": "Central", "Product": "Cloud Suite", "Revenue": 77600, "Expenses": 54800, "Profit": 22800, "Status": "At risk", "Owner": "M. Patel", "Tasks": 17},
            {"Date": "2026-04-15", "Region": "East", "Product": "Security", "Revenue": 105300, "Expenses": 61200, "Profit": 44100, "Status": "On track", "Owner": "J. Rivera", "Tasks": 25},
            {"Date": "2026-05-15", "Region": "West", "Product": "Analytics", "Revenue": 112400, "Expenses": 64800, "Profit": 47600, "Status": "Completed", "Owner": "A. Chen", "Tasks": 28},
            {"Date": "2026-06-15", "Region": "Central", "Product": "Cloud Suite", "Revenue": 98500, "Expenses": 62500, "Profit": 36000, "Status": "On track", "Owner": "M. Patel", "Tasks": 24},
        ],
    },
    {
        "name": "Marketing Campaign Results",
        "columns": [
            {"name": "Date", "type": "date"}, {"name": "Region", "type": "category"},
            {"name": "Product", "type": "category"}, {"name": "Revenue", "type": "number"},
            {"name": "Expenses", "type": "number"}, {"name": "Profit", "type": "number"},
            {"name": "Status", "type": "category"}, {"name": "Owner", "type": "category"},
            {"name": "Tasks", "type": "number"},
        ],
        "rows": [
            {"Date": "2026-01-05", "Region": "North", "Product": "Spring Launch", "Revenue": 42800, "Expenses": 22100, "Profit": 20700, "Status": "Completed", "Owner": "S. Kim", "Tasks": 9},
            {"Date": "2026-02-05", "Region": "West", "Product": "Spring Launch", "Revenue": 51600, "Expenses": 24800, "Profit": 26800, "Status": "Completed", "Owner": "S. Kim", "Tasks": 11},
            {"Date": "2026-03-05", "Region": "East", "Product": "Brand Refresh", "Revenue": 48300, "Expenses": 29400, "Profit": 18900, "Status": "At risk", "Owner": "L. Morgan", "Tasks": 13},
            {"Date": "2026-04-05", "Region": "North", "Product": "Summer Preview", "Revenue": 62200, "Expenses": 30900, "Profit": 31300, "Status": "On track", "Owner": "L. Morgan", "Tasks": 14},
            {"Date": "2026-05-05", "Region": "West", "Product": "Summer Preview", "Revenue": 68400, "Expenses": 32200, "Profit": 36200, "Status": "On track", "Owner": "S. Kim", "Tasks": 16},
            {"Date": "2026-06-05", "Region": "East", "Product": "Brand Refresh", "Revenue": 59200, "Expenses": 30100, "Profit": 29100, "Status": "Completed", "Owner": "L. Morgan", "Tasks": 15},
        ],
    },
    {
        "name": "Project Delivery Tracker",
        "columns": [
            {"name": "Date", "type": "date"}, {"name": "Region", "type": "category"},
            {"name": "Product", "type": "category"}, {"name": "Revenue", "type": "number"},
            {"name": "Expenses", "type": "number"}, {"name": "Profit", "type": "number"},
            {"name": "Status", "type": "category"}, {"name": "Owner", "type": "category"},
            {"name": "Tasks", "type": "number"}, {"name": "Completion", "type": "number"},
        ],
        "rows": [
            {"Date": "2026-01-01", "Region": "North", "Product": "Customer Portal", "Revenue": 38000, "Expenses": 26600, "Profit": 11400, "Status": "On track", "Owner": "A. Chen", "Tasks": 14, "Completion": 24},
            {"Date": "2026-02-01", "Region": "West", "Product": "Billing Refresh", "Revenue": 41500, "Expenses": 29800, "Profit": 11700, "Status": "Stalled", "Owner": "M. Patel", "Tasks": 9, "Completion": 19},
            {"Date": "2026-03-01", "Region": "East", "Product": "Mobile Onboarding", "Revenue": 48200, "Expenses": 27100, "Profit": 21100, "Status": "On track", "Owner": "J. Rivera", "Tasks": 21, "Completion": 48},
            {"Date": "2026-04-01", "Region": "North", "Product": "Analytics Migration", "Revenue": 43700, "Expenses": 31200, "Profit": 12500, "Status": "At risk", "Owner": "S. Kim", "Tasks": 17, "Completion": 62},
            {"Date": "2026-05-01", "Region": "West", "Product": "Customer Portal", "Revenue": 53600, "Expenses": 32600, "Profit": 21000, "Status": "Completed", "Owner": "A. Chen", "Tasks": 25, "Completion": 86},
            {"Date": "2026-06-01", "Region": "East", "Product": "Billing Refresh", "Revenue": 55800, "Expenses": 34100, "Profit": 21700, "Status": "On track", "Owner": "M. Patel", "Tasks": 27, "Completion": 93},
        ],
    },
    {
        "name": "Monthly Expenses",
        "columns": [
            {"name": "Date", "type": "date"}, {"name": "Region", "type": "category"},
            {"name": "Product", "type": "category"}, {"name": "Revenue", "type": "number"},
            {"name": "Expenses", "type": "number"}, {"name": "Profit", "type": "number"},
            {"name": "Status", "type": "category"}, {"name": "Owner", "type": "category"},
            {"name": "Tasks", "type": "number"},
        ],
        "rows": [
            {"Date": "2026-01-20", "Region": "North", "Product": "Software", "Revenue": 52200, "Expenses": 41500, "Profit": 10700, "Status": "On track", "Owner": "K. Singh", "Tasks": 11},
            {"Date": "2026-02-20", "Region": "West", "Product": "Travel", "Revenue": 48800, "Expenses": 43800, "Profit": 5000, "Status": "On track", "Owner": "R. Jones", "Tasks": 13},
            {"Date": "2026-03-20", "Region": "East", "Product": "Advertising", "Revenue": 63100, "Expenses": 49200, "Profit": 13900, "Status": "Completed", "Owner": "K. Singh", "Tasks": 15},
            {"Date": "2026-04-20", "Region": "North", "Product": "Equipment", "Revenue": 59800, "Expenses": 47700, "Profit": 12100, "Status": "At risk", "Owner": "R. Jones", "Tasks": 12},
            {"Date": "2026-05-20", "Region": "West", "Product": "Software", "Revenue": 71200, "Expenses": 51600, "Profit": 19600, "Status": "On track", "Owner": "K. Singh", "Tasks": 18},
            {"Date": "2026-06-20", "Region": "East", "Product": "Travel", "Revenue": 66500, "Expenses": 52800, "Profit": 13700, "Status": "Completed", "Owner": "R. Jones", "Tasks": 16},
        ],
    },
]


@router.get("/sheets")
async def list_sheets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SheetRecord).order_by(SheetRecord.updated_at.desc()))
    return [_sheet_response(sheet) for sheet in result.scalars().all()]


@router.get("/sheets/{sheet_id}")
async def get_sheet(sheet_id: str, db: AsyncSession = Depends(get_db)):
    sheet = await db.get(SheetRecord, sheet_id)
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found.")
    return _sheet_response(sheet)


@router.post("/sheets", status_code=201, include_in_schema=False)
@router.post("/sheets/upload", status_code=201)
async def create_sheet(payload: SheetCreate, db: AsyncSession = Depends(get_db)):
    if len(payload.rows) != payload.row_count or len(payload.columns) != payload.column_count:
        raise HTTPException(status_code=422, detail="Sheet row and column counts do not match the supplied data.")
    expected_names = {column.name for column in payload.columns}
    if any(set(row) != expected_names for row in payload.rows):
        raise HTTPException(status_code=422, detail="Each sheet row must match the supplied column names.")
    rows, columns = _normalized_rows(payload)

    sheet = SheetRecord(
        id=str(uuid.uuid4()),
        name=payload.name.strip(),
        source=payload.source,
        file_name=payload.file_name,
        file_size=payload.file_size,
        updated_at=datetime.now(timezone.utc).isoformat(),
        row_count=payload.row_count,
        column_count=payload.column_count,
        columns=columns,
        rows=rows,
        status="not_analyzed",
        analysis=None,
    )
    db.add(sheet)
    await db.commit()
    await db.refresh(sheet)
    return _sheet_response(sheet)


@router.post("/sheets/demo-connect")
async def connect_demo_sheets(db: AsyncSession = Depends(get_db)):
    """Add synthetic Google Sheets samples; this never performs Google OAuth."""
    result = await db.execute(
        select(SheetRecord).where(SheetRecord.source == "google_sheets")
    )
    existing_by_name = {sheet.name: sheet for sheet in result.scalars().all()}
    connected = []

    for sample in DEMO_SHEETS:
        rows = sample["rows"]
        columns = detect_columns(sample["columns"], rows)
        existing = existing_by_name.get(sample["name"])
        if existing:
            if existing.columns != columns or existing.rows != rows:
                existing.columns = columns
                existing.rows = rows
                existing.row_count = len(rows)
                existing.column_count = len(columns)
                existing.updated_at = datetime.now(timezone.utc).isoformat()
                existing.status = "not_analyzed"
                existing.analysis = None
            connected.append(existing)
            continue
        sheet = SheetRecord(
            id=str(uuid.uuid4()),
            name=sample["name"],
            source="google_sheets",
            file_name=None,
            file_size=0,
            updated_at=datetime.now(timezone.utc).isoformat(),
            row_count=len(rows),
            column_count=len(columns),
            columns=columns,
            rows=rows,
            status="not_analyzed",
            analysis=None,
        )
        db.add(sheet)
        connected.append(sheet)

    await db.commit()
    for sheet in connected:
        await db.refresh(sheet)
    return {"sheets": [_sheet_response(sheet) for sheet in connected], "demo_mode": True}


@router.delete("/sheets/{sheet_id}", status_code=204)
async def delete_sheet(sheet_id: str, db: AsyncSession = Depends(get_db)):
    sheet = await db.get(SheetRecord, sheet_id)
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found.")
    await db.delete(sheet)
    await db.commit()


@router.post("/sheets/{sheet_id}/analyze", response_model=SheetAnalysis)
async def analyze_sheet(
    sheet_id: str,
    filters: SheetAnalysisFilters | None = None,
    db: AsyncSession = Depends(get_db),
):
    sheet = await db.get(SheetRecord, sheet_id)
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found.")

    sheet.status = "analyzing"
    await db.commit()
    filters = filters or SheetAnalysisFilters()
    columns = sheet.columns or []
    date_column = next((column["name"] for column in columns if column["type"] == "date"), None)
    filtered_rows = list(sheet.rows or [])
    if filters.date_from or filters.date_to:
        if date_column:
            filtered_rows = [
                row for row in filtered_rows
                if row.get(date_column) is not None
                and (not filters.date_from or str(row[date_column])[:10] >= filters.date_from)
                and (not filters.date_to or str(row[date_column])[:10] <= filters.date_to)
            ]
    for column_name, expected in filters.dimensions.items():
        if any(column["name"] == column_name for column in columns):
            filtered_rows = [
                row for row in filtered_rows
                if str(row.get(column_name, "")).strip().casefold() == expected.strip().casefold()
            ]

    analysis = build_sheet_analysis(
        name=sheet.name,
        sheet_id=sheet.id,
        source=sheet.source,
        rows=filtered_rows,
        columns=columns,
        updated_at=sheet.updated_at,
    )
    analysis["theme"] = _deterministic_sheet_theme(sheet.name, columns)
    goal_result = await db.execute(select(SheetGoal).where(SheetGoal.sheet_id == sheet.id))
    for goal in goal_result.scalars().all():
        metric_total = analysis["key_metrics"]["numeric"].get(goal.metric, {}).get("total")
        if isinstance(metric_total, (int, float)):
            goal.current_value = float(metric_total)
            goal.updated_at = datetime.now(timezone.utc).isoformat()
    relevant_rows = sorted(
        filtered_rows,
        key=lambda row: any(
            token in str(value).casefold()
            for column in columns
            if column["type"] in ("category", "text")
            for value in [row.get(column["name"])]
            for token in ("risk", "overdue", "stalled", "blocked", "missed", "negative")
        ),
        reverse=True,
    )
    sample_rows = [
        {key: value[:160] if isinstance(value, str) else value for key, value in list(row.items())[:20]}
        for row in relevant_rows[:6]
    ]
    prompt = (
        "Interpret these backend-calculated spreadsheet results as a dashboard planner. Return ONLY "
        "a JSON object matching the DashboardPlan schema shown in the system instruction. The "
        "explanation is the one-line dashboard summary. Use widget reason fields for concise trends, "
        "risks, recommended actions, relevant goals, and why each insight matters. Put action/task "
        "suggestions only in actions on sheet_task_suggestions widgets and goal suggestions only in "
        "actions on goal_progress widgets. Set clarificationQuestion when the provided data is "
        "incomplete or ambiguous. Include task_suggestions with title, reason, priority, optional "
        "due_date_suggestion, and metric. Due dates must exactly match a sample-row date or be null. "
        "Include a short discussion_points list. Do not calculate, estimate, restate, or invent any number. Use "
        "only supplied categorical labels and qualitative facts. The frontend fills widget data from "
        "backend results; leave widget data empty. Select only approved sheet widget types. "
        "Choose one visual theme from red-black, ocean, forest, sunset, citrus, violet, or indigo "
        "based on the user's request and dataset mood. The theme must be one exact name. "
        f"\nUser dashboard request: {filters.intent or 'Create a useful executive dashboard from this sheet.'}"
        f"\nRole: {filters.role}\n"
        f"Calculated summary and metrics: {json.dumps({key: analysis[key] for key in ('sheet_metadata', 'summary', 'detected_columns', 'key_metrics', 'time_series', 'category_breakdown', 'anomalies')})}\n"
        f"Relevant sample rows (maximum six): {json.dumps(sample_rows)}\n"
        f"Approved sheet widget types: {json.dumps(sorted(SHEET_WIDGET_TYPES))}"
    )
    ai_response = await groq_chat(
        [
            {
                "role": "system",
                "content": (
                    "You are a qualitative spreadsheet interpreter and dashboard planner. Never "
                    "calculate, infer, reproduce, or invent numeric values; do not include digits in "
                    "any generated text. All metrics are supplied by deterministic Python analysis. "
                    "Never fabricate data or arbitrary UI code. Select widgets only from the exact "
                    "approved sheet widget types in the user message. Return strict JSON matching "
                    "this schema: {\"role\": string, \"title\": string, \"explanation\": string, \"theme\": one of red-black|ocean|forest|sunset|citrus|violet|indigo, "
                    "\"clarificationQuestion\": string|null, \"widgets\": [{\"id\": string, "
                    "\"type\": approved sheet widget type, \"title\": string, \"span\": 1-4, "
                    "\"order\": integer, \"visible\": boolean, \"data\": {}, \"reason\": string, "
                    "\"actions\": [string], \"is_ai_suggested\": true}], \"task_suggestions\": "
                    "[{\"title\": string, \"reason\": string, \"priority\": high|medium|low, "
                    "\"due_date_suggestion\": ISO date|null, \"metric\": supplied numeric column|null}], "
                    "\"discussion_points\": [string]}. Include useful widgets "
                    "for trends, risks, actions, goals, summary, and relevant visualizations. "
                    "Use due dates only when the exact date appears in a sample row. Explanations "
                    "must be concise and based only on the provided data."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        json_mode=True,
        max_tokens=1600,
    )
    source_dates = {
        str(row.get(date_column))[:10]
        for row in filtered_rows
        if date_column and row.get(date_column)
    }
    planner = _validated_sheet_plan(ai_response, filters.role, sheet.name, analysis, source_dates)
    if planner:
        analysis["dashboard_plan"] = planner.model_dump()
        analysis["theme"] = planner.theme
        analysis["ai_summary"] = planner.explanation or None
        analysis["ai_insights"] = [
            widget.reason
            for widget in planner.widgets
            if widget.reason
        ][:8]
        analysis["engine"] = "ai"
    else:
        analysis["dashboard_plan"] = None
    analysis["created_at"] = datetime.now(timezone.utc).isoformat()
    sheet.status = "analyzed"
    sheet.analysis = analysis
    await db.commit()
    return analysis


@router.post("/sheets/{sheet_id}/add-to-dashboard")
async def add_sheet_to_dashboard(
    sheet_id: str,
    payload: AddToDashboardRequest,
    db: AsyncSession = Depends(get_db),
):
    sheet = await db.get(SheetRecord, sheet_id)
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found.")
    if sheet.status != "analyzed" or not isinstance(sheet.analysis, dict):
        raise HTTPException(status_code=409, detail="Analyze this sheet before adding its insights to the dashboard.")
    widgets = _sheet_dashboard_widgets(sheet, payload.role)
    return {
        "role": payload.role,
        "widgets": widgets,
        "ai_insights_available": any(
            widget["data"]["ai_insight"] or
            widget["data"]["recommended_actions"] or
            widget["data"]["relevant_goals"]
            for widget in widgets
        ),
    }