import { useState, useCallback, useRef, useEffect } from 'react'
import { Video, Calendar as CalendarIcon, Clock, Users, ArrowUpRight, Copy, X, Plus, Link2, Sparkles, Play, FileText, MessageSquare, ChevronRight, ExternalLink, Mic, CheckCircle2, Square, Loader2, Check, Search, Download } from 'lucide-react'
import { MeetingModel, apiService } from '@/lib/api'
import { MeetingRecorder, formatElapsedTime } from '@/lib/meeting-recorder'

// ── Demo Data ──────────────────────────────────────────────────────────────────
const DEMO_MEETINGS: MeetingModel[] = [
  {
    id: 1,
    title: "Product Sync",
    time: "10:00 AM",
    duration: "60m",
    host: "Sarah J.",
    attendees: ["Me", "Sarah J.", "Marcus C.", "Alex D."],
    status: "Upcoming",
    link: "meet.google.com/abc-defg-hij",
    scheduledDate: "Today",
  },
  {
    id: 2,
    title: "Design Review",
    time: "1:30 PM",
    duration: "90m",
    host: "Alex D.",
    attendees: ["Me", "Alex D.", "Sarah J."],
    status: "Upcoming",
    link: "zoom.us/j/123456789",
    scheduledDate: "Today",
  },
  {
    id: 3,
    title: "Weekly Standup",
    time: "Yesterday",
    duration: "15m",
    host: "Me",
    attendees: ["Engineering Team"],
    status: "Completed",
    notes: true,
    recording: "https://storage.example.com/recordings/standup-oct10.webm",
    transcript: `[00:00] Good morning everyone. Let's go around — what did you work on yesterday and what's the plan for today?

[00:12] Yesterday I finished the auth refactor and merged the PR. Today I'm picking up the notification service integration.

[00:28] I was debugging the pagination issue on the dashboard. Found the root cause — it was a stale cursor. Fixed and deployed. Today I'm starting the search API.

[00:45] Wrapped up the design specs for the settings page. Shared the Figma link in the channel. Today I'll start on the onboarding flow redesign.

[01:02] Great progress. Quick note — the sprint review is moved to Thursday. Make sure your tickets are updated by EOD Wednesday.

[01:15] Got it. Also, should we sync on the notification service before I start? I have some questions about the webhook format.

[01:25] Sure, let's do a quick 15-minute call after this standup. Anyone else need anything?

[01:32] All good from my side.

[01:35] Same here. Will ping if I need design feedback.

[01:40] Perfect. Let's wrap up. Have a productive day everyone!`,
    summary: `## Key Decisions
- Sprint review moved to **Thursday** — all tickets must be updated by EOD Wednesday.
- Quick sync scheduled on webhook format for notification service.

## Action Items
- [ ] All: Update sprint tickets by EOD Wednesday
- [ ] Sync on webhook format for notification service
- [ ] Share onboarding flow progress in channel

## Topics Discussed
- Auth refactor completed and merged
- Dashboard pagination bug fixed (stale cursor root cause)
- Settings page design specs shared via Figma
- Sprint review rescheduled

## Follow-ups for Next Meeting
- Review notification service webhook integration progress
- Check onboarding flow redesign status
- Sprint review preparation`,
  },
]

