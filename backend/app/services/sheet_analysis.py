"""Deterministic spreadsheet profiling and chart-series generation."""

from collections import Counter, defaultdict
from datetime import date, datetime
from statistics import mean
from typing import Any, Literal, TypedDict

ColumnType = Literal["date", "number", "text", "category", "boolean"]
SheetValue = str | int | float | bool | None


class SheetColumn(TypedDict):
    name: str
    type: ColumnType


class SheetAnalysis(TypedDict):
    sheet_metadata: dict[str, Any]
    summary: dict[str, Any]
    detected_columns: list[SheetColumn]
    key_metrics: dict[str, Any]
    time_series: dict[str, Any]
    category_breakdown: dict[str, Any]
    anomalies: list[dict[str, Any]]
    dataset_summary: dict[str, Any]
    ai_summary: str | None
    ai_insights: list[str]
    engine: Literal["ai", "statistics"]
    created_at: str


def _parse_date(value: SheetValue) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return datetime.fromisoformat(value.strip().replace("Z", "+00:00")).date()
    except ValueError:
        for pattern in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d", "%b %d %Y", "%B %d %Y"):
            try:
                return datetime.strptime(value.strip(), pattern).date()
            except ValueError:
                continue
    return None


def _is_boolean(value: SheetValue) -> bool:
    return isinstance(value, bool) or (
        isinstance(value, str) and value.strip().lower() in {"true", "false", "yes", "no"}
    )


def _number(value: SheetValue) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", "").replace("$", "").replace("%", "").strip())
        except ValueError:
            return None
    return None


def detect_columns(columns: list[dict[str, Any]], rows: list[dict[str, SheetValue]]) -> list[SheetColumn]:
    detected: list[SheetColumn] = []
    for column in columns:
        name = str(column["name"])
        values = [row.get(name) for row in rows if row.get(name) not in (None, "")]
        if not values:
            kind: ColumnType = "text"
        elif all(_is_boolean(value) for value in values):
            kind = "boolean"
        elif all(_parse_date(value) is not None for value in values):
            kind = "date"
        elif all(_number(value) is not None for value in values):
            kind = "number"
        else:
            unique_count = len({str(value) for value in values})
            name_words = set(name.casefold().replace("_", " ").replace("-", " ").split())
            categorical_name = bool(name_words & {
                "category", "department", "owner", "product", "region", "status", "team", "type",
            })
            kind = "category" if categorical_name or unique_count <= 20 or unique_count / len(values) <= 0.2 else "text"
        detected.append({"name": name, "type": kind})
    return detected


def _trend(values: list[float]) -> dict[str, Any]:
    if len(values) < 2:
        return {"direction": "insufficient_data", "change": None, "change_pct": None}
    first, last = values[0], values[-1]
    change = last - first
    change_pct = (change / abs(first) * 100) if first != 0 else None
    threshold = max(abs(first) * 0.01, 1e-9)
    direction = "up" if change > threshold else "down" if change < -threshold else "flat"
    return {
        "direction": direction,
        "change": round(change, 2),
        "change_pct": round(change_pct, 2) if change_pct is not None else None,
    }


def _outliers(name: str, rows: list[dict[str, SheetValue]], values: list[float]) -> list[dict[str, Any]]:
    if len(values) < 4:
        return []
    ordered = sorted(values)

    def percentile(fraction: float) -> float:
        index = (len(ordered) - 1) * fraction
        lower = int(index)
        upper = min(lower + 1, len(ordered) - 1)
        return ordered[lower] + (ordered[upper] - ordered[lower]) * (index - lower)

    q1, q3 = percentile(0.25), percentile(0.75)
    spread = q3 - q1
    lower_bound, upper_bound = q1 - 1.5 * spread, q3 + 1.5 * spread
    results = []
    for row in rows:
        number = _number(row.get(name))
        if number is not None and (number < lower_bound or number > upper_bound):
            results.append({
                "type": "outlier",
                "severity": "warning",
                "column": name,
                "value": round(number, 2),
                "message": f"{name} value {number:g} is outside the typical range ({lower_bound:.2f}–{upper_bound:.2f}).",
            })
    return results


