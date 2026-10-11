export type SheetSource = 'google_sheets' | 'excel_upload' | 'csv_upload'
export type SheetStatus = 'not_analyzed' | 'analyzing' | 'analyzed' | 'error'
export type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'category'
export const SHEET_DASHBOARD_WIDGET_TYPES = [
  'sheet_summary',
  'kpi_cards',
  'revenue_trend',
  'category_breakdown',
  'data_table',
  'anomaly_alerts',
  'goal_progress',
  'sheet_task_suggestions',
] as const
export type SheetDashboardWidgetType = typeof SHEET_DASHBOARD_WIDGET_TYPES[number]
export type SheetValue = string | number | boolean | null
export type SheetRow = Record<string, SheetValue>

export interface SheetColumn {
  name: string
  type: ColumnType
}

export interface SheetAnalysis {
  engine: 'ai' | 'statistics'
  theme: string
  sheet_metadata: {
    id: string
    name: string
    source: SheetSource
    updated_at: string
    row_count: number
    column_count: number
  }
  summary: {
    row_count: number
    column_count: number
    date_range: { start: string; end: string } | null
    missing_values: number
  }
  detected_columns: SheetColumn[]
  key_metrics: {
    row_count: number
    column_count: number
    missing_values: number
    numeric: Record<string, {
      count: number
      total: number
      average: number | null
      minimum: number | null
      maximum: number | null
    }>
  }
  time_series: {
    date_column: string | null
    period: string
    metrics: string[]
    series: Array<Record<string, string | number | null>>
    trends?: Record<string, { direction: string; change: number | null; change_pct: number | null }>
  }
  category_breakdown: Record<string, Array<{ category: string; count: number }>>
  anomalies: Array<{ type: string; severity: string; column?: string; value?: number; message: string }>
  dataset_summary: Record<string, unknown>
  dashboard_plan: SheetDashboardPlan | null
  ai_summary: string | null
  ai_insights: string[]
  created_at: string
}

export interface SheetDashboardPlan {
  role: string
  title: string
  explanation: string
  clarificationQuestion?: string | null
  theme?: string
  task_suggestions: SheetTaskSuggestion[]
  discussion_points: string[]
  widgets: Array<{
    id: string
    type: SheetDashboardWidgetType
    title: string
    span: number
    order: number
    visible: boolean
    data: Record<string, unknown>
    reason: string
    actions: string[]
    is_ai_suggested?: boolean | null
  }>
}

export interface SheetTaskSuggestion {
  title: string
  reason: string
  priority: 'high' | 'medium' | 'low'
  due_date_suggestion: string | null
  metric: string | null
}

export interface SheetDashboardWidgetData {
  source_sheet_id: string
  source_sheet: string
  source: string
  date_range: { start: string; end: string } | null
  date_range_label: string
  row_count: number
  data_source_label: 'From sheet'
  ai_insight: boolean
  columns: SheetColumn[]
  rows: SheetRow[]
  metrics: Record<string, {
    count: number
    total: number
    average: number | null
    minimum: number | null
    maximum: number | null
  }>
  time_series: {
    date_column: string | null
    period: string
    metrics: string[]
    series: Array<Record<string, string | number | null>>
    trends?: Record<string, { direction: string; change: number | null; change_pct: number | null }>
  }
  category_breakdown: Record<string, Array<{ category: string; count: number }>>
  anomalies: Array<{ type: string; severity: string; column?: string; value?: number; message: string }>
  main_insight: string
  uncertainty_warning: string
  recommended_actions: string[]
  relevant_goals: string[]
}

export interface SheetAnalysisFilters {
  date_from?: string
  date_to?: string
  dimensions?: Record<string, string>
  metric?: string
  role?: string
  intent?: string
}

export interface SheetRecord {
  id: string
  name: string
  source: SheetSource
  file_name: string | null
  file_size: number
  updated_at: string
  row_count: number
  column_count: number
  columns: SheetColumn[]
  rows: SheetRow[]
  status: SheetStatus
  analysis: SheetAnalysis | null
}

export interface SheetCreateRequest {
  name: string
  source: SheetSource
  file_name?: string | null
  file_size: number
  row_count: number
  column_count: number
  columns: SheetColumn[]
  rows: SheetRow[]
}

export interface SheetUploadPayload {
  name: string
  columns: SheetColumn[]
  rows: SheetRow[]
}