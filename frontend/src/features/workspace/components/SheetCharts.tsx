import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import type { SheetAnalysis } from '@/lib/sheets'

const SERIES_COLORS = ['#2563eb', '#0891b2', '#059669', '#7c3aed', '#d97706', '#e11d48']

export function SheetTrendChart({
  analysis,
  metric,
}: {
  analysis: SheetAnalysis
  metric: string
}) {
  if (!analysis.time_series.series.length || !metric) return null
  const trend = analysis.time_series.trends?.[metric]

  return (
    <section className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm" aria-label={`${metric} time trend chart`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-surface-900">{metric} over time</h3>
          <p className="text-xs text-surface-600">Monthly totals from this sheet · {analysis.time_series.date_column}</p>
        </div>
        {trend && trend.change_pct !== null && (
          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
            trend.direction === 'up' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' :
              trend.direction === 'down' ? 'border-rose-200 bg-rose-50 text-rose-900' :
                'border-slate-200 bg-slate-50 text-slate-700'
          }`}>
            {trend.direction === 'up' ? 'Growth' : trend.direction === 'down' ? 'Decline' : 'Stable'} · {trend.change_pct > 0 ? '+' : ''}{trend.change_pct}%
          </span>
        )}
      </div>
      <div className="h-64" role="img" aria-label={`Monthly ${metric} totals, with month labels on the horizontal axis and ${metric} on the vertical axis`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={analysis.time_series.series} margin={{ top: 12, right: 12, left: 4, bottom: 6 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
            <XAxis dataKey="period" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#94a3b8' }} />
            <YAxis
              width={70}
              tick={{ fill: '#475569', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#94a3b8' }}
              tickFormatter={value => Number(value).toLocaleString()}
              label={{ value: metric, angle: -90, position: 'insideLeft', fill: '#334155', fontSize: 11 }}
            />
            <Tooltip
              formatter={value => [Number(value ?? 0).toLocaleString(), metric]}
              labelFormatter={label => `Period: ${label}`}
              contentStyle={{ borderRadius: 12, borderColor: '#c7d2fe', color: '#0f172a' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey={metric}
              name={metric}
              stroke={SERIES_COLORS[0]}
              strokeWidth={3}
              dot={{ fill: SERIES_COLORS[0], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: SERIES_COLORS[0] }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-surface-500">Horizontal axis: month · Vertical axis: {metric} total · Source: selected sheet</p>
    </section>
  )
}

export function SheetCategoryChart({
  analysis,
  category,
}: {
  analysis: SheetAnalysis
  category: string
}) {
  const data = analysis.category_breakdown[category] ?? []
  if (!data.length) return null

  return (
    <section className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm" aria-label={`${category} category breakdown chart`}>
      <div className="mb-3">
        <h3 className="font-bold text-surface-900">{category} breakdown</h3>
        <p className="text-xs text-surface-600">Record count by category from this sheet</p>
      </div>
      <div className="h-64" role="img" aria-label={`Number of sheet rows in each ${category} category`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 24 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="category" interval={0} angle={-15} textAnchor="end" height={50} tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#94a3b8' }} />
            <YAxis
              allowDecimals={false}
              tick={{ fill: '#475569', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#94a3b8' }}
              label={{ value: 'Rows', angle: -90, position: 'insideLeft', fill: '#334155', fontSize: 11 }}
            />
            <Tooltip
              formatter={value => [Number(value ?? 0).toLocaleString(), 'Rows']}
              labelFormatter={label => `${category}: ${label}`}
              contentStyle={{ borderRadius: 12, borderColor: '#a5f3fc', color: '#0f172a' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="count" name="Rows" fill={SERIES_COLORS[1]} radius={[6, 6, 0, 0]} maxBarSize={56} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-surface-500">Horizontal axis: {category} · Vertical axis: row count · Source: selected sheet</p>
    </section>
  )
}