def build_sheet_analysis(
    name: str,
    sheet_id: str,
    source: str,
    rows: list[dict[str, SheetValue]],
    columns: list[dict[str, Any]],
    updated_at: str,
) -> SheetAnalysis:
    detected = detect_columns(columns, rows)
    row_count, column_count = len(rows), len(detected)
    date_columns = [column["name"] for column in detected if column["type"] == "date"]
    numeric_columns = [column["name"] for column in detected if column["type"] == "number"]
    category_columns = [column["name"] for column in detected if column["type"] == "category"]

    parsed_dates = [
        parsed
        for row in rows
        for column in date_columns
        if (parsed := _parse_date(row.get(column))) is not None
    ]
    date_range = (
        {"start": min(parsed_dates).isoformat(), "end": max(parsed_dates).isoformat()}
        if parsed_dates else None
    )
    missing_values = sum(
        1
        for row in rows
        for column in detected
        if row.get(column["name"]) is None or row.get(column["name"]) == ""
    )

    key_metrics: dict[str, Any] = {
        "row_count": row_count,
        "column_count": column_count,
        "missing_values": missing_values,
        "numeric": {},
    }
    anomalies: list[dict[str, Any]] = []
    for column in numeric_columns:
        values = [value for row in rows if (value := _number(row.get(column))) is not None]
        total = sum(values)
        key_metrics["numeric"][column] = {
            "count": len(values),
            "total": round(total, 2),
            "average": round(mean(values), 2) if values else None,
            "minimum": round(min(values), 2) if values else None,
            "maximum": round(max(values), 2) if values else None,
        }
        anomalies.extend(_outliers(column, rows, values))

    period_column = date_columns[0] if date_columns else None
    time_series: dict[str, Any] = {
        "date_column": period_column,
        "period": "month",
        "metrics": [],
        "series": [],
    }
    if period_column and numeric_columns:
        grouped: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
        for row in rows:
            parsed = _parse_date(row.get(period_column))
            if not parsed:
                continue
            period = parsed.strftime("%Y-%m")
            for column in numeric_columns:
                number = _number(row.get(column))
                if number is not None:
                    grouped[period][column].append(number)
        for period in sorted(grouped):
            values_for_period: dict[str, Any] = {"period": period}
            for column in numeric_columns:
                values = grouped[period].get(column, [])
                values_for_period[column] = round(sum(values), 2) if values else None
            time_series["series"].append(values_for_period)
        time_series["metrics"] = numeric_columns
        for column in numeric_columns:
            series_values = [
                value for point in time_series["series"]
                if (value := _number(point.get(column))) is not None
            ]
            time_series.setdefault("trends", {})[column] = _trend(series_values)
            for index in range(1, len(series_values)):
                previous = series_values[index - 1]
                current = series_values[index]
                if previous == 0:
                    continue
                change_pct = (current - previous) / abs(previous) * 100
                if change_pct <= -25:
                    anomalies.append({
                        "type": "period_decline",
                        "severity": "risk",
                        "column": column,
                        "message": f"{column} declined {abs(change_pct):.1f}% between consecutive periods.",
                    })

    category_breakdown: dict[str, Any] = {}
    for column in category_columns:
        counts = Counter(str(row[column]) for row in rows if row.get(column) not in (None, ""))
        category_breakdown[column] = [
            {"category": label, "count": count}
            for label, count in counts.most_common(12)
        ]

    lowered_names = {column["name"].lower(): column["name"] for column in detected}
    profit_column = next((name for key, name in lowered_names.items() if "profit" in key), None)
    status_column = next((name for key, name in lowered_names.items() if "status" in key), None)
    completion_column = next((name for key, name in lowered_names.items() if any(key_word in key for key_word in ("completion", "progress", "complete"))), None)
    target_column = next((name for key, name in lowered_names.items() if "target" in key), None)

    if profit_column:
        for row in rows:
            profit = _number(row.get(profit_column))
            if profit is not None and profit < 0:
                anomalies.append({
                    "type": "negative_profit",
                    "severity": "risk",
                    "column": profit_column,
                    "message": f"Negative profit detected: {profit:g}.",
                })
    if status_column:
        for row in rows:
            status = str(row.get(status_column) or "").strip().lower()
            if any(token in status for token in ("stalled", "blocked", "overdue", "missed", "late", "at risk")):
                anomalies.append({
                    "type": "status_risk",
                    "severity": "risk",
                    "column": status_column,
                    "message": f"Risk status detected: {row.get(status_column)}.",
                })
    if completion_column:
        for row in rows:
            completion = _number(row.get(completion_column))
            if completion is not None and completion < 25:
                anomalies.append({
                    "type": "low_completion",
                    "severity": "warning",
                    "column": completion_column,
                    "message": f"Low completion or progress detected: {completion:g}.",
                })
    if target_column:
        revenue_column = next((key for key in numeric_columns if "revenue" in key.lower()), None)
        if revenue_column:
            for row in rows:
                actual, target = _number(row.get(revenue_column)), _number(row.get(target_column))
                if actual is not None and target is not None and target > 0 and actual < target:
                    anomalies.append({
                        "type": "missed_target",
                        "severity": "warning",
                        "column": revenue_column,
                        "message": f"Revenue is below target ({actual:g} of {target:g}).",
                    })

    dataset_summary = {
        "name": name,
        "row_count": row_count,
        "column_count": column_count,
        "columns": detected,
        "date_range": date_range,
        "key_metrics": key_metrics["numeric"],
        "category_breakdown": category_breakdown,
        "time_series": time_series,
        "anomaly_count": len(anomalies),
    }
    return {
        "sheet_metadata": {
            "id": sheet_id,
            "name": name,
            "source": source,
            "updated_at": updated_at,
            "row_count": row_count,
            "column_count": column_count,
        },
        "summary": {
            "row_count": row_count,
            "column_count": column_count,
            "date_range": date_range,
            "missing_values": missing_values,
        },
        "detected_columns": detected,
        "key_metrics": key_metrics,
        "time_series": time_series,
        "category_breakdown": category_breakdown,
        "anomalies": anomalies[:100],
        "dataset_summary": dataset_summary,
        "ai_summary": None,
        "ai_insights": [],
        "engine": "statistics",
        "created_at": updated_at,
    }