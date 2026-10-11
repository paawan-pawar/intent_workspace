import React, { useState } from 'react'
import { Info, Pin, EyeOff, Clock, MessageSquare, CheckSquare, User, CalendarPlus, ChevronUp, ChevronDown, Maximize2, Minimize2, Sparkles, Sun, ArrowUpRight, ArrowDownRight, AlertTriangle, GitPullRequest, BarChart3, ShieldAlert, DollarSign, Mail, FileText } from 'lucide-react'
import { WidgetModel, ScheduleMeetingRequest } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useToast } from '@/app/providers/ToastProvider'
import { SHEET_DASHBOARD_WIDGET_TYPES } from '@/lib/sheets'
import { SheetDrivenWidget } from '@/features/workspace/components/SheetDrivenWidget'

const sheetWidgetTypes: readonly string[] = SHEET_DASHBOARD_WIDGET_TYPES

interface WidgetRendererProps {
  widget: WidgetModel
  isPinned: boolean
  onTogglePin: (id: string) => void
  onHide: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onResize: (id: string) => void
  onRemoveSheetWidget: (id: string) => void
  onScheduleMeeting?: (req: Omit<ScheduleMeetingRequest, 'currentPlan'>) => Promise<void>
}

interface WidgetPresentation {
  border: string
  header: string
  background: string
  iconBackground: string
  iconColor: string
  icon: React.ReactNode
}

function getWidgetPresentation(widget: WidgetModel): WidgetPresentation {
  if (widget.is_ai_suggested || ['daily_briefing', 'meeting_summary', 'meeting_notes'].includes(widget.type)) {
    return {
      border: 'border-l-violet-500',
      header: 'bg-gradient-to-r from-violet-50 to-white border-b border-violet-100',
      background: 'bg-gradient-to-b from-violet-50/40 via-white to-white',
      iconBackground: 'bg-violet-100',
      iconColor: 'text-violet-700',
      icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
    }
  }

  if (widget.type === 'revenue_trend') {
    return {
      border: 'border-l-indigo-500',
      header: 'bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100',
      background: 'bg-gradient-to-b from-indigo-50/40 via-white to-white',
      iconBackground: 'bg-indigo-100',
      iconColor: 'text-indigo-700',
      icon: <BarChart3 className="h-4 w-4" aria-hidden="true" />,
    }
  }

  if (['kpi_cards', 'category_breakdown', 'data_table'].includes(widget.type)) {
    return {
      border: 'border-l-cyan-500',
      header: 'bg-gradient-to-r from-cyan-50 to-white border-b border-cyan-100',
      background: 'bg-gradient-to-b from-cyan-50/40 via-white to-white',
      iconBackground: 'bg-cyan-100',
      iconColor: 'text-cyan-800',
      icon: <BarChart3 className="h-4 w-4" aria-hidden="true" />,
    }
  }

  if (widget.type === 'anomaly_alerts') {
    return {
      border: 'border-l-rose-500',
      header: 'bg-gradient-to-r from-rose-50 to-white border-b border-rose-100',
      background: 'bg-gradient-to-b from-rose-50/40 via-white to-white',
      iconBackground: 'bg-rose-100',
      iconColor: 'text-rose-800',
      icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
    }
  }

  if (sheetWidgetTypes.includes(widget.type)) {
    return {
      border: 'border-l-violet-500',
      header: 'bg-gradient-to-r from-violet-50 to-white border-b border-violet-100',
      background: 'bg-gradient-to-b from-violet-50/40 via-white to-white',
      iconBackground: 'bg-violet-100',
      iconColor: 'text-violet-700',
      icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
    }
  }

  if (['calendar', 'patient_schedule', 'meeting_scheduler'].includes(widget.type)) {
    return {
      border: 'border-l-indigo-500',
      header: 'bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100',
      background: 'bg-gradient-to-b from-indigo-50/40 via-white to-white',
      iconBackground: 'bg-indigo-100',
      iconColor: 'text-indigo-700',
      icon: <CalendarPlus className="h-4 w-4" aria-hidden="true" />,
    }
  }

  if (widget.type === 'messages') {
    return {
      border: 'border-l-cyan-500',
      header: 'bg-gradient-to-r from-cyan-50 to-white border-b border-cyan-100',
      background: 'bg-gradient-to-b from-cyan-50/40 via-white to-white',
      iconBackground: 'bg-cyan-100',
      iconColor: 'text-cyan-800',
      icon: <Mail className="h-4 w-4" aria-hidden="true" />,
    }
  }

  if (['tasks', 'lab_results', 'pull_requests'].includes(widget.type)) {
    return {
      border: 'border-l-emerald-500',
      header: 'bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100',
      background: 'bg-gradient-to-b from-emerald-50/40 via-white to-white',
      iconBackground: 'bg-emerald-100',
      iconColor: 'text-emerald-800',
      icon: widget.type === 'pull_requests'
        ? <GitPullRequest className="h-4 w-4" aria-hidden="true" />
        : <CheckSquare className="h-4 w-4" aria-hidden="true" />,
    }
  }

  if (widget.type === 'incidents') {
    return {
      border: 'border-l-rose-500',
      header: 'bg-gradient-to-r from-rose-50 to-white border-b border-rose-100',
      background: 'bg-gradient-to-b from-rose-50/40 via-white to-white',
      iconBackground: 'bg-rose-100',
      iconColor: 'text-rose-800',
      icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
    }
  }

  if (widget.type === 'risk_alerts') {
    return {
      border: 'border-l-amber-500',
      header: 'bg-gradient-to-r from-amber-50 to-white border-b border-amber-100',
      background: 'bg-gradient-to-b from-amber-50/40 via-white to-white',
      iconBackground: 'bg-amber-100',
      iconColor: 'text-amber-800',
      icon: <ShieldAlert className="h-4 w-4" aria-hidden="true" />,
    }
  }

  if (['sprint_board', 'market_watch', 'portfolio'].includes(widget.type)) {
    return {
      border: 'border-l-cyan-500',
      header: 'bg-gradient-to-r from-cyan-50 to-white border-b border-cyan-100',
      background: 'bg-gradient-to-b from-cyan-50/40 via-white to-white',
      iconBackground: 'bg-cyan-100',
      iconColor: 'text-cyan-800',
      icon: widget.type === 'portfolio'
        ? <DollarSign className="h-4 w-4" aria-hidden="true" />
        : <BarChart3 className="h-4 w-4" aria-hidden="true" />,
    }
  }

  return {
    border: 'border-l-indigo-500',
    header: 'bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100',
    background: 'bg-gradient-to-b from-indigo-50/40 via-white to-white',
    iconBackground: 'bg-indigo-100',
    iconColor: 'text-indigo-700',
    icon: <FileText className="h-4 w-4" aria-hidden="true" />,
  }
}

