import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Plus,
  X,
  Edit3,
  Trash2,
  AlertCircle,
  RefreshCw,
  CalendarDays,
} from 'lucide-react'
import { useToast } from '@/app/providers/ToastProvider'
import {
  apiService,
  CalendarEventFull,
  CalendarEventCreatePayload,
  CalendarEventUpdatePayload,
} from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Date helpers ──────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function daysInMonth(year: number, month: number): number {
  const counts = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return counts[month]!
}

/** First weekday of month (0 = Sun) */
function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

function formatDateHeading(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const ampm = h! >= 12 ? 'PM' : 'AM'
  const h12 = h! % 12 || 12
  return `${h12}:${pad(m!)} ${ampm}`
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h! * 60 + m!
}

/** Get the Monday of the week containing the given date (week starts Sunday) */
function getWeekStartSunday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d
}


// ── Types ─────────────────────────────────────────────────────

type ViewMode = 'day' | 'week' | 'month'

interface EventFormData {
  title: string
  description: string
  date: string
  start_time: string
  end_time: string
  location: string
  attendees: string
  calendar: 'work' | 'personal'
}

const emptyForm = (date: string): EventFormData => ({
  title: '',
  description: '',
  date,
  start_time: '09:00',
  end_time: '10:00',
  location: '',
  attendees: '',
  calendar: 'work',
})


// ── CalendarPage ──────────────────────────────────────────────

