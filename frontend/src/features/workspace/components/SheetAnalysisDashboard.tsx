import { useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, CheckCircle2, Filter, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { SheetAnalysis, SheetAnalysisFilters, SheetRecord, SheetTaskSuggestion } from '@/lib/sheets'
import { SheetCategoryChart, SheetTrendChart } from './SheetCharts'

function labelForColumn(name: string): string {
  const normalized = name.toLowerCase()
  if (normalized.includes('region')) return 'Region'
  if (normalized.includes('owner')) return 'Owner'
  if (normalized.includes('status')) return 'Status'
  return name
}

function formatMetric(value: number, column: string): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
    ...(column.toLowerCase().includes('revenue') || column.toLowerCase().includes('profit') ||
      column.toLowerCase().includes('expense') || column.toLowerCase().includes('cost')
      ? { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }
      : {}),
  }).format(value)
}

interface Kpi {
  label: string
  value: string
  detail: string
  tone: 'cyan' | 'emerald' | 'rose' | 'amber' | 'indigo'
}

function getKpis(analysis: SheetAnalysis, metric: string): Kpi[] {
  const numeric = analysis.key_metrics.numeric
  const columns = Object.keys(numeric)
  const kpis: Kpi[] = []
  const getColumn = (matcher: (name: string) => boolean) => columns.find(name => matcher(name.toLowerCase()))

  const revenue = getColumn(name => name.includes('revenue') || name.includes('sales'))
  const profit = getColumn(name => name.includes('profit'))
  const expenses = getColumn(name => name.includes('expense') || name.includes('spend') || name.includes('cost'))
  const completion = getColumn(name => name.includes('completion') || name.includes('progress'))

  for (const [column, label, tone] of [
    [revenue, 'Total revenue', 'cyan'],
    [profit, 'Total profit', 'emerald'],
    [expenses, 'Total expenses', 'amber'],
  ] as const) {
    if (column) {
      const stats = numeric[column]
      kpis.push({
        label,
        value: formatMetric(stats?.total ?? 0, column),
        detail: `Calculated from ${analysis.summary.row_count.toLocaleString()} selected-sheet rows`,
        tone,
      })
    }
  }

  const trend = analysis.time_series.trends?.[metric]
  if (trend && trend.change_pct !== null) {
    kpis.push({
      label: 'Period growth',
      value: `${trend.change_pct > 0 ? '+' : ''}${trend.change_pct}%`,
      detail: `${metric} · ${trend.direction.replace('_', ' ')}`,
      tone: trend.change_pct >= 0 ? 'emerald' : 'rose',
    })
  } else if (completion) {
    const average = numeric[completion]?.average
    if (average !== null && average !== undefined) {
      kpis.push({
        label: 'Average completion',
        value: `${average}%`,
        detail: `Calculated from ${completion} in this sheet`,
        tone: average >= 75 ? 'emerald' : average >= 45 ? 'amber' : 'rose',
      })
    }
  }

  if (kpis.length === 0 && metric && numeric[metric]) {
    const stats = numeric[metric]
    kpis.push(
      { label: `${metric} total`, value: formatMetric(stats.total, metric), detail: 'Calculated from this sheet', tone: 'cyan' },
      { label: `${metric} average`, value: formatMetric(stats.average ?? 0, metric), detail: `${stats.count.toLocaleString()} numeric values`, tone: 'indigo' },
    )
  }
  return kpis.slice(0, 4)
}