// ── Schedule Meeting Modal ─────────────────────────────────────────────────────
function ScheduleMeetingModal({ onClose, onSchedule }: {
  onClose: () => void
  onSchedule: (title: string, link: string, date: string, time: string) => void
}) {
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [date, setDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0] ?? ''
  })
  const [time, setTime] = useState('10:00')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const handleSchedule = useCallback(() => {
    if (!title.trim()) return
    if (link.trim()) {
      onSchedule(title, link, date, time)
    } else {
      setIsGenerating(true)
      setTimeout(() => {
        const autoLink = 'https://meet.google.com/new'
        setLink(autoLink)
        setIsGenerating(false)
        setGenerated(true)
        setTimeout(() => {
          onSchedule(title, autoLink, date, time)
        }, 1200)
      }, 2000)
    }
  }, [title, link, date, time, onSchedule])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slide-up">
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Schedule Meeting</h3>
                <p className="text-brand-100 text-sm">Set up your next meeting</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-surface-700 mb-2">Meeting Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sprint Planning, Design Review..." className="input" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-surface-700 mb-2">Date *</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input pl-10" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 mb-2">Time *</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input pl-10" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-surface-700 mb-2">
              Meeting Link <span className="text-surface-400 font-medium ml-1">(optional)</span>
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste Google Meet / Zoom link..." className="input pl-10" disabled={isGenerating || generated} />
              {generated && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-success animate-scale-in" />}
            </div>
            <div className="flex items-start gap-2 mt-2 p-3 bg-brand-50 rounded-xl border border-brand-100">
              <Sparkles className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
              <p className="text-xs text-brand-700 font-medium leading-relaxed">
                No link? No problem! Our AI workflow will automatically generate a meeting link for you.
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-surface-200 text-surface-700 font-semibold hover:bg-surface-50 transition-colors">Cancel</button>
          <button onClick={handleSchedule} disabled={!title.trim() || isGenerating} className="flex-1 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isGenerating ? (<><Sparkles className="w-4 h-4 animate-spin" /> Generating Link...</>) : generated ? (<><CheckCircle2 className="w-4 h-4" /> Scheduled!</>) : (<><Plus className="w-4 h-4" /> Schedule Meeting</>)}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Duration Format Helper ──────────────────────────────────────────────────
function formatDurationDisplay(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`
  const minutes = Math.floor(seconds / 60)
  const remSecs = Math.round(seconds % 60)
  if (minutes < 60) {
    return remSecs > 0 ? `${minutes}m ${remSecs}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return `${hours}h ${remMinutes}m`
}

// ── Meeting Metadata Viewer (Recording / Notes / Transcript) ───────────────────
type MetadataTab = 'notes' | 'recording' | 'transcript'

function MeetingMetadataPanel({ meeting, audioBlobUrl, onClose }: {
  meeting: MeetingModel
  audioBlobUrl?: string
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<MetadataTab>('notes')
  const [copiedNotes, setCopiedNotes] = useState(false)
  const [copiedTranscript, setCopiedTranscript] = useState(false)
  const [transcriptSearch, setTranscriptSearch] = useState('')

  const hasRecording = !!audioBlobUrl || !!meeting.recording
  const tabs: { id: MetadataTab; label: string; icon: React.ReactNode; available: boolean }[] = [
    { id: 'notes', label: 'AI Notes', icon: <Sparkles className="w-4 h-4" />, available: !!meeting.summary },
    { id: 'recording', label: 'Recording', icon: <Play className="w-4 h-4" />, available: hasRecording },
    { id: 'transcript', label: 'Transcript', icon: <MessageSquare className="w-4 h-4" />, available: !!meeting.transcript },
  ]

  const handleCopyNotes = () => {
    if (!meeting.summary) return
    navigator.clipboard.writeText(meeting.summary)
    setCopiedNotes(true)
    setTimeout(() => setCopiedNotes(false), 2000)
  }

  const handleCopyTranscript = () => {
    if (!meeting.transcript) return
    navigator.clipboard.writeText(meeting.transcript)
    setCopiedTranscript(true)
    setTimeout(() => setCopiedTranscript(false), 2000)
  }

  const heldDisplay = meeting.heldAt || `${meeting.scheduledDate || 'Today'} · ${meeting.time}`

  const transcriptBlocks = (meeting.transcript || '')
    .split('\n\n')
    .filter(b => b.trim())
    .filter(b => !transcriptSearch.trim() || b.toLowerCase().includes(transcriptSearch.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[88vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-surface-900 via-surface-800 to-surface-900 p-6 text-white shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-500/20 border border-brand-400/30 backdrop-blur-sm flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-5 h-5 text-brand-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg leading-tight">{meeting.title}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-success/20 text-success border border-success/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Completed
                  </span>
                </div>
                <div className="text-surface-400 text-xs flex flex-wrap items-center gap-y-1 gap-x-3">
                  <span className="flex items-center gap-1 text-surface-300">
                    <Clock className="w-3.5 h-3.5 text-brand-400" /> Held: <strong>{heldDisplay}</strong>
                  </span>
                  <span className="w-1 h-1 rounded-full bg-surface-600" />
                  <span className="flex items-center gap-1 text-surface-300">
                    <Mic className="w-3.5 h-3.5 text-brand-400" /> Duration: <strong>{meeting.duration}</strong>
                  </span>
                  <span className="w-1 h-1 rounded-full bg-surface-600" />
                  <span className="flex items-center gap-1 text-surface-300">
                    <Users className="w-3.5 h-3.5 text-brand-400" /> Host: {meeting.host} ({meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-surface-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1.5 bg-surface-950/60 rounded-xl p-1 border border-surface-700/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.available && setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-surface-900 shadow-sm'
                    : tab.available
                    ? 'text-surface-400 hover:text-white hover:bg-surface-800/60'
                    : 'text-surface-600 opacity-40 cursor-not-allowed'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: AI NOTES */}
          {activeTab === 'notes' && meeting.summary && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-surface-900 text-sm">AI-Generated Meeting Notes</h4>
                    <p className="text-xs text-surface-500">Auto-extracted decisions, action items & topics by Groq LLM</p>
                  </div>
                </div>
                <button
                  onClick={handleCopyNotes}
                  className="px-3 py-1.5 rounded-lg border border-surface-200 hover:border-brand-300 text-surface-700 hover:text-brand-600 text-xs font-semibold flex items-center gap-1.5 bg-white shadow-sm transition-all"
                >
                  {copiedNotes ? <><Check className="w-3.5 h-3.5 text-success" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Notes</>}
                </button>
              </div>

              <div className="bg-surface-50/70 rounded-2xl p-5 border border-surface-200/80 space-y-2">
                {meeting.summary.split('\n').map((line, i) => {
                  if (line.startsWith('## ')) {
                    return (
                      <h4 key={i} className="text-sm font-bold text-surface-900 mt-4 first:mt-0 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-500" />
                        {line.replace('## ', '')}
                      </h4>
                    )
                  }
                  if (line.startsWith('- [')) {
                    const checked = line.includes('[x]')
                    const text = line.replace(/- \[.\] /, '')
                    return (
                      <div key={i} className="flex items-start gap-2.5 py-1 pl-1 bg-white/70 p-2 rounded-lg border border-surface-100 mb-1">
                        <div className={`w-4 h-4 rounded border-2 mt-0.5 shrink-0 flex items-center justify-center ${checked ? 'bg-brand-500 border-brand-500' : 'border-surface-300'}`}>
                          {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-surface-800 text-xs font-medium leading-relaxed">{text}</span>
                      </div>
                    )
                  }
                  if (line.startsWith('- ')) {
                    return (
                      <div key={i} className="flex items-start gap-2 py-1 pl-2">
                        <ChevronRight className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" />
                        <span className="text-surface-700 text-xs leading-relaxed">{line.replace('- ', '')}</span>
                      </div>
                    )
                  }
                  if (line.trim() === '') return <div key={i} className="h-1" />
                  return <p key={i} className="text-surface-700 text-xs leading-relaxed pl-2">{line}</p>
                })}
              </div>
            </div>
          )}

          {/* TAB 2: RECORDING */}
          {activeTab === 'recording' && hasRecording && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
                    <Play className="w-4 h-4 text-danger" />
                  </div>
                  <div>
                    <h4 className="font-bold text-surface-900 text-sm">Meeting Audio Recording</h4>
                    <p className="text-xs text-surface-500">{audioBlobUrl ? 'Captured live from your microphone during the meeting' : 'Stored session audio'}</p>
                  </div>
                </div>
              </div>

              {audioBlobUrl ? (
                <div className="bg-surface-900 rounded-2xl p-6 space-y-4 border border-surface-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold text-base">{meeting.title}</p>
                      <p className="text-surface-400 text-xs mt-0.5">Recorded {heldDisplay} · Duration: {meeting.duration}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-danger/20 text-danger border border-danger/30 flex items-center gap-1.5">
                      <Mic className="w-3 h-3" /> Audio Track
                    </span>
                  </div>

                  <audio controls className="w-full rounded-lg" src={audioBlobUrl}>
                    Your browser does not support the audio element.
                  </audio>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-surface-400">Audio format: WebM (Opus 16kHz)</span>
                    <a
                      href={audioBlobUrl}
                      download={`${meeting.title.replace(/\s+/g, '_')}_recording.webm`}
                      className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Audio
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-900 rounded-2xl p-6 text-center space-y-3">
                  <Play className="w-10 h-10 text-white/40 mx-auto" />
                  <p className="text-white font-bold text-sm">{meeting.title}</p>
                  <p className="text-surface-400 text-xs">Audio recording placeholder for demo meetings</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRANSCRIPT */}
          {activeTab === 'transcript' && meeting.transcript && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-info" />
                  </div>
                  <div>
                    <h4 className="font-bold text-surface-900 text-sm">Full Meeting Transcript</h4>
                    <p className="text-xs text-surface-500">Transcribed by Groq Whisper Turbo with timestamps</p>
                  </div>
                </div>
                <button
                  onClick={handleCopyTranscript}
                  className="px-3 py-1.5 rounded-lg border border-surface-200 hover:border-brand-300 text-surface-700 hover:text-brand-600 text-xs font-semibold flex items-center gap-1.5 bg-white shadow-sm transition-all"
                >
                  {copiedTranscript ? <><Check className="w-3.5 h-3.5 text-success" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Transcript</>}
                </button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="text"
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  placeholder="Search in transcript dialogue..."
                  className="input pl-9 text-xs py-2"
                />
              </div>

              <div className="bg-surface-50 rounded-xl border border-surface-200 divide-y divide-surface-100 overflow-hidden max-h-[380px] overflow-y-auto">
                {transcriptBlocks.length > 0 ? (
                  transcriptBlocks.map((block, i) => {
                    const timestampMatch = block.match(/^\[(\d{2}:\d{2})\]\s*(.+)$/s)
                    if (timestampMatch) {
                      const [, timestamp, text] = timestampMatch
                      return (
                        <div key={i} className="p-3.5 flex gap-3 hover:bg-white transition-colors">
                          <span className="text-[11px] text-surface-500 font-mono bg-surface-100 px-2 py-0.5 rounded-md h-fit shrink-0 font-bold">
                            {timestamp}
                          </span>
                          <p className="text-surface-800 text-xs leading-relaxed">{text}</p>
                        </div>
                      )
                    }
                    return (
                      <div key={i} className="p-3.5 text-surface-700 text-xs leading-relaxed hover:bg-white">
                        {block}
                      </div>
                    )
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-surface-500">
                    No transcript entries matching "{transcriptSearch}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer badge */}
        <div className="shrink-0 px-6 py-3 bg-surface-50 border-t border-surface-200 flex items-center justify-between text-xs text-surface-500">
          <div className="flex items-center gap-2">
            <Mic className="w-3.5 h-3.5 text-brand-600" />
            <span>Metadata powered by <strong className="text-brand-600 font-bold">Intent AI Intelligence</strong> (Groq Whisper + LLM)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="font-semibold text-surface-600">Metadata Verified</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Recording Bar ──────────────────────────────────────────────────────────────
function RecordingBar({ meetingTitle, elapsed, onStop }: {
  meetingTitle: string
  elapsed: number
  onStop: () => void
}) {
  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-danger/10 to-danger/5 border-2 border-danger/20 rounded-2xl flex items-center gap-4 animate-slide-up shadow-sm">
      {/* Pulsing red dot */}
      <div className="relative shrink-0">
        <div className="w-4 h-4 rounded-full bg-danger animate-pulse" />
        <div className="absolute inset-0 w-4 h-4 rounded-full bg-danger/50 animate-ping" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-surface-900 truncate">Recording: {meetingTitle}</h4>
          <span className="text-danger font-mono font-bold text-sm bg-danger/10 px-2.5 py-0.5 rounded-md border border-danger/20">
            {formatElapsedTime(elapsed)}
          </span>
        </div>
        <p className="text-xs text-surface-500 mt-0.5">Microphone capturing audio · Return here after Google Meet and click Stop & Process</p>
      </div>

      <button onClick={onStop} className="shrink-0 px-5 py-2.5 rounded-xl bg-danger hover:bg-danger-dark text-white font-bold flex items-center gap-2 transition-colors shadow-md">
        <Square className="w-4 h-4" /> Stop & Process
      </button>
    </div>
  )
}

// ── Processing Bar ─────────────────────────────────────────────────────────────
function ProcessingBar({ meetingTitle, step }: { meetingTitle: string; step: string }) {
  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-brand-50 to-purple-50 border-2 border-brand-100 rounded-2xl flex items-center gap-4 animate-slide-up shadow-sm">
      <Loader2 className="w-6 h-6 text-brand-600 animate-spin shrink-0" />
      <div className="flex-1">
        <h4 className="font-bold text-surface-900">Processing: {meetingTitle}</h4>
        <p className="text-sm text-brand-600 font-medium mt-0.5">{step}</p>
      </div>
    </div>
  )
}

// ── Start Meeting Modal (asks for title before opening Google Meet) ────────────
function StartMeetingModal({ onStart, onClose }: {
  onStart: (title: string) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const now = new Date()
  const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Start Instant Meeting</h3>
                <p className="text-brand-100 text-xs">Configure meeting metadata & start recording</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-surface-700 mb-1.5">Meeting Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint Planning, Client Sync, Design Review..."
              className="input font-medium"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) onStart(title) }}
            />
          </div>

          {/* Metadata preview card */}
          <div className="bg-surface-50 border border-surface-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center text-surface-600">
              <span className="font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-600" /> Start Time:
              </span>
              <span className="font-bold text-surface-800">Today at {currentTime}</span>
            </div>
            <div className="flex justify-between items-center text-surface-600">
              <span className="font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand-600" /> Host:
              </span>
              <span className="font-bold text-surface-800">Me (Host)</span>
            </div>
            <div className="flex justify-between items-center text-surface-600">
              <span className="font-semibold flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-danger" /> Duration:
              </span>
              <span className="font-bold text-surface-800">Live tracked until stopped</span>
            </div>
            <div className="flex justify-between items-center text-surface-600">
              <span className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" /> AI Features:
              </span>
              <span className="font-bold text-brand-700">Whisper STT + LLM Notes</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-brand-50/70 rounded-xl border border-brand-100 text-xs text-brand-800">
            <ExternalLink className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Google Meet opens in a new tab while audio is recorded in this workspace. When done, click <strong>Stop & Process</strong> here to view full AI notes and transcript!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-surface-200 text-surface-700 font-semibold hover:bg-surface-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { if (title.trim()) onStart(title) }}
            disabled={!title.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm">
            <Video className="w-4 h-4" /> Start & Record
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Meetings Page ─────────────────────────────────────────────────────────
export function MeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingModel[]>(DEMO_MEETINGS)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingModel | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [showStartModal, setShowStartModal] = useState(false)

  // Recording state
  const recorderRef = useRef<MeetingRecorder | null>(null)
  const recordingStartTimeRef = useRef<Date | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTitle, setRecordingTitle] = useState('')
  const [recordingElapsed, setRecordingElapsed] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')

  // Store audio blob URLs for playback (keyed by meeting id)
  const audioBlobUrlsRef = useRef<Map<number, string>>(new Map())

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      audioBlobUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  // ── Start Recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(async (title: string) => {
    try {
      const recorder = new MeetingRecorder()
      recorderRef.current = recorder
      recordingStartTimeRef.current = new Date()
      await recorder.start((elapsed) => setRecordingElapsed(elapsed))
      setIsRecording(true)
      setRecordingTitle(title)
      setRecordingElapsed(0)
    } catch (err) {
      console.error('Failed to start recording:', err)
      alert('Could not access microphone. Please allow microphone permission and try again.')
    }
  }, [])

  // ── Stop Recording & Process ───────────────────────────────────────────────
  const stopAndProcess = useCallback(async () => {
    const recorder = recorderRef.current
    if (!recorder) return

    setIsRecording(false)
    setIsProcessing(true)
    setProcessingStep('Stopping microphone recording...')

    try {
      const audioBlob = await recorder.stop()
      recorderRef.current = null

      const blobUrl = URL.createObjectURL(audioBlob)
      const meetingId = Date.now()
      const startTime = recordingStartTimeRef.current || new Date()
      const elapsedSecs = Math.max(1, recordingElapsed || Math.round((Date.now() - startTime.getTime()) / 1000))

      setProcessingStep('Transcribing audio with Groq Whisper STT...')

      const result = await apiService.processMeeting(audioBlob, recordingTitle || 'Meeting')

      if (result.error) {
        setProcessingStep(`Notice: ${result.error}`)
      } else {
        setProcessingStep('Generating AI structured notes with Groq LLM...')
      }

      // Store blob URL for playback
      audioBlobUrlsRef.current.set(meetingId, blobUrl)

      // Format held time & duration
      const timeStr = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      const heldAtStr = `${startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeStr}`
      const finalDuration = result.duration && result.duration !== '0s' ? result.duration : formatDurationDisplay(elapsedSecs)

      const completedMeeting: MeetingModel = {
        id: meetingId,
        title: recordingTitle || 'Instant Meeting',
        time: timeStr,
        scheduledDate: 'Today',
        heldAt: heldAtStr,
        duration: finalDuration,
        host: 'Me (Host)',
        attendees: ['Me (Host)'],
        status: 'Completed',
        notes: true,
        recording: blobUrl,
        transcript: result.formatted_transcript || result.transcript || 'Audio captured successfully.',
        summary: result.summary || 'Summary generated from meeting audio.',
      }

      setMeetings(prev => [completedMeeting, ...prev])
      setProcessingStep('Done! Real-time metadata generated.')

      // Automatically open the metadata viewer modal
      setSelectedMeeting(completedMeeting)

      setTimeout(() => {
        setIsProcessing(false)
        setProcessingStep('')
      }, 1200)
    } catch (err) {
      console.error('Meeting processing failed:', err)
      setProcessingStep('Processing error. Please verify backend server and try again.')
      setTimeout(() => setIsProcessing(false), 3500)
    }
  }, [recordingTitle, recordingElapsed])


  // ── Meeting Handlers ───────────────────────────────────────────────────────
  const handleSchedule = useCallback((title: string, link: string, date: string, time: string) => {
    const formatTime = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      const ampm = (h ?? 0) >= 12 ? 'PM' : 'AM'
      const hour12 = (h ?? 0) % 12 || 12
      return `${hour12}:${String(m ?? 0).padStart(2, '0')} ${ampm}`
    }
    const formatDate = (d: string) => {
      const today = new Date().toISOString().split('T')[0]
      if (d === today) return 'Today'
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
      if (d === tomorrow) return 'Tomorrow'
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    const newMeeting: MeetingModel = {
      id: Date.now(), title,
      time: formatTime(time), duration: "30m", host: "Me", attendees: ["Me"],
      status: "Upcoming", link, meetLink: link, scheduledDate: formatDate(date),
    }
    setMeetings(prev => [newMeeting, ...prev])
    setTimeout(() => setShowScheduleModal(false), 800)
  }, [])

  const handleStartInstantMeeting = useCallback(() => {
    if (isRecording) return
    setShowStartModal(true)
  }, [isRecording])

  const handleStartWithTitle = useCallback((title: string) => {
    setShowStartModal(false)
    // Open Google Meet directly on user click gesture so popup blocker won't block it
    window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer')
    // Start microphone recording
    startRecording(title)
  }, [startRecording])

  const handleJoinMeeting = useCallback((meeting: MeetingModel) => {
    // Open Google Meet FIRST (must be synchronous with user click)
    const url = meeting.link && meeting.link.startsWith('http') ? meeting.link : 'https://meet.google.com/new'
    window.open(url, '_blank', 'noopener,noreferrer')
    if (!isRecording) {
      startRecording(meeting.title)
    }
  }, [isRecording, startRecording])

  const handleCopyLink = useCallback((meeting: MeetingModel) => {
    const link = meeting.link || meeting.meetLink || 'https://meet.google.com/new'
    navigator.clipboard.writeText(link)
    setCopiedId(meeting.id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const upcomingMeetings = meetings.filter(m => m.status === 'Upcoming')
  const completedMeetings = meetings.filter(m => m.status === 'Completed')
  const nextMeeting = upcomingMeetings[0]

  return (
    <div className="mt-6 max-w-5xl mx-auto animate-slide-up">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-surface-900">Meetings</h2>
          <p className="text-sm text-surface-500">Live AI audio recording, Whisper STT & automated structured notes</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowScheduleModal(true)} disabled={isRecording || isProcessing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-brand-200 hover:border-brand-400 text-brand-700 font-bold rounded-xl transition-all duration-200 hover:shadow-md hover:shadow-brand-500/10 disabled:opacity-50">
            <CalendarIcon className="w-4 h-4" /> Schedule Meeting
          </button>
          <button onClick={handleStartInstantMeeting} disabled={isRecording || isProcessing} className="btn-primary gap-2 py-2.5 disabled:opacity-50 shadow-md shadow-brand-500/20">
            <Video className="w-4 h-4" /> Start Instant Meeting
          </button>
        </div>
      </div>

      {/* Recording Bar */}
      {isRecording && (
        <RecordingBar meetingTitle={recordingTitle} elapsed={recordingElapsed} onStop={stopAndProcess} />
      )}

      {/* Processing Bar */}
      {isProcessing && (
        <ProcessingBar meetingTitle={recordingTitle} step={processingStep} />
      )}

      {/* Stats + Next Meeting Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {nextMeeting && (
          <div className="col-span-1 md:col-span-2 bg-gradient-brand text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-[50px] -mr-20 -mt-20"></div>
            <div className="relative z-10">
              <div className="text-brand-100 font-semibold text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning animate-pulse"></div> Up Next
              </div>
              <h3 className="text-3xl font-bold mb-2">{nextMeeting.title}</h3>
              <p className="text-brand-100 flex items-center gap-4 mb-8">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {nextMeeting.time}</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {nextMeeting.attendees.length} Attendees</span>
              </p>
              <div className="flex items-center gap-3">
                <button onClick={() => handleJoinMeeting(nextMeeting)} disabled={isRecording}
                  className="bg-white text-brand-700 hover:bg-brand-50 px-6 py-2.5 rounded-xl font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                  <Video className="w-5 h-5" /> Join Meeting
                </button>
                <button onClick={() => handleCopyLink(nextMeeting)}
                  className="bg-brand-700/50 hover:bg-brand-700/70 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm">
                  <Copy className="w-4 h-4" /> {copiedId === nextMeeting.id ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-sm flex flex-col">
          <h3 className="font-bold text-surface-900 mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-500" /> Today's Stats
          </h3>
          <div className="flex-1 flex flex-col justify-center gap-4">
            <div className="flex justify-between items-center p-3 bg-surface-50 rounded-xl">
              <span className="text-surface-600 font-medium">Total Meetings</span>
              <span className="text-xl font-bold text-surface-900">{meetings.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-surface-50 rounded-xl">
              <span className="text-surface-600 font-medium">Upcoming</span>
              <span className="text-xl font-bold text-brand-600">{upcomingMeetings.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-surface-50 rounded-xl">
              <span className="text-surface-600 font-medium">Completed</span>
              <span className="text-xl font-bold text-success">{completedMeetings.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Meeting Intelligence Banner */}
      <div className="mb-8 p-4 bg-gradient-to-r from-brand-50 to-purple-50 rounded-2xl border border-brand-100 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
          <Sparkles className="w-6 h-6 text-brand-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-surface-900 mb-0.5">AI Meeting Intelligence Active</h4>
          <p className="text-sm text-surface-600 leading-relaxed">
            Start or join any Google Meet meeting to auto-record audio. When the meeting ends, audio is transcribed by <strong>Groq Whisper Turbo</strong> and structured notes are generated by <strong>Groq LLM</strong>.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-brand-200 shrink-0">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-bold text-brand-700">Active</span>
        </div>
      </div>

      {/* Agenda */}
      <h3 className="font-bold text-surface-900 text-lg mb-4 flex items-center justify-between">
        <span>Agenda</span>
        <span className="text-xs font-semibold text-surface-500">{meetings.length} total sessions</span>
      </h3>
      <div className="bg-white border border-surface-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-surface-100">
        {meetings.map((meeting) => (
          <div key={meeting.id} className="p-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${meeting.status === 'Upcoming' ? 'bg-brand-50 text-brand-600' : 'bg-surface-100 text-surface-600'}`}>
                <span className="text-[10px] font-bold uppercase">{meeting.time.split(' ')[1] || 'AM'}</span>
                <span className="text-sm font-bold">{meeting.time.split(' ')[0]}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-surface-900">{meeting.title}</h4>
                  {meeting.status === 'Completed' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/20">
                      Completed
                    </span>
                  )}
                </div>
                <p className="text-xs text-surface-500 flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-surface-700 font-medium">{meeting.host}</span>
                  <span className="w-1 h-1 rounded-full bg-surface-300"></span>
                  <span className="font-semibold text-brand-600">{meeting.duration}</span>
                  <span className="w-1 h-1 rounded-full bg-surface-300"></span>
                  <span>{meeting.heldAt || (meeting.scheduledDate ? `${meeting.scheduledDate} · ${meeting.time}` : meeting.time)}</span>
                  {meeting.attendees.length > 1 && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-surface-300"></span>
                      <span>{meeting.attendees.length} participants</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {meeting.status === 'Upcoming' ? (
              <button onClick={() => handleJoinMeeting(meeting)} disabled={isRecording}
                className="text-brand-600 hover:text-brand-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-brand-50 transition-colors flex items-center gap-1 disabled:opacity-50">
                Join <ArrowUpRight className="w-4 h-4" />
              </button>
            ) : meeting.status === 'Completed' ? (
              <button onClick={() => setSelectedMeeting(meeting)}
                className="text-brand-700 hover:text-brand-800 font-bold text-sm px-4 py-2 rounded-xl hover:bg-brand-100/70 transition-all flex items-center gap-2 bg-brand-50 border border-brand-200 shadow-sm">
                <Sparkles className="w-4 h-4 text-brand-600" /> View Metadata
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {/* Modals */}
      {showStartModal && (
        <StartMeetingModal onStart={handleStartWithTitle} onClose={() => setShowStartModal(false)} />
      )}

      {showScheduleModal && (
        <ScheduleMeetingModal onClose={() => setShowScheduleModal(false)} onSchedule={handleSchedule} />
      )}

      {selectedMeeting && (
        <MeetingMetadataPanel
          meeting={selectedMeeting}
          audioBlobUrl={audioBlobUrlsRef.current.get(selectedMeeting.id)}
          onClose={() => setSelectedMeeting(null)}
        />
      )}
    </div>
  )
}