function isOverdueTask(dueDate: string | undefined): boolean {
  if (!dueDate) return false
  if (['yesterday', 'overdue'].includes(dueDate.trim().toLowerCase())) return true

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate)
  if (!match) return false

  const due = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

export function WidgetRenderer({ widget, isPinned, onTogglePin, onHide, onMoveUp, onMoveDown, onResize, onRemoveSheetWidget, onScheduleMeeting, theme }: WidgetRendererProps & { theme?: string }) {
  const [showReason, setShowReason] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()
  const presentation = getWidgetPresentation(widget)
  const renderEmptyState = (icon: React.ReactNode, message: string) => (
    <EmptyState
      icon={icon}
      message={message}
      iconClassName={cn(presentation.iconBackground, presentation.iconColor)}
    />
  )

  // Scheduler Form State
  const [title, setTitle] = useState("Q4 Planning Sync")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0] ?? '')
  const [time, setTime] = useState("13:00")
  const [duration, setDuration] = useState("60")
  const [attendees, setAttendees] = useState("alice@example.com, bob@example.com")

  const handleCreateMeeting = async () => {
    setIsSubmitting(true)
    if (onScheduleMeeting) {
      await onScheduleMeeting({ title, date, time, duration, attendees })
    }
    setIsSubmitting(false)
    setIsModalOpen(false)
  }

  const handleAction = (action: string) => {
    if (action.includes("Confirm")) {
      showToast(`${action} completed successfully`)
    } else if (action === "Save Notes") {
      showToast("Notes saved")
    } else {
      showToast(`Triggered: ${action}`)
    }
  }

  const renderContent = () => {
    switch (widget.type) {
      case 'daily_briefing':
        return (
          <div className="flex items-start gap-4 p-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 shrink-0">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <p className="text-lg text-surface-900 leading-relaxed font-medium">
                {widget.data.briefing}
              </p>
            </div>
          </div>
        )

      case 'meeting_scheduler':
        return (
          <div className="flex flex-col space-y-4">
            <div>
              <label htmlFor={`title-${widget.id}`} className="block text-xs font-bold text-surface-500 uppercase mb-1">Meeting Title</label>
              <input id={`title-${widget.id}`} type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor={`date-${widget.id}`} className="block text-xs font-bold text-surface-500 uppercase mb-1">Date</label>
                <input id={`date-${widget.id}`} type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors" />
              </div>
              <div>
                <label htmlFor={`time-${widget.id}`} className="block text-xs font-bold text-surface-500 uppercase mb-1">Time</label>
                <input id={`time-${widget.id}`} type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor={`dur-${widget.id}`} className="block text-xs font-bold text-surface-500 uppercase mb-1">Duration</label>
                <select id={`dur-${widget.id}`} value={duration} onChange={e => setDuration(e.target.value)} className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors">
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hour</option>
                </select>
              </div>
              <div>
                <label htmlFor={`att-${widget.id}`} className="block text-xs font-bold text-surface-500 uppercase mb-1">Attendees</label>
                <input id={`att-${widget.id}`} type="text" value={attendees} onChange={e => setAttendees(e.target.value)} className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors" />
              </div>
            </div>
            
            <Button className="w-full mt-2" onClick={() => setIsModalOpen(true)}>
              <CalendarPlus className="w-4 h-4 mr-2" />
              {widget.is_ai_suggested ? "Confirm & Create" : "Create Meeting"}
            </Button>

            {isModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-900/50 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-card animate-slide-up" role="dialog" aria-modal="true">
                  <h3 className="text-lg font-bold text-surface-900 mb-2">Confirm Meeting</h3>
                  <p className="text-surface-600 text-sm mb-6">Are you sure you want to schedule <strong>"{title}"</strong> for {date} at {time} with {attendees.split(',').length} attendees?</p>
                  <div className="flex gap-3 justify-end">
                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateMeeting} disabled={isSubmitting}>
                      {isSubmitting ? "Scheduling..." : "Confirm"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 'calendar':
      case 'patient_schedule':
        const events = widget.data.events || widget.data.patients || []
        if (!events.length) return renderEmptyState(<Clock />, "No upcoming events. Your schedule is clear.")
        return (
          <ul className="space-y-4">
            {events.map((ev: any, i: number) => (
              <li key={i} className="flex items-start gap-4">
                <div className="min-w-[100px] text-sm font-bold text-brand-600 mt-0.5">{ev.time}</div>
                <div className="flex-1 pb-4 border-b border-surface-100 last:border-0 last:pb-0">
                  <div className="font-bold text-surface-900 text-base">{ev.title || ev.name}</div>
                  <div className="text-sm text-surface-500 mt-0.5 font-medium">{ev.type}</div>
                  {ev.status && (
                    <span className={cn(
                      "inline-flex mt-2 text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border",
                      ev.status === 'Waiting' ? "bg-warning/10 text-warning-dark border-warning/20" 
                      : ev.status === 'Confirmed' ? "bg-success/10 text-success-dark border-success/20"
                      : "bg-surface-100 text-surface-600 border-surface-200"
                    )}>
                      {ev.status}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )

      case 'messages':
        const messages = widget.data.messages || []
        if (!messages.length) return renderEmptyState(<MessageSquare />, "Inbox zero! You're all caught up.")
        return (
          <div className="space-y-3">
            {messages.map((msg: any, i: number) => (
              <div key={i} className={cn("p-3.5 rounded-xl border transition-colors hover:shadow-sm", msg.unread ? "bg-brand-50/50 border-brand-200" : "bg-white border-surface-200")}>
                <div className="flex justify-between items-start mb-1.5">
                  <span className="font-bold text-sm text-surface-900 flex items-center gap-2">
                    {msg.unread && <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0" aria-label="Unread message"></span>}
                    {msg.sender}
                  </span>
                  <span className="text-xs text-surface-500 font-medium">{msg.time}</span>
                </div>
                <div className={cn("text-sm mb-1", msg.unread ? "font-bold text-surface-900" : "font-semibold text-surface-700")}>{msg.subject}</div>
                <div className="text-sm text-surface-500 truncate leading-relaxed">{msg.preview}</div>
              </div>
            ))}
          </div>
        )

      case 'tasks':
        const tasks = widget.data.tasks || []
        if (!tasks.length) return renderEmptyState(<CheckSquare />, "No pending tasks.")
        return (
          <div className="space-y-2.5">
            {tasks.map((task: any, i: number) => {
              const overdue = !task.completed && isOverdueTask(task.due_date)
              const status = task.completed ? 'Completed' : overdue ? 'Overdue' : 'Pending'
              return (
                <label key={i} className="flex items-start gap-3 p-3 bg-white border border-emerald-100 rounded-xl hover:border-emerald-200 transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-emerald-500/20">
                  <input type="checkbox" defaultChecked={task.completed} className="mt-0.5 w-5 h-5 rounded border-surface-300 accent-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-semibold truncate", task.completed ? "text-surface-400 line-through" : "text-surface-900")}>{task.title}</div>
                    <div className="flex flex-wrap gap-2 text-xs font-medium mt-1.5">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full border font-semibold",
                        task.completed ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : overdue ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      )}>{status}</span>
                      <span className="px-1.5 py-0.5 rounded bg-surface-50 text-surface-600 border border-surface-200">{task.due_date}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full border",
                        task.priority === "High" ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-surface-50 text-surface-600 border-surface-200"
                      )}>{task.priority} Priority</span>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        )

      case 'meeting_summary':
        const summary = widget.data.summary
        if (!summary) return renderEmptyState(<MessageSquare />, "No recent meetings.")
        return (
          <div className="flex flex-col space-y-5">
            {summary.title && <div className="text-lg font-bold text-surface-900">{summary.title}</div>}
            
            {summary.participants && (
              <div className="flex gap-1.5 flex-wrap">
                {summary.participants.map((p: string, i: number) => (
                  <span key={i} className="text-xs font-medium px-2.5 py-1 bg-surface-100 text-surface-700 border border-surface-200 rounded-full flex items-center gap-1.5">
                    <User className="w-3 h-3 text-surface-500" /> {p}
                  </span>
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.agenda && (
                <div className="text-sm bg-white p-3 rounded-xl border border-surface-200">
                  <span className="font-bold text-surface-900 block mb-2">Agenda Items</span>
                  <ul className="list-decimal pl-5 space-y-1 text-surface-700 font-medium">
                    {summary.agenda.map((a: string, i: number) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              
              {summary.questions && (
                <div className="text-sm bg-white p-3 rounded-xl border border-surface-200">
                  <span className="font-bold text-surface-900 block mb-2">Questions to Ask</span>
                  <ul className="list-disc pl-5 space-y-1 text-surface-700 font-medium">
                    {summary.questions.map((q: string, i: number) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {summary.decisions && (
              <div className="bg-brand-50/50 p-4 rounded-xl border border-brand-100 text-sm">
                <span className="font-bold text-brand-900 block mb-2 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-brand-500" />
                  Decisions Needed
                </span>
                <ul className="list-disc pl-5 text-brand-800 space-y-1 font-medium">
                  {summary.decisions.map((d: string, i: number) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}

            {summary.risks && (
              <div className="bg-danger/5 p-4 rounded-xl border border-danger/20 text-sm">
                <span className="font-bold text-danger block mb-2">Risks / Blockers</span>
                <ul className="list-disc pl-5 text-danger space-y-1 font-medium">
                  {summary.risks.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            
            {(summary.action_items || summary.follow_ups) && (
              <div className="text-sm">
                <span className="font-bold text-surface-900 block mb-2">Suggested Follow-ups</span>
                <ul className="space-y-2">
                  {(summary.action_items || summary.follow_ups).map((a: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 bg-white border border-surface-200 p-2.5 rounded-lg shadow-sm">
                      <CheckSquare className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                      <span className="text-surface-800 font-medium">{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )

      case 'meeting_notes':
        return (
          <div className="flex flex-col h-full">
            <label htmlFor={`notes-${widget.id}`} className="sr-only">Notes content</label>
            <textarea 
              id={`notes-${widget.id}`}
              className="flex-1 w-full min-h-[200px] bg-yellow-50/30 border border-yellow-200/50 rounded-xl p-4 text-sm text-surface-800 font-medium resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              defaultValue={widget.data.content}
              placeholder="Start typing notes..."
            />
          </div>
        )

      case 'sprint_board': {
        const sprint = widget.data.sprint
        const columns = sprint?.tickets ?? {}
        const ticketColumns = [
          { key: 'todo', label: 'To do' },
          { key: 'in_progress', label: 'In progress' },
          { key: 'review', label: 'Review' },
          { key: 'done', label: 'Done' },
        ]
        if (!sprint) return renderEmptyState(<BarChart3 />, "No active sprint data.")
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-surface-900">{sprint.name}</p>
                <p className="text-sm text-surface-500">{sprint.days_left} days remaining</p>
              </div>
              <span className="text-2xl font-bold text-cyan-800">{sprint.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500" style={{ width: `${sprint.progress}%` }} />
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
              {ticketColumns.map((column, index) => (
                <div key={column.key} className={cn(
                  "rounded-lg border p-2",
                  index === 0 ? "bg-amber-50/70 border-amber-200"
                    : index === 1 ? "bg-indigo-50/70 border-indigo-200"
                    : index === 2 ? "bg-violet-50/70 border-violet-200"
                    : "bg-emerald-50/70 border-emerald-200"
                )}>
                  <div className="flex justify-between text-xs font-bold text-surface-500 mb-2">
                    <span>{column.label}</span><span>{columns[column.key]?.length ?? 0}</span>
                  </div>
                  <div className="space-y-1.5">
                    {(columns[column.key] ?? []).slice(0, 2).map((ticket: any) => (
                      <div key={ticket.id} className="bg-white rounded-md border border-surface-200 p-2 text-xs">
                        <div className="font-semibold text-surface-800">{ticket.title}</div>
                        <div className="text-surface-400 mt-1">{ticket.id} · {ticket.points} pts</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }

      case 'incidents': {
        const incidents = widget.data.incidents ?? []
        if (!incidents.length) return renderEmptyState(<AlertTriangle />, "No active incidents.")
        return (
          <div className="space-y-3">
            {incidents.map((incident: any) => (
              <div key={incident.id} className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 p-3">
                <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-surface-900 truncate">{incident.title}</p>
                    <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                      At risk · {incident.severity}
                    </span>
                  </div>
                  <p className="text-sm text-surface-600 mt-1">{incident.status} · Started {incident.started}</p>
                </div>
              </div>
            ))}
          </div>
        )
      }

      case 'pull_requests': {
        const pullRequests = widget.data.prs ?? []
        if (!pullRequests.length) return renderEmptyState(<GitPullRequest />, "No pull requests waiting.")
        return (
          <div className="space-y-2.5">
            {pullRequests.map((pullRequest: any) => (
              <div key={pullRequest.id} className="flex items-center gap-3 rounded-xl border border-surface-200 p-3">
                <GitPullRequest className="w-5 h-5 text-brand-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-surface-900 truncate">{pullRequest.title}</p>
                  <p className="text-xs text-surface-500 mt-1">{pullRequest.id} · {pullRequest.author} · {pullRequest.comments} comments</p>
                </div>
                <span className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-bold",
                  pullRequest.status === 'approved'
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                )}>
                  {pullRequest.status === 'approved' ? 'Completed' : 'Pending review'}
                </span>
              </div>
            ))}
          </div>
        )
      }

      case 'lab_results': {
        const results = widget.data.results ?? []
        if (!results.length) return renderEmptyState(<CheckSquare />, "No lab results to review.")
        return (
          <div className="space-y-2.5">
            {results.map((result: any) => (
              <div key={result.id} className="rounded-xl border border-surface-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-surface-900 truncate">{result.test}</p>
                  <span className={cn("text-[11px] font-bold uppercase", result.status === 'Abnormal' ? "text-danger" : "text-success-dark")}>
                    {result.status}
                  </span>
                </div>
                <p className="text-sm text-surface-500 mt-1">{result.patient} · {result.flag}</p>
              </div>
            ))}
          </div>
        )
      }

      case 'market_watch': {
        const indices = widget.data.indices ?? []
        if (!indices.length) return renderEmptyState(<BarChart3 />, "No market data available.")
        return (
          <div className="grid grid-cols-2 gap-3">
            {indices.map((index: any) => {
              const isPositive = index.trend === 'up'
              return (
                <div key={index.symbol} className={cn(
                  "rounded-xl border p-3",
                  isPositive ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-surface-900">{index.symbol}</span>
                    {isPositive ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ArrowDownRight className="w-4 h-4 text-danger" />}
                  </div>
                  <p className="text-lg font-bold text-surface-900 mt-2">{index.price}</p>
                  <p className={cn(
                    "mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-bold",
                    isPositive ? "border-emerald-200 bg-white/80 text-emerald-800" : "border-rose-200 bg-white/80 text-rose-800"
                  )}>{index.change}</p>
                </div>
              )
            })}
          </div>
        )
      }

      case 'portfolio': {
        const portfolio = widget.data.portfolio
        if (!portfolio) return renderEmptyState(<DollarSign />, "No portfolio data available.")
        return (
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-surface-500">Total value</p>
                <p className="text-2xl font-bold text-surface-900 mt-1">{portfolio.total_value}</p>
              </div>
              <div className="text-right text-success-dark">
                <p className="font-bold">{portfolio.daily_change}</p>
                <p className="text-xs font-semibold">{portfolio.daily_change_pct} today</p>
              </div>
            </div>
            <div className="space-y-2">
              {(portfolio.holdings ?? []).map((holding: any) => (
                <div key={holding.asset} className="flex items-center gap-3 text-sm">
                  <span className="w-12 font-bold text-surface-800">{holding.asset}</span>
                  <div className="h-2 flex-1 rounded-full bg-surface-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500" style={{ width: holding.weight }} /></div>
                  <span className="w-12 text-right text-surface-500">{holding.weight}</span>
                  <span className={cn("w-12 text-right font-bold", holding.pnl.startsWith('-') ? "text-danger" : "text-success-dark")}>{holding.pnl}</span>
                </div>
              ))}
            </div>
          </div>
        )
      }

      case 'risk_alerts': {
        const alerts = widget.data.alerts ?? []
        if (!alerts.length) return renderEmptyState(<ShieldAlert />, "No active risk alerts.")
        return (
          <div className="space-y-3">
            {alerts.map((alert: any) => (
              <div key={`${alert.asset}-${alert.alert}`} className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/5 p-3">
                <ShieldAlert className="w-5 h-5 text-warning-dark shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-surface-900">{alert.asset}</p>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                      At risk · {alert.level}
                    </span>
                  </div>
                  <p className="text-sm text-surface-600 mt-1">{alert.alert}</p>
                </div>
              </div>
            ))}
          </div>
        )
      }

      case 'sheet_summary':
      case 'kpi_cards':
      case 'revenue_trend':
      case 'category_breakdown':
      case 'data_table':
      case 'anomaly_alerts':
      case 'goal_progress':
      case 'sheet_task_suggestions':
        return (
          <SheetDrivenWidget
            id={widget.id}
            type={widget.type}
            title={widget.title}
            data={widget.data}
            reason={widget.reason}
            theme={theme}
            onRemove={onRemoveSheetWidget}
          />
        )

      default:
        return (
          <div className="space-y-2 rounded-xl border border-surface-200 bg-surface-50 p-4">
            {Object.entries(widget.data).filter(([key]) => key !== 'demo_label').map(([key, value]) => (
              <div key={key} className="flex items-start justify-between gap-4 text-sm">
                <span className="font-semibold text-surface-600 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-right text-surface-800">{typeof value === 'string' || typeof value === 'number' ? String(value) : 'Available'}</span>
              </div>
            ))}
          </div>
        )
    }
  }

  const spanClass = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-2 lg:col-span-4'
  }[widget.span] || 'col-span-1'

  return (
    <Card className={cn(
      spanClass, 
      "flex flex-col transition-all duration-300 relative group animate-slide-up overflow-visible",
      "border-l-4 shadow-sm hover:shadow-md",
      presentation.border,
      presentation.background,
      isPinned ? "ring-2 ring-brand-500 ring-offset-2 border-brand-200 shadow-glow" : ""
    )}>
      {showReason && (
        <div className="absolute top-14 left-0 right-0 z-50 mx-4 p-3 bg-brand-900 text-brand-50 text-sm rounded-xl shadow-lg border border-brand-700 animate-fade-in">
          <p className="font-bold mb-0.5">Why this is here:</p>
          <p className="opacity-90">{widget.reason}</p>
        </div>
      )}
      
      <CardHeader className={cn("flex flex-row items-center justify-between py-3 pb-2 rounded-t-xl", presentation.header)}>
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            presentation.iconBackground,
            presentation.iconColor
          )}>
            {presentation.icon}
          </span>
          {widget.is_ai_suggested && (
            <div className="flex items-center gap-1 rounded-full border border-violet-200 bg-violet-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-800" title="AI insight">
              <Sparkles className="h-3 w-3" aria-hidden="true" /> AI insight
            </div>
          )}
          <CardTitle className="text-base truncate">{widget.title}</CardTitle>
          <button 
            onMouseEnter={() => setShowReason(true)}
            onMouseLeave={() => setShowReason(false)}
            className="text-surface-400 hover:text-brand-500 transition-colors shrink-0 p-1"
            aria-label="View reason"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        
        {/* Customization Toolbar */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-white border border-surface-200 rounded-lg p-0.5 shadow-sm">
          <button onClick={() => onMoveUp(widget.id)} className="p-1 rounded-md text-surface-400 hover:bg-surface-100 hover:text-surface-900 focus:ring-2 focus:ring-brand-500" aria-label="Move Up"><ChevronUp className="w-4 h-4" /></button>
          <button onClick={() => onMoveDown(widget.id)} className="p-1 rounded-md text-surface-400 hover:bg-surface-100 hover:text-surface-900 focus:ring-2 focus:ring-brand-500" aria-label="Move Down"><ChevronDown className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-surface-200 mx-0.5" />
          <button onClick={() => onResize(widget.id)} className="p-1 rounded-md text-surface-400 hover:bg-surface-100 hover:text-surface-900 focus:ring-2 focus:ring-brand-500" aria-label="Toggle Size">
            {widget.span >= 3 ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <div className="w-px h-4 bg-surface-200 mx-0.5" />
          <button onClick={() => onTogglePin(widget.id)} className={cn("p-1 rounded-md focus:ring-2 focus:ring-brand-500", isPinned ? "bg-brand-100 text-brand-600" : "text-surface-400 hover:bg-surface-100")} aria-label={isPinned ? "Unpin widget" : "Pin widget"}><Pin className="w-4 h-4" /></button>
          <button onClick={() => onHide(widget.id)} className="p-1 rounded-md text-surface-400 hover:bg-danger/10 hover:text-danger focus:ring-2 focus:ring-danger" aria-label="Hide widget"><EyeOff className="w-4 h-4" /></button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 py-4 flex flex-col min-h-[160px] overflow-hidden">
        {renderContent()}
      </CardContent>
      
      {widget.actions.length > 0 && (
        <div className="px-6 py-3 border-t border-surface-100 bg-surface-50 flex gap-2 items-center justify-end mt-auto rounded-b-xl">
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {widget.actions.map((action, i) => (
              <Button 
                key={i} 
                variant={i === 0 ? "outline" : "ghost"} 
                size="sm" 
                onClick={() => handleAction(action)}
                className="shrink-0"
              >
                {action}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function EmptyState({ icon, message, iconClassName }: { icon: React.ReactNode, message: string, iconClassName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[140px] text-surface-500 bg-surface-50/50 border border-dashed border-surface-200 rounded-xl px-4 text-center">
      <div className={cn("mb-3 rounded-2xl p-3 shadow-sm", iconClassName)}>{icon}</div>
      <span className="text-sm font-semibold">{message}</span>
    </div>
  )
}