export function SheetAnalysisDashboard({
  sheet,
  analysis,
  onApplyFilters,
  isAnalyzing,
  onCreateTask,
  onCreateNote,
  onCreateGoal,
  onAttachMeeting,
}: {
  sheet: SheetRecord
  analysis: SheetAnalysis
  onApplyFilters: (filters: SheetAnalysisFilters) => void
  isAnalyzing: boolean
  onCreateTask: (suggestion: SheetTaskSuggestion) => void
  onCreateNote: () => void
  onCreateGoal: () => void
  onAttachMeeting: () => void
}) {
  const dateColumn = analysis.detected_columns.find(column => column.type === 'date')?.name
  const numericColumns = Object.keys(analysis.key_metrics.numeric)
  const categoryColumns = Object.keys(analysis.category_breakdown)
  const [metric, setMetric] = useState(numericColumns[0] ?? '')
  const [category, setCategory] = useState(categoryColumns[0] ?? '')
  const [dateFrom, setDateFrom] = useState(analysis.summary.date_range?.start ?? '')
  const [dateTo, setDateTo] = useState(analysis.summary.date_range?.end ?? '')
  const [dimensions, setDimensions] = useState<Record<string, string>>({})

  const importantRows = useMemo(() => {
    const statusColumn = sheet.columns.find(column => column.name.toLowerCase().includes('status'))?.name
    const profitColumn = sheet.columns.find(column => column.name.toLowerCase().includes('profit'))?.name
    const riskRank = (row: SheetRecord['rows'][number]) => {
      const status = String(statusColumn ? row[statusColumn] ?? '' : '').toLowerCase()
      const profit = profitColumn ? Number(row[profitColumn]) : 0
      return status.includes('overdue') || status.includes('blocked') || status.includes('stalled') ||
        status.includes('missed') || status.includes('at risk') || (Number.isFinite(profit) && profit < 0) ? 0 : 1
    }
    return [...sheet.rows].sort((left, right) => riskRank(left) - riskRank(right)).slice(0, 10)
  }, [sheet.columns, sheet.rows])

  const dimensionOptions = useMemo(() => {
    const categories = analysis.detected_columns.filter(column =>
      column.type === 'category' ||
      ['owner', 'region', 'status'].some(name => column.name.toLowerCase().includes(name))
    )
    return categories.map(column => ({
      name: column.name,
      label: labelForColumn(column.name),
      values: [...new Set(sheet.rows.map(row => row[column.name]).filter((value): value is string | number | boolean => value !== null && value !== undefined && value !== '').map(String))].sort(),
    }))
  }, [analysis.detected_columns, sheet.rows])
  const kpis = getKpis(analysis, metric)
  const toneStyles = {
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-950',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    rose: 'border-rose-200 bg-rose-50 text-rose-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-950',
  }

  const applyFilters = () => {
    const activeDimensions = Object.fromEntries(Object.entries(dimensions).filter(([, value]) => value))
    onApplyFilters({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      dimensions: activeDimensions,
      metric: metric || undefined,
    })
  }

  return (
    <section className="mt-6 space-y-5" aria-label="Spreadsheet analysis">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-surface-900">
            <BarChart3 className="h-5 w-5 text-cyan-800" aria-hidden="true" />
            Analysis from {sheet.name}
          </h3>
          <p className="mt-1 text-xs text-surface-600">
            All KPI values, trends, and anomalies below are calculated by the backend from this selected sheet.
            {analysis.engine === 'ai' ? ' AI text is qualitative; it does not calculate metrics.' : ' Statistical analysis mode.'}
          </p>
        </div>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-950">
          {analysis.summary.row_count.toLocaleString()} of {sheet.row_count.toLocaleString()} rows
        </span>
      </div>

      {analysis.dashboard_plan?.clarificationQuestion && (
        <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
          <span className="font-bold">Data clarification: </span>
          {analysis.dashboard_plan.clarificationQuestion}
        </p>
      )}

      <div className="flex flex-wrap gap-2" aria-label="Link this sheet insight to another workspace feature">
        <Button size="sm" variant="outline" onClick={onCreateNote} className="border-violet-200 text-violet-900 hover:bg-violet-50">Create note from insight</Button>
        {numericColumns.length > 0 && <Button size="sm" variant="outline" onClick={onCreateGoal} className="border-emerald-200 text-emerald-900 hover:bg-emerald-50">Add to goal</Button>}
        <Button size="sm" variant="outline" onClick={onAttachMeeting} className="border-indigo-200 text-indigo-900 hover:bg-indigo-50">Attach to meeting</Button>
      </div>

      {analysis.dashboard_plan?.task_suggestions.map((suggestion, index) => (
        <article key={`${suggestion.title}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-900">AI suggestion</span>
              <span className="text-[10px] font-bold uppercase text-amber-900">{suggestion.priority} priority</span>
            </div>
            <h4 className="mt-1 text-sm font-bold text-surface-900">{suggestion.title}</h4>
            <p className="mt-1 text-xs text-surface-700">{suggestion.reason}</p>
            <p className="mt-1 text-[10px] text-surface-600">
              Source: {sheet.name}{suggestion.metric ? ` · Metric: ${suggestion.metric}` : ''}
              {suggestion.due_date_suggestion ? ` · Date from sheet: ${suggestion.due_date_suggestion}` : ''}
            </p>
          </div>
          <Button size="sm" onClick={() => onCreateTask(suggestion)} className="bg-amber-700 hover:bg-amber-800">Confirm task</Button>
        </article>
      ))}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Calculated sheet statistics">
        <article className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-cyan-950">
          <p className="text-[10px] font-bold uppercase tracking-wide">Rows analyzed</p>
          <p className="mt-1 text-lg font-extrabold">{analysis.summary.row_count.toLocaleString()}</p>
        </article>
        <article className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-indigo-950">
          <p className="text-[10px] font-bold uppercase tracking-wide">Numeric columns</p>
          <p className="mt-1 text-lg font-extrabold">{numericColumns.length}</p>
        </article>
        <article className={cn('rounded-xl border p-3', analysis.summary.missing_values ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-emerald-200 bg-emerald-50 text-emerald-950')}>
          <p className="text-[10px] font-bold uppercase tracking-wide">Missing values</p>
          <p className="mt-1 text-lg font-extrabold">{analysis.summary.missing_values.toLocaleString()}</p>
        </article>
        <article className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-violet-950">
          <p className="text-[10px] font-bold uppercase tracking-wide">Date range</p>
          <p className="mt-1 truncate text-sm font-extrabold" title={analysis.summary.date_range ? `${analysis.summary.date_range.start} – ${analysis.summary.date_range.end}` : 'No date column'}>
            {analysis.summary.date_range ? `${analysis.summary.date_range.start} – ${analysis.summary.date_range.end}` : 'No date column'}
          </p>
        </article>
      </div>

      <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-surface-800">
          <Filter className="h-4 w-4 text-cyan-800" aria-hidden="true" />
          Filter analysis
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dateColumn && (
            <>
              <label className="text-xs font-semibold text-surface-700">
                Date from
                <input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </label>
              <label className="text-xs font-semibold text-surface-700">
                Date to
                <input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </label>
            </>
          )}
          {dimensionOptions.map(option => (
            <label key={option.name} className="text-xs font-semibold text-surface-700">
              {option.label}
              <select
                value={dimensions[option.name] ?? ''}
                onChange={event => setDimensions(current => ({ ...current, [option.name]: event.target.value }))}
                className="mt-1 block w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
              >
                <option value="">All {option.label.toLowerCase()}s</option>
                {option.values.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          ))}
          {numericColumns.length > 0 && (
            <label className="text-xs font-semibold text-surface-700">
              Metric
              <select value={metric} onChange={event => setMetric(event.target.value)} className="mt-1 block w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                {numericColumns.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          )}
          {categoryColumns.length > 0 && (
            <label className="text-xs font-semibold text-surface-700">
              Category chart
              <select value={category} onChange={event => setCategory(event.target.value)} className="mt-1 block w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                {categoryColumns.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          )}
        </div>
        <Button onClick={applyFilters} disabled={isAnalyzing} size="sm" className="mt-4 bg-cyan-800 hover:bg-cyan-900">
          {isAnalyzing ? 'Updating analysis…' : 'Apply filters'}
        </Button>
      </div>

      {isAnalyzing && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-950" role="status" aria-live="polite">
          Reading data and generating insights…
        </div>
      )}

      {kpis.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(kpi => (
            <article key={kpi.label} className={cn('rounded-2xl border p-4', toneStyles[kpi.tone])}>
              <p className="text-xs font-bold uppercase tracking-wide opacity-80">{kpi.label}</p>
              <p className="mt-2 text-2xl font-extrabold">{kpi.value}</p>
              <p className="mt-1 text-xs leading-relaxed opacity-80">{kpi.detail}</p>
            </article>
          ))}
        </div>
      )}

      {(analysis.time_series.series.length > 0 || categoryColumns.length > 0) && (
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <SheetTrendChart analysis={analysis} metric={metric} />
          <SheetCategoryChart analysis={analysis} category={category} />
        </div>
      )}

      <section className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-surface-900">Key rows from this sheet</h3>
            <p className="text-xs text-surface-600">Risk/status rows first, followed by the remaining sheet rows</p>
          </div>
          <span className="text-xs text-surface-500">{importantRows.length} rows shown</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-surface-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-surface-50">
              <tr>
                {sheet.columns.slice(0, 8).map(column => (
                  <th key={column.name} scope="col" className="whitespace-nowrap border-b border-surface-200 px-3 py-2 font-bold text-surface-800">
                    {column.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {importantRows.map((row, index) => (
                <tr key={index} className={index % 2 ? 'bg-surface-50/70' : 'bg-white'}>
                  {sheet.columns.slice(0, 8).map(column => (
                    <td key={column.name} className="max-w-56 truncate border-b border-surface-100 px-3 py-2 text-surface-700">
                      {row[column.name] === null ? '—' : String(row[column.name])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {analysis.anomalies.length > 0 && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4" aria-labelledby="sheet-risks-title">
          <h3 id="sheet-risks-title" className="flex items-center gap-2 font-bold text-rose-950">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            Anomalies and risks · {analysis.anomalies.length}
          </h3>
          <ul className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
            {analysis.anomalies.map((anomaly, index) => (
              <li key={`${anomaly.type}-${index}`} className={cn(
                'flex items-start gap-2 rounded-xl border bg-white p-3 text-sm',
                anomaly.severity === 'risk' ? 'border-rose-200 text-rose-950' : 'border-amber-200 text-amber-950'
              )}>
                <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', anomaly.severity === 'risk' ? 'text-rose-700' : 'text-amber-700')} aria-hidden="true" />
                <span>{anomaly.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {analysis.ai_summary && (
        <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
          <h3 className="flex items-center gap-2 font-bold text-violet-950">
            <Sparkles className="h-4 w-4 text-violet-700" aria-hidden="true" />
            Qualitative AI insights
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-surface-800">{analysis.ai_summary}</p>
          {analysis.ai_insights.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-surface-700">
              {analysis.ai_insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" aria-hidden="true" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </section>
  )
}