export function CalendarPage() {
  const { showToast } = useToast()
  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => toDateStr(today), [today])

  // Navigation state
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMode, setViewMode] = useState<ViewMode>('day')

  // Calendar filters
  const [showWork, setShowWork] = useState(true)
  const [showPersonal, setShowPersonal] = useState(true)

  // Event data
  const [events, setEvents] = useState<CalendarEventFull[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEventFull | null>(null)
  const [form, setForm] = useState<EventFormData>(emptyForm(todayStr))
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Detail panel
  const [detailEvent, setDetailEvent] = useState<CalendarEventFull | null>(null)

  // ── Fetch events ─────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await apiService.getCalendarEvents()
      setEvents(data)
    } catch {
      setLoadError('Failed to load events from the server.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // ── Filtered events ──────────────────────────────────────

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (e.calendar === 'work' && !showWork) return false
      if (e.calendar === 'personal' && !showPersonal) return false
      return true
    })
  }, [events, showWork, showPersonal])

  const eventsForDate = useCallback(
    (dateStr: string) => filteredEvents.filter(e => e.date === dateStr),
    [filteredEvents]
  )

  const selectedDateStr = useMemo(() => toDateStr(selectedDate), [selectedDate])
  const selectedDayEvents = useMemo(() => eventsForDate(selectedDateStr), [eventsForDate, selectedDateStr])

  // ── Navigation handlers ──────────────────────────────────

  const goToday = () => {
    setSelectedDate(today)
    setViewMonth(today.getMonth())
    setViewYear(today.getFullYear())
  }

  const goPrev = () => {
    if (viewMode === 'month') {
      if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
      else setViewMonth(m => m - 1)
    } else if (viewMode === 'week') {
      const d = new Date(selectedDate)
      d.setDate(d.getDate() - 7)
      setSelectedDate(d)
      setViewMonth(d.getMonth())
      setViewYear(d.getFullYear())
    } else {
      const d = new Date(selectedDate)
      d.setDate(d.getDate() - 1)
      setSelectedDate(d)
      setViewMonth(d.getMonth())
      setViewYear(d.getFullYear())
    }
  }

  const goNext = () => {
    if (viewMode === 'month') {
      if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
      else setViewMonth(m => m + 1)
    } else if (viewMode === 'week') {
      const d = new Date(selectedDate)
      d.setDate(d.getDate() + 7)
      setSelectedDate(d)
      setViewMonth(d.getMonth())
      setViewYear(d.getFullYear())
    } else {
      const d = new Date(selectedDate)
      d.setDate(d.getDate() + 1)
      setSelectedDate(d)
      setViewMonth(d.getMonth())
      setViewYear(d.getFullYear())
    }
  }

  const selectDate = (date: Date) => {
    setSelectedDate(date)
    setViewMonth(date.getMonth())
    setViewYear(date.getFullYear())
  }

  // ── Form validation ──────────────────────────────────────

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!form.title.trim()) errors.title = 'Title is required'
    if (!form.date) errors.date = 'Date is required'
    if (!form.start_time) errors.start_time = 'Start time is required'
    if (!form.end_time) errors.end_time = 'End time is required'
    if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      errors.end_time = 'End time must be after start time'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── CRUD handlers ────────────────────────────────────────

  const openCreateModal = () => {
    setEditingEvent(null)
    setForm(emptyForm(selectedDateStr))
    setFormErrors({})
    setShowModal(true)
  }

  const openEditModal = (event: CalendarEventFull) => {
    setEditingEvent(event)
    setForm({
      title: event.title,
      description: event.description,
      date: event.date,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      attendees: event.attendees.join(', '),
      calendar: event.calendar as 'work' | 'personal',
    })
    setFormErrors({})
    setDetailEvent(null)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!validateForm()) return
    setIsSaving(true)
    try {
      const attendeesList = form.attendees
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)

      if (editingEvent) {
        const payload: CalendarEventUpdatePayload = {
          title: form.title.trim(),
          description: form.description.trim(),
          date: form.date,
          start_time: form.start_time,
          end_time: form.end_time,
          location: form.location.trim(),
          attendees: attendeesList,
          calendar: form.calendar,
        }
        const updated = await apiService.updateCalendarEvent(editingEvent.id, payload)
        setEvents(prev => prev.map(e => (e.id === updated.id ? updated : e)))
        showToast('Event updated successfully')
      } else {
        const payload: CalendarEventCreatePayload = {
          title: form.title.trim(),
          description: form.description.trim(),
          date: form.date,
          start_time: form.start_time,
          end_time: form.end_time,
          location: form.location.trim(),
          attendees: attendeesList,
          calendar: form.calendar,
        }
        const created = await apiService.createCalendarEvent(payload)
        setEvents(prev => [...prev, created])
        showToast('Event created successfully')
      }
      setShowModal(false)
    } catch {
      showToast(editingEvent ? 'Failed to update event' : 'Failed to create event')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (event: CalendarEventFull) => {
    if (!window.confirm(`Delete "${event.title}"?`)) return
    try {
      await apiService.deleteCalendarEvent(event.id)
      setEvents(prev => prev.filter(e => e.id !== event.id))
      setDetailEvent(null)
      showToast('Event deleted')
    } catch {
      showToast('Failed to delete event')
    }
  }

  // ── Mini calendar data ───────────────────────────────────

  const miniCalDays = useMemo(() => {
    const totalDays = daysInMonth(viewYear, viewMonth)
    const firstDay = firstDayOfMonth(viewYear, viewMonth)
    const cells: { day: number; dateStr: string; isCurrentMonth: boolean; isToday: boolean; hasEvents: boolean }[] = []

    // Previous month trailing days
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
    const prevDays = daysInMonth(prevYear, prevMonth)
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevDays - i
      const ds = `${prevYear}-${pad(prevMonth + 1)}-${pad(d)}`
      cells.push({
        day: d,
        dateStr: ds,
        isCurrentMonth: false,
        isToday: ds === todayStr,
        hasEvents: filteredEvents.some(e => e.date === ds),
      })
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const ds = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`
      cells.push({
        day: d,
        dateStr: ds,
        isCurrentMonth: true,
        isToday: ds === todayStr,
        hasEvents: filteredEvents.some(e => e.date === ds),
      })
    }

    // Next month leading days
    const remaining = 42 - cells.length
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear
    for (let d = 1; d <= remaining; d++) {
      const ds = `${nextYear}-${pad(nextMonth + 1)}-${pad(d)}`
      cells.push({
        day: d,
        dateStr: ds,
        isCurrentMonth: false,
        isToday: ds === todayStr,
        hasEvents: filteredEvents.some(e => e.date === ds),
      })
    }

    return cells
  }, [viewYear, viewMonth, todayStr, filteredEvents])

  // ── Mini calendar nav ────────────────────────────────────

  const miniPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  const miniNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // ── Header text ──────────────────────────────────────────

  const headerText = useMemo(() => {
    if (viewMode === 'month') return `${MONTHS[viewMonth]} ${viewYear}`
    if (viewMode === 'week') {
      const start = getWeekStartSunday(selectedDate)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      const sameMonth = start.getMonth() === end.getMonth()
      if (sameMonth) {
        return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`
      }
      return `${MONTHS[start.getMonth()]!.slice(0, 3)} ${start.getDate()} – ${MONTHS[end.getMonth()]!.slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`
    }
    return `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
  }, [viewMode, viewMonth, viewYear, selectedDate])

  // ── Week view data ───────────────────────────────────────

  const weekDays = useMemo(() => {
    const start = getWeekStartSunday(selectedDate)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [selectedDate])

  // ── Render helpers ───────────────────────────────────────

  const eventColor = (cal: string) =>
    cal === 'personal'
      ? { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' }
      : { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200', dot: 'bg-brand-500' }

  const syncStatusInfo = (status: string) => {
    switch (status) {
      case 'synced': return { label: 'Synced', color: 'bg-success/10 text-success', dot: 'bg-success' }
      case 'demo': return { label: 'Demo', color: 'bg-warning/10 text-warning-dark', dot: 'bg-warning' }
      case 'pending': return { label: 'Pending', color: 'bg-brand-50 text-brand-600', dot: 'bg-brand-400' }
      case 'failed': return { label: 'Failed', color: 'bg-danger/10 text-danger', dot: 'bg-danger' }
      default: return { label: 'Local', color: 'bg-surface-100 text-surface-500', dot: 'bg-surface-400' }
    }
  }


  // ── HOUR GRID (shared by day/week) ───────────────────────

  const HOUR_START = 7
  const HOUR_END = 21
  const HOUR_COUNT = HOUR_END - HOUR_START
  const HOUR_HEIGHT = 72 // px per hour

  const renderTimelineEvents = (dateStr: string, showMultiCol = false) => {
    const dayEvents = eventsForDate(dateStr).sort((a, b) => a.start_time.localeCompare(b.start_time))
    if (dayEvents.length === 0) return null

    return dayEvents.map(event => {
      const startMin = timeToMinutes(event.start_time)
      const endMin = timeToMinutes(event.end_time)
      const top = ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT
      const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 24)
      const colors = eventColor(event.calendar)

      return (
        <button
          key={event.id}
          onClick={(e) => { e.stopPropagation(); setDetailEvent(event) }}
          className={cn(
            'absolute rounded-lg border shadow-sm p-2 cursor-pointer text-left transition-all hover:shadow-md hover:scale-[1.01] group overflow-hidden',
            colors.bg, colors.text, colors.border,
            showMultiCol ? 'left-1 right-1' : 'left-0 right-2',
          )}
          style={{ top: `${top}px`, height: `${height}px` }}
        >
          <h4 className="font-bold text-xs leading-tight truncate">{event.title}</h4>
          {height > 36 && (
            <p className="text-[10px] mt-0.5 flex items-center gap-1 opacity-80">
              <Clock className="w-2.5 h-2.5" />
              {formatTime12(event.start_time)} – {formatTime12(event.end_time)}
            </p>
          )}
          {height > 56 && event.location && (
            <p className="text-[10px] mt-0.5 flex items-center gap-1 opacity-70 truncate">
              <MapPin className="w-2.5 h-2.5" />{event.location}
            </p>
          )}
          {height > 56 && event.attendees.length > 0 && (
            <p className="text-[10px] mt-0.5 flex items-center gap-1 opacity-70">
              <Users className="w-2.5 h-2.5" />{event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
            </p>
          )}
        </button>
      )
    })
  }

  const renderHourGrid = (dateStr: string, showMultiCol = false) => (
    <div className="relative" style={{ height: `${HOUR_COUNT * HOUR_HEIGHT}px` }}>
      {/* Hour lines */}
      {Array.from({ length: HOUR_COUNT }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-surface-100"
          style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
        />
      ))}
      {/* Now indicator */}
      {dateStr === todayStr && (() => {
        const now = new Date()
        const mins = now.getHours() * 60 + now.getMinutes()
        const top = ((mins - HOUR_START * 60) / 60) * HOUR_HEIGHT
        if (top < 0 || top > HOUR_COUNT * HOUR_HEIGHT) return null
        return (
          <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${top}px` }}>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-danger shrink-0" />
              <div className="flex-1 h-[2px] bg-danger" />
            </div>
          </div>
        )
      })()}
      {/* Events */}
      {renderTimelineEvents(dateStr, showMultiCol)}
    </div>
  )

  // ── DAY VIEW ─────────────────────────────────────────────

  const renderDayView = () => (
    <div className="flex-1 bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-surface-200 bg-surface-50 flex items-center justify-between">
        <h2 className="text-lg font-bold text-surface-900">{formatDateHeading(selectedDate)}</h2>
        {selectedDateStr === todayStr && (
          <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Today</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          {/* Time gutter */}
          <div className="w-16 shrink-0 border-r border-surface-100 bg-surface-50/50">
            {Array.from({ length: HOUR_COUNT }).map((_, i) => {
              const hour = HOUR_START + i
              return (
                <div key={i} className="flex justify-center pt-1 text-[11px] font-medium text-surface-400" style={{ height: `${HOUR_HEIGHT}px` }}>
                  {hour === 0 ? '12 AM' : hour <= 12 ? `${hour} ${hour < 12 ? 'AM' : 'PM'}` : `${hour - 12} PM`}
                </div>
              )
            })}
          </div>
          {/* Event area */}
          <div className="flex-1 relative px-2">
            {renderHourGrid(selectedDateStr)}
            {selectedDayEvents.length === 0 && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <CalendarDays className="w-10 h-10 text-surface-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-surface-400">No events scheduled</p>
                  <button onClick={openCreateModal} className="text-xs text-brand-600 hover:text-brand-700 font-semibold mt-1">
                    + Add an event
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // ── WEEK VIEW ────────────────────────────────────────────

  const renderWeekView = () => (
    <div className="flex-1 bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-surface-200 bg-surface-50">
        <div className="border-r border-surface-100" />
        {weekDays.map((d, i) => {
          const ds = toDateStr(d)
          const isSelDate = ds === selectedDateStr
          const isTod = ds === todayStr
          return (
            <button
              key={i}
              onClick={() => { selectDate(d); setViewMode('day') }}
              className={cn(
                'py-3 text-center border-r border-surface-100 last:border-r-0 hover:bg-surface-100 transition-colors',
                isSelDate && 'bg-brand-50',
              )}
            >
              <div className="text-[10px] font-bold uppercase text-surface-400">{DAYS[d.getDay()]}</div>
              <div className={cn(
                'text-sm font-bold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full',
                isTod ? 'bg-brand-500 text-white' : isSelDate ? 'text-brand-700' : 'text-surface-700',
              )}>
                {d.getDate()}
              </div>
            </button>
          )
        })}
      </div>
      {/* Scrollable timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[56px_repeat(7,1fr)]">
          {/* Time gutter */}
          <div className="border-r border-surface-100 bg-surface-50/50">
            {Array.from({ length: HOUR_COUNT }).map((_, i) => {
              const hour = HOUR_START + i
              return (
                <div key={i} className="flex justify-center pt-1 text-[10px] font-medium text-surface-400" style={{ height: `${HOUR_HEIGHT}px` }}>
                  {hour <= 12 ? `${hour || 12} ${hour < 12 ? 'AM' : 'PM'}` : `${hour - 12} PM`}
                </div>
              )
            })}
          </div>
          {/* Day columns */}
          {weekDays.map((d, i) => {
            const ds = toDateStr(d)
            return (
              <div key={i} className={cn('relative border-r border-surface-100 last:border-r-0', ds === selectedDateStr && 'bg-brand-50/30')}>
                {renderHourGrid(ds, true)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // ── MONTH VIEW ───────────────────────────────────────────

  const monthGridDays = useMemo(() => {
    const totalDays = daysInMonth(viewYear, viewMonth)
    const firstDay = firstDayOfMonth(viewYear, viewMonth)
    const cells: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = []

    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
    const prevDays = daysInMonth(prevYear, prevMonth)
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(prevYear, prevMonth, prevDays - i)
      cells.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: false, isToday: toDateStr(d) === todayStr })
    }
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(viewYear, viewMonth, d)
      cells.push({ date, dateStr: toDateStr(date), isCurrentMonth: true, isToday: toDateStr(date) === todayStr })
    }
    const remaining = 42 - cells.length
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(nextYear, nextMonth, d)
      cells.push({ date, dateStr: toDateStr(date), isCurrentMonth: false, isToday: toDateStr(date) === todayStr })
    }
    return cells
  }, [viewYear, viewMonth, todayStr])

  const renderMonthView = () => (
    <div className="flex-1 bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden flex flex-col">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-surface-200 bg-surface-50">
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-bold text-surface-400 uppercase">{d}</div>
        ))}
      </div>
      {/* Date grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {monthGridDays.map((cell, i) => {
          const dayEvents = eventsForDate(cell.dateStr)
          const isSelected = cell.dateStr === selectedDateStr
          return (
            <button
              key={i}
              onClick={() => { selectDate(cell.date); setViewMode('day') }}
              className={cn(
                'border-r border-b border-surface-100 p-1.5 text-left hover:bg-surface-50 transition-colors min-h-[80px] flex flex-col',
                !cell.isCurrentMonth && 'opacity-40',
                isSelected && 'ring-2 ring-inset ring-brand-500/40 bg-brand-50/50',
              )}
            >
              <span className={cn(
                'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 shrink-0',
                cell.isToday ? 'bg-brand-500 text-white' : 'text-surface-600',
              )}>
                {cell.date.getDate()}
              </span>
              <div className="flex-1 space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map(ev => {
                  const colors = eventColor(ev.calendar)
                  return (
                    <div key={ev.id} className={cn('text-[10px] font-semibold px-1 py-0.5 rounded truncate', colors.bg, colors.text)}>
                      {ev.title}
                    </div>
                  )
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] font-bold text-surface-400 px-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )


  // ── EVENT DETAIL PANEL ───────────────────────────────────

  const renderDetailPanel = () => {
    if (!detailEvent) return null
    const colors = eventColor(detailEvent.calendar)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => setDetailEvent(null)}>
        <div className="bg-white rounded-2xl shadow-card border border-surface-200 w-full max-w-md mx-4 animate-slide-up" onClick={e => e.stopPropagation()}>
          <div className={cn('p-5 rounded-t-2xl border-b', colors.bg, colors.border)}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', colors.bg, colors.text)}>
                    <span className={cn('w-2 h-2 rounded-full', colors.dot)} />
                    {detailEvent.calendar}
                  </span>
                  {(() => {
                    const si = syncStatusInfo(detailEvent.sync_status)
                    return (
                      <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', si.color)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', si.dot)} />
                        {si.label}
                      </span>
                    )
                  })()}
                </div>
                <h3 className={cn('text-lg font-bold', colors.text)}>{detailEvent.title}</h3>
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button onClick={() => openEditModal(detailEvent)} className="p-1.5 rounded-lg hover:bg-white/60 text-surface-500 hover:text-brand-600 transition-colors" title="Edit">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(detailEvent)} className="p-1.5 rounded-lg hover:bg-white/60 text-surface-500 hover:text-danger transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setDetailEvent(null)} className="p-1.5 rounded-lg hover:bg-white/60 text-surface-500 transition-colors" title="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-3 text-sm text-surface-700">
              <CalendarIcon className="w-4 h-4 text-surface-400 shrink-0" />
              <span className="font-medium">{formatDateHeading(parseDateStr(detailEvent.date))}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-surface-700">
              <Clock className="w-4 h-4 text-surface-400 shrink-0" />
              <span className="font-medium">{formatTime12(detailEvent.start_time)} – {formatTime12(detailEvent.end_time)}</span>
            </div>
            {detailEvent.location && (
              <div className="flex items-center gap-3 text-sm text-surface-700">
                <MapPin className="w-4 h-4 text-surface-400 shrink-0" />
                <span className="font-medium">{detailEvent.location}</span>
              </div>
            )}
            {detailEvent.attendees.length > 0 && (
              <div className="flex items-start gap-3 text-sm text-surface-700">
                <Users className="w-4 h-4 text-surface-400 shrink-0 mt-0.5" />
                <span className="font-medium">{detailEvent.attendees.join(', ')}</span>
              </div>
            )}
            {detailEvent.description && (
              <div className="pt-2 border-t border-surface-100">
                <p className="text-sm text-surface-600 whitespace-pre-wrap">{detailEvent.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── EVENT MODAL ──────────────────────────────────────────

  const renderModal = () => {
    if (!showModal) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => setShowModal(false)}>
        <div className="bg-white rounded-2xl shadow-card border border-surface-200 w-full max-w-lg mx-4 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-5 border-b border-surface-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-surface-900">{editingEvent ? 'Edit Event' : 'New Event'}</h3>
            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1">Title <span className="text-danger">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className={cn('input', formErrors.title && 'border-danger focus:ring-danger/20 focus:border-danger')}
                placeholder="Meeting title"
                autoFocus
              />
              {formErrors.title && <p className="text-xs text-danger mt-1">{formErrors.title}</p>}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1">Date <span className="text-danger">*</span></label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className={cn('input', formErrors.date && 'border-danger focus:ring-danger/20 focus:border-danger')}
              />
              {formErrors.date && <p className="text-xs text-danger mt-1">{formErrors.date}</p>}
            </div>

            {/* Time row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1">Start Time <span className="text-danger">*</span></label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  className={cn('input', formErrors.start_time && 'border-danger focus:ring-danger/20 focus:border-danger')}
                />
                {formErrors.start_time && <p className="text-xs text-danger mt-1">{formErrors.start_time}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1">End Time <span className="text-danger">*</span></label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  className={cn('input', formErrors.end_time && 'border-danger focus:ring-danger/20 focus:border-danger')}
                />
                {formErrors.end_time && <p className="text-xs text-danger mt-1">{formErrors.end_time}</p>}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input min-h-[70px] resize-none"
                placeholder="Add details..."
                rows={2}
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="input"
                placeholder="Conference Room A"
              />
            </div>

            {/* Attendees */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1">Attendees</label>
              <input
                type="text"
                value={form.attendees}
                onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))}
                className="input"
                placeholder="Comma-separated names"
              />
              <p className="text-xs text-surface-400 mt-1">Separate with commas</p>
            </div>

            {/* Calendar */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1">Calendar</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, calendar: 'work' }))}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-xl text-sm font-semibold border-2 transition-all',
                    form.calendar === 'work'
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-surface-200 text-surface-500 hover:border-surface-300',
                  )}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-brand-500 mr-2" />
                  Work
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, calendar: 'personal' }))}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-xl text-sm font-semibold border-2 transition-all',
                    form.calendar === 'personal'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-surface-200 text-surface-500 hover:border-surface-300',
                  )}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2" />
                  Personal
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-5 border-t border-surface-200 flex justify-end gap-3">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-semibold text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary py-2 px-5 text-sm disabled:opacity-50"
            >
              {isSaving ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
              ) : editingEvent ? (
                'Update Event'
              ) : (
                'Create Event'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }


  // ── LOADING / ERROR states ───────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col h-full mt-6 max-w-6xl mx-auto animate-slide-up">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-surface-700">Loading calendar...</p>
            <p className="text-xs text-surface-400 mt-1">Connecting to the server</p>
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col h-full mt-6 max-w-6xl mx-auto animate-slide-up">
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-sm">
            <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
            <p className="text-sm font-semibold text-surface-900 mb-1">Could not load calendar</p>
            <p className="text-xs text-surface-500 mb-4">{loadError}</p>
            <button onClick={fetchEvents} className="btn-primary py-2 px-5 text-sm">
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </button>
          </div>
        </div>
      </div>
    )
  }


  // ── MAIN RENDER ──────────────────────────────────────────

  return (
    <div className="flex flex-col h-full mt-6 max-w-6xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-surface-900">{headerText}</h2>
          <div className="flex items-center gap-1 bg-white border border-surface-200 rounded-lg p-1">
            <button onClick={goPrev} className="p-1 hover:bg-surface-100 rounded-md transition-colors">
              <ChevronLeft className="w-5 h-5 text-surface-600" />
            </button>
            <button onClick={goToday} className="px-3 py-1 text-sm font-semibold text-surface-700 hover:bg-surface-100 rounded-md transition-colors">
              Today
            </button>
            <button onClick={goNext} className="p-1 hover:bg-surface-100 rounded-md transition-colors">
              <ChevronRight className="w-5 h-5 text-surface-600" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-surface-200 rounded-lg p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1 text-sm font-semibold rounded-md transition-colors capitalize',
                  viewMode === mode
                    ? 'bg-brand-500 text-white'
                    : 'text-surface-600 hover:bg-surface-100',
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <button onClick={openCreateModal} className="btn-primary py-1.5 px-4 text-sm gap-2">
            <Plus className="w-4 h-4" /> New Event
          </button>
        </div>
      </div>

      <div className="flex gap-6 min-h-[600px] pb-4">
        {/* Sidebar: Mini Calendar & Filters */}
        <div className="w-64 shrink-0 flex flex-col gap-6">
          {/* Mini Calendar */}
          <div className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-surface-900 text-sm">{MONTHS[viewMonth]} {viewYear}</h3>
              <div className="flex gap-0.5">
                <button onClick={miniPrev} className="p-0.5 hover:bg-surface-100 rounded transition-colors">
                  <ChevronLeft className="w-4 h-4 text-surface-500" />
                </button>
                <button onClick={miniNext} className="p-0.5 hover:bg-surface-100 rounded transition-colors">
                  <ChevronRight className="w-4 h-4 text-surface-500" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-surface-400 mb-2">
              <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-sm">
              {miniCalDays.map((cell, i) => {
                const isSelected = cell.dateStr === selectedDateStr
                return (
                  <button
                    key={i}
                    onClick={() => selectDate(parseDateStr(cell.dateStr))}
                    className={cn(
                      'p-1 rounded-full font-medium transition-colors relative',
                      !cell.isCurrentMonth && 'opacity-30',
                      isSelected
                        ? 'bg-brand-500 text-white hover:bg-brand-600'
                        : cell.isToday
                          ? 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                          : 'text-surface-700 hover:bg-surface-100',
                    )}
                  >
                    {cell.day}
                    {cell.hasEvents && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Calendar Filters */}
          <div className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm">
            <h3 className="font-bold text-surface-900 mb-3 text-sm">My Calendars</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showWork}
                  onChange={e => setShowWork(e.target.checked)}
                  className="rounded text-brand-500 focus:ring-brand-500 border-surface-300"
                />
                <span className="w-2 h-2 rounded-full bg-brand-500" />
                <span className="text-sm font-medium text-surface-700 group-hover:text-surface-900 transition-colors">Work</span>
                <span className="ml-auto text-xs text-surface-400">{events.filter(e => e.calendar === 'work').length}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showPersonal}
                  onChange={e => setShowPersonal(e.target.checked)}
                  className="rounded text-purple-500 focus:ring-purple-500 border-surface-300"
                />
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-sm font-medium text-surface-700 group-hover:text-surface-900 transition-colors">Personal</span>
                <span className="ml-auto text-xs text-surface-400">{events.filter(e => e.calendar === 'personal').length}</span>
              </label>
            </div>
          </div>

          {/* Events for selected date */}
          <div className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm flex-1 overflow-y-auto">
            <h3 className="font-bold text-surface-900 mb-3 text-sm">
              {formatDateHeading(selectedDate)}
            </h3>
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-4">
                <CalendarDays className="w-8 h-8 text-surface-200 mx-auto mb-2" />
                <p className="text-xs text-surface-400 font-medium">No events</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map(ev => {
                    const colors = eventColor(ev.calendar)
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setDetailEvent(ev)}
                        className={cn(
                          'w-full text-left p-2.5 rounded-xl border transition-all hover:shadow-sm',
                          colors.bg, colors.border, colors.text,
                        )}
                      >
                        <h4 className="font-bold text-xs truncate">{ev.title}</h4>
                        <p className="text-[10px] mt-0.5 opacity-80 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTime12(ev.start_time)} – {formatTime12(ev.end_time)}
                        </p>
                        {ev.location && (
                          <p className="text-[10px] mt-0.5 opacity-70 flex items-center gap-1 truncate">
                            <MapPin className="w-2.5 h-2.5" />{ev.location}
                          </p>
                        )}
                      </button>
                    )
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Main View */}
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </div>

      {/* Modals */}
      {renderModal()}
      {renderDetailPanel()}
    </div>
  )
}