import {
  AlertTriangle, CheckCircle2, Sparkles, Table2, Trash2,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { SheetDashboardWidgetDataSchema } from '@/lib/api'
import type { SheetDashboardWidgetData, SheetDashboardWidgetType } from '@/lib/sheets'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const defaultChartPalette = ['#0891b2', '#2563eb', '#059669', '#7c3aed', '#d97706', '#e11d48']
const chartPalettes: Record<string, string[]> = {
  'red-black': ['#dc2626', '#111827', '#f97316', '#7f1d1d', '#374151', '#facc15'],
  ocean: ['#0891b2', '#2563eb', '#0e7490', '#38bdf8', '#1d4ed8', '#67e8f9'],
  forest: ['#166534', '#059669', '#65a30d', '#14532d', '#84cc16', '#10b981'],
  sunset: ['#ea580c', '#db2777', '#f59e0b', '#be123c', '#fb7185', '#f97316'],
  citrus: ['#ca8a04', '#65a30d', '#f97316', '#eab308', '#4d7c0f', '#facc15'],
  violet: ['#7c3aed', '#c026d3', '#4f46e5', '#9333ea', '#a855f7', '#e879f9'],
  indigo: defaultChartPalette,
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
}

function metricNameForChart(data: SheetDashboardWidgetData): string {
  return data.time_series.metrics.find(name => /revenue|sales/i.test(name)) ??
    data.time_series.metrics.find(name => /profit/i.test(name)) ??
    data.time_series.metrics[0] ?? ''
}

export function SheetDrivenWidget({
  id,
  type,
  title,
  data: rawData,
  reason,
  theme = 'indigo',
  onRemove,
}: {
  id: string
  type: SheetDashboardWidgetType
  title: string
  data: unknown
  reason: string
  theme?: string
  onRemove: (id: string) => void
}) {
  const navigate = useNavigate()
  const parsed = SheetDashboardWidgetDataSchema.safeParse(rawData)
  if (!parsed.success) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
        This sheet widget contains invalid data and cannot be displayed.
      </div>
    )
  }

  const data = parsed.data
  const chartColors = chartPalettes[theme] ?? defaultChartPalette
  const trendMetric = metricNameForChart(data)
  const categoryName = Object.keys(data.category_breakdown)[0] ?? ''
  const categoryData = data.category_breakdown[categoryName] ?? []

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-cyan-100 pb-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[10px] font-bold text-cyan-950">
          <Table2 className="h-3 w-3" aria-hidden="true" /> From sheet
        </span>
        {data.ai_insight && (
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-900">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> AI insight
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-surface-600" title={`${data.source_sheet} · ${data.date_range_label}`}>
          {data.source_sheet} · {data.date_range_label}
        </span>
        <button type="button" onClick={() => navigate(`/sheets?sheet=${encodeURIComponent(data.source_sheet_id)}`)} className="text-[10px] font-semibold text-cyan-800 hover:underline">
          Open insight
        </button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onRemove(id)}
          className="h-7 border-rose-200 px-2 text-[10px] text-rose-800 hover:bg-rose-50"
          aria-label={`Remove ${title} from dashboard`}
        >
          <Trash2 className="mr-1 h-3 w-3" aria-hidden="true" />
          Remove from dashboard
        </Button>
      </div>

      {type === 'sheet_summary' && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4">
          <p className="text-sm font-semibold leading-relaxed text-violet-950">{data.main_insight}</p>
          {data.uncertainty_warning && (
            <p role="note" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
              Data clarification: {data.uncertainty_warning}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-surface-700">
            <span className="rounded-lg bg-white px-2.5 py-1.5">{data.row_count.toLocaleString()} rows</span>
            <span className="rounded-lg bg-white px-2.5 py-1.5">{data.columns.length} columns</span>
            <span className="rounded-lg bg-white px-2.5 py-1.5">{data.source}</span>
          </div>
        </div>
      )}

      {data.ai_insight && reason && (
        <p className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs leading-relaxed text-violet-900">
          {reason}
        </p>
      )}

      {type === 'kpi_cards' && (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(data.metrics).slice(0, 6).map(([name, metric], index) => (
            <article key={name} className={cn(
              'rounded-xl border p-3',
              index % 3 === 0 ? 'border-cyan-200 bg-cyan-50 text-cyan-950' :
                index % 3 === 1 ? 'border-emerald-200 bg-emerald-50 text-emerald-950' :
                  'border-indigo-200 bg-indigo-50 text-indigo-950'
            )}>
              <p className="truncate text-[10px] font-bold uppercase tracking-wide">{name} total</p>
              <p className="mt-1 text-lg font-extrabold">{formatNumber(metric.total)}</p>
              <p className="mt-1 text-[10px] opacity-80">
                Average {metric.average === null ? '—' : formatNumber(metric.average)}
              </p>
            </article>
          ))}
        </div>
      )}

      {type === 'revenue_trend' && trendMetric && data.time_series.series.length > 0 && (
        <div className="h-56" role="img" aria-label={`${trendMetric} trend for ${data.source_sheet}; period on horizontal axis and total on vertical axis`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.time_series.series} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey="period" tick={{ fill: '#475569', fontSize: 10 }} />
              <YAxis tickFormatter={value => formatNumber(Number(value))} tick={{ fill: '#475569', fontSize: 10 }} />
              <Tooltip formatter={value => [formatNumber(Number(value ?? 0)), trendMetric]} labelFormatter={label => `Period: ${label}`} />
              <Legend />
              <Line dataKey={trendMetric} name={trendMetric} stroke={chartColors[1] ?? '#2563eb'} strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {type === 'category_breakdown' && categoryName && (
        <div className="h-56" role="img" aria-label={`Record count by ${categoryName} for ${data.source_sheet}`}>
          <ResponsiveContainer width="100%" height="100%">
            {categoryData.length <= 5 ? (
              <PieChart>
                <Pie data={categoryData} dataKey="count" nameKey="category" name="Rows" cx="50%" cy="50%" outerRadius="72%" label={({ name, percent }) => `${name ?? ''} ${(Number(percent) * 100).toFixed(0)}%`}>
                  {categoryData.map((entry, index) => (
                    <Cell key={entry.category} fill={chartColors[index % chartColors.length] ?? '#0891b2'} />
                  ))}
                </Pie>
                <Tooltip formatter={value => [formatNumber(Number(value ?? 0)), 'Rows']} />
                <Legend />
              </PieChart>
            ) : (
              <BarChart data={data.category_breakdown[categoryName]} margin={{ top: 8, right: 8, bottom: 22, left: 4 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="category" angle={-15} textAnchor="end" height={45} tick={{ fill: '#475569', fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 10 }} />
                <Tooltip formatter={value => [formatNumber(Number(value ?? 0)), 'Rows']} labelFormatter={label => `${categoryName}: ${label}`} />
                <Legend />
                <Bar dataKey="count" name="Rows" fill={chartColors[0] ?? '#0891b2'} radius={[5, 5, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {type === 'data_table' && (
        <div className="overflow-x-auto rounded-xl border border-cyan-100">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-cyan-50">
              <tr>{data.columns.slice(0, 7).map(column => (
                <th key={column.name} scope="col" className="whitespace-nowrap px-2.5 py-2 font-bold text-cyan-950">
                  {column.name}
                </th>
              ))}</tr>
            </thead>
            <tbody>
              {data.rows.slice(0, 8).map((row, index) => (
                <tr key={index} className={index % 2 ? 'bg-surface-50' : 'bg-white'}>
                  {data.columns.slice(0, 7).map(column => (
                    <td key={column.name} className="max-w-40 truncate border-t border-surface-100 px-2.5 py-2 text-surface-700">
                      {row[column.name] === null ? '—' : String(row[column.name] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
              {data.rows.length === 0 && <tr><td colSpan={Math.min(data.columns.length, 7)} className="p-3 text-surface-500">No rows available.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {type === 'anomaly_alerts' && (
        data.anomalies.length ? (
          <ul className="space-y-2">
            {data.anomalies.slice(0, 6).map((anomaly, index) => (
              <li key={`${anomaly.type}-${index}`} className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" aria-hidden="true" />
                <span>{anomaly.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> No calculated risks found in this sheet.
          </p>
        )
      )}

      {type === 'goal_progress' && (
        data.relevant_goals.length ? (
          <ul className="space-y-2">
            {data.relevant_goals.map((goal, index) => (
              <li key={index} className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">{goal}</li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            No relevant goal was suggested for this sheet.
          </p>
        )
      )}

      {type === 'sheet_task_suggestions' && (
        data.recommended_actions.length ? (
          <ul className="space-y-2">
            {data.recommended_actions.map((action, index) => (
              <li key={index} className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" aria-hidden="true" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-surface-200 bg-surface-50 p-3 text-sm text-surface-600">
            No AI-suggested actions are available.
          </p>
        )
      )}
    </div>
  )
}