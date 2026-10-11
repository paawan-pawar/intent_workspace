import { useEffect, useState } from 'react'
import { CalendarDays, FileText, ListTodo, Target, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { apiService, type CalendarEventFull } from '@/lib/api'
import type { SheetRecord, SheetTaskSuggestion } from '@/lib/sheets'

export type SheetLinkAction =
  | { kind: 'task'; sheet: SheetRecord; suggestion: SheetTaskSuggestion }
  | { kind: 'note'; sheet: SheetRecord }
  | { kind: 'goal'; sheet: SheetRecord }
  | { kind: 'meeting'; sheet: SheetRecord }

export type SheetLinkConfirmation =
  | { kind: 'task'; sheet: SheetRecord; suggestion: SheetTaskSuggestion }
  | { kind: 'note'; sheet: SheetRecord }
  | { kind: 'goal'; sheet: SheetRecord; title: string; target: number; deadline: string; metric: string; direction: 'increase' | 'reduce' }
  | { kind: 'meeting'; sheet: SheetRecord; eventId: number }

function defaultDate(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().slice(0, 10)
}

export function SheetLinkConfirmationDialog({
  action,
  onClose,
  onConfirm,
}: {
  action: SheetLinkAction | null
  onClose: () => void
  onConfirm: (confirmation: SheetLinkConfirmation) => Promise<void>
}) {
  const [events, setEvents] = useState<CalendarEventFull[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState('')
  const [eventId, setEventId] = useState('')
  const [goalTitle, setGoalTitle] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDeadline, setGoalDeadline] = useState(defaultDate)
  const [goalMetric, setGoalMetric] = useState('')
  const [goalDirection, setGoalDirection] = useState<'increase' | 'reduce'>('increase')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!action) return
    setGoalMetric(Object.keys(action.sheet.analysis?.key_metrics.numeric ?? {})[0] ?? '')
    setGoalTitle('')
    setGoalTarget('')
    setGoalDeadline(defaultDate())
    setGoalDirection('increase')
    setEventId('')
    if (action.kind !== 'meeting') return

    setEventsLoading(true)
    setEventsError('')
    void apiService.getCalendarEvents()
      .then(setEvents)
      .catch(error => setEventsError(error instanceof Error ? error.message : 'Calendar events could not be loaded.'))
      .finally(() => setEventsLoading(false))
  }, [action])

  if (!action) return null
  const sheet = action.sheet
  const metrics = sheet.analysis?.key_metrics.numeric ?? {}
  const selectedMetric = action.kind === 'goal' ? goalMetric : ''
  const metricTotal = selectedMetric ? metrics[selectedMetric]?.total : 0

  const confirm = async () => {
    let confirmation: SheetLinkConfirmation
    if (action.kind === 'task') {
      confirmation = action
    } else if (action.kind === 'note') {
      confirmation = action
    } else if (action.kind === 'goal') {
      if (!goalTitle.trim() || !goalMetric || !Number.isFinite(Number(goalTarget)) || !goalDeadline) return
      confirmation = {
        ...action,
        title: goalTitle.trim(),
        target: Number(goalTarget),
        deadline: goalDeadline,
        metric: goalMetric,
        direction: goalDirection,
      }
    } else {
      if (!eventId) return
      confirmation = { ...action, eventId: Number(eventId) }
    }
    setIsSubmitting(true)
    try {
      await onConfirm(confirmation)
    } finally {
      setIsSubmitting(false)
    }
  }

  const heading = {
    task: 'Confirm AI-suggested task',
    note: 'Create note from sheet insight?',
    goal: 'Create sheet-linked goal?',
    meeting: 'Attach analysis to calendar event?',
  }[action.kind]
  const icon = action.kind === 'task' ? <ListTodo className="h-5 w-5" /> :
    action.kind === 'note' ? <FileText className="h-5 w-5" /> :
      action.kind === 'goal' ? <Target className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-surface-950/60 p-3 backdrop-blur-sm" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget && !isSubmitting) onClose()
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="sheet-link-dialog-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-surface-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-cyan-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-violet-100 p-2 text-violet-800">{icon}</span>
            <div>
              <h2 id="sheet-link-dialog-title" className="font-bold text-surface-900">{heading}</h2>
              <p className="mt-1 text-xs text-surface-600">Source: {sheet.name} · calculated data from this sheet</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close confirmation" className="rounded-lg p-1.5 text-surface-500 hover:bg-white">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-4 p-5">
          {action.kind === 'task' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-900">AI suggestion</span>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-950">{action.suggestion.priority} priority</span>
              </div>
              <h3 className="mt-3 font-bold text-surface-900">{action.suggestion.title}</h3>
              <p className="mt-1 text-sm text-surface-700">{action.suggestion.reason}</p>
              <p className="mt-2 text-xs text-surface-600">
                {action.suggestion.metric ? `Metric: ${action.suggestion.metric}` : 'No numeric metric linked'}
                {action.suggestion.due_date_suggestion ? ` · Suggested due date: ${action.suggestion.due_date_suggestion}` : ' · No due date was derivable from the sheet'}
              </p>
              <p className="mt-2 text-xs text-surface-500">The task will only be created after you confirm.</p>
            </div>
          )}

          {action.kind === 'note' && (
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-surface-800">
              <p>A note will be created with the sheet name, date range, backend-calculated metrics, qualitative AI insight, recommended actions, and a link back to the sheet.</p>
              <p className="mt-2 font-semibold text-cyan-950">{sheet.name}</p>
            </div>
          )}

          {action.kind === 'goal' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-surface-700 sm:col-span-2">
                Goal title
                <input value={goalTitle} onChange={event => setGoalTitle(event.target.value)} placeholder="Increase monthly revenue" className="mt-1 block w-full rounded-lg border border-surface-200 px-3 py-2 text-sm" autoFocus />
              </label>
              <label className="text-xs font-semibold text-surface-700">
                Linked metric
                <select value={goalMetric} onChange={event => setGoalMetric(event.target.value)} className="mt-1 block w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm">
                  {Object.keys(metrics).map(metric => <option key={metric} value={metric}>{metric}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-surface-700">
                Goal direction
                <select value={goalDirection} onChange={event => setGoalDirection(event.target.value as 'increase' | 'reduce')} className="mt-1 block w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm">
                  <option value="increase">Increase value</option><option value="reduce">Reduce value</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-surface-700">
                Target value
                <input type="number" value={goalTarget} onChange={event => setGoalTarget(event.target.value)} placeholder={`Current: ${metricTotal ?? 0}`} className="mt-1 block w-full rounded-lg border border-surface-200 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-semibold text-surface-700">
                Deadline
                <input type="date" value={goalDeadline} onChange={event => setGoalDeadline(event.target.value)} className="mt-1 block w-full rounded-lg border border-surface-200 px-3 py-2 text-sm" />
              </label>
              <p className="text-xs leading-relaxed text-surface-600 sm:col-span-2">
                Current value is calculated by the backend from <strong>{selectedMetric || 'the selected metric'}</strong> in {sheet.name}. The target and deadline are yours to set.
              </p>
            </div>
          )}

          {action.kind === 'meeting' && (
            <div>
              <label className="block text-xs font-semibold text-surface-700">
                Calendar event
                <select value={eventId} onChange={event => setEventId(event.target.value)} disabled={eventsLoading || !!eventsError} className="mt-1 block w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm">
                  <option value="">{eventsLoading ? 'Loading calendar events…' : 'Choose an event'}</option>
                  {events.map(event => <option key={event.id} value={event.id}>{event.title} · {event.date} · {event.start_time}</option>)}
                </select>
              </label>
              {eventsError && <p role="alert" className="mt-2 text-xs text-rose-800">{eventsError}</p>}
              {!eventsLoading && !eventsError && events.length === 0 && <p className="mt-2 text-xs text-surface-600">No calendar events found. Add an event in Calendar first.</p>}
              <p className="mt-3 text-xs leading-relaxed text-surface-600">The event preparation view will show calculated KPIs, a trend chart, risks, and clearly labeled AI discussion points.</p>
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-surface-100 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            onClick={() => void confirm()}
            disabled={isSubmitting ||
              (action.kind === 'goal' && (!goalTitle.trim() || !goalMetric || !goalTarget || !goalDeadline)) ||
              (action.kind === 'meeting' && (!eventId || eventsLoading || !!eventsError))}
            className="bg-violet-700 hover:bg-violet-800"
          >
            {isSubmitting ? 'Saving…' : 'Confirm'}
          </Button>
        </footer>
      </section>
    </div>
  )
}