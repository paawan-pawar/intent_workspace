import { ExternalLink, ShieldAlert, Sparkles } from 'lucide-react'
import {
  CartesianGrid, Line, LineChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import type { CalendarSheetAttachment } from '@/lib/api'

export function SheetMeetingPrep({ attachment }: { attachment: CalendarSheetAttachment }) {
  const navigate = useNavigate()
  const chartMetric = attachment.trend.metrics.find(metric => /revenue|sales/i.test(metric)) ??
    attachment.trend.metrics.find(metric => /profit/i.test(metric)) ??
    attachment.trend.metrics[0]
  const dateRange = attachment.date_range
    ? `${attachment.date_range.start} – ${attachment.date_range.end}`
    : 'No date range'

  return (
    <article className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/60 to-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-surface-900">{attachment.sheet_name}</h4>
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-950">From sheet</span>
          </div>
          <p className="mt-1 text-xs text-surface-600">Data range: {dateRange}</p>
        </div>
        <button type="button" onClick={() => navigate(attachment.source_url)} className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-800 hover:underline">
          Open analysis <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      <p className="mt-3 rounded-lg border border-cyan-100 bg-white px-3 py-2 text-[11px] leading-relaxed text-cyan-950">
        Calculated sheet data: {attachment.calculation_basis}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
        {Object.entries(attachment.metrics).slice(0, 6).map(([name, metric]) => (
          <div key={name} className="rounded-xl border border-cyan-100 bg-white p-3">
            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-surface-600">{name}</p>
            <p className="mt-1 text-sm font-extrabold text-cyan-950">{metric.total.toLocaleString()}</p>
            <p className="text-[10px] text-surface-500">Calculated total from sheet</p>
          </div>
        ))}
      </div>

      {chartMetric && attachment.trend.series.length > 0 && (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-white p-3">
          <h5 className="text-xs font-bold text-indigo-950">{chartMetric} trend · calculated</h5>
          <div className="mt-2 h-40" role="img" aria-label={`${chartMetric} trend calculated from ${attachment.sheet_name}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attachment.trend.series}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis dataKey="period" tick={{ fill: '#475569', fontSize: 10 }} />
                <YAxis tickFormatter={value => Number(value).toLocaleString()} tick={{ fill: '#475569', fontSize: 10 }} />
                <Tooltip formatter={value => [Number(value ?? 0).toLocaleString(), chartMetric]} labelFormatter={label => `Period: ${label}`} />
                <Legend />
                <Line dataKey={chartMetric} name={chartMetric} stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {attachment.risks.length > 0 && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <h5 className="flex items-center gap-1.5 text-xs font-bold text-rose-950"><ShieldAlert className="h-4 w-4" /> Sheet risks · calculated</h5>
          <ul className="mt-2 space-y-1 text-xs text-rose-900">
            {attachment.risks.slice(0, 4).map((risk, index) => <li key={`${risk.type}-${index}`}>{risk.message}</li>)}
          </ul>
        </div>
      )}

      {attachment.discussion_points.length > 0 && (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
          <h5 className="flex items-center gap-1.5 text-xs font-bold text-violet-950"><Sparkles className="h-4 w-4" /> AI-generated discussion points</h5>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-violet-900">
            {attachment.discussion_points.map((point, index) => <li key={index}>{point}</li>)}
          </ul>
        </div>
      )}
    </article>
  )
}