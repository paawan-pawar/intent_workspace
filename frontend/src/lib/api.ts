import axios from 'axios'
import { z } from 'zod'

// Create a configured axios instance
export const api = axios.create({
  baseURL: '/api', // Vite proxies this to http://localhost:8000
  headers: {
    'Content-Type': 'application/json',
  },
})

// Define response schemas for validation
export const HealthResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  timestamp: z.string(),
})

export type HealthResponse = z.infer<typeof HealthResponseSchema>

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  widgets: z.array(z.string())
})

export type Role = z.infer<typeof RoleSchema>

export const WidgetSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  span: z.number(),
  order: z.number(),
  visible: z.boolean(),
  data: z.record(z.any()),
  reason: z.string(),
  actions: z.array(z.string()),
  is_ai_suggested: z.boolean().optional()
})

export type WidgetModel = z.infer<typeof WidgetSchema>

export const DashboardPlanSchema = z.object({
  role: z.string(),
  title: z.string(),
  explanation: z.string(),
  clarificationQuestion: z.string().nullable().optional(),
  widgets: z.array(WidgetSchema)
})

export type DashboardPlan = z.infer<typeof DashboardPlanSchema>

export interface PromptRequest {
  prompt: string
  role: string
  currentWidgets: WidgetModel[]
  pinnedIds: string[]
  hiddenIds: string[]
}

export interface ScheduleMeetingRequest {
  title: string
  date: string
  time: string
  duration: string
  attendees: string
  currentPlan: DashboardPlan
}

// Demo Data Models
export const EmailSchema = z.object({
  id: z.number(),
  sender: z.string(),
  subject: z.string(),
  preview: z.string(),
  time: z.string(),
  unread: z.boolean(),
  important: z.boolean(),
})
export type EmailModel = z.infer<typeof EmailSchema>

// ── Gmail Types ─────────────────────────────────────────────

export interface GmailMessage {
  id: string
  threadId: string
  sender: string
  senderEmail: string
  subject: string
  snippet: string
  date: string
  unread: boolean
  starred: boolean
  hasAttachments: boolean
  labelIds: string[]
  category: 'focused' | 'other'
  body_html?: string
  body_text?: string
}

export interface GmailConnection {
  id: string
  provider: string
  connected: boolean
  demo_mode: boolean
  last_sync_at: number | null
  sync_error: string | null
  message_count: number
  credentials_configured: boolean
  last_sync_result: string | null
  email_address: string | null
  unread_count: number
}

export interface GmailInboxResponse {
  messages: GmailMessage[]
  nextPageToken: string | null
  resultSizeEstimate: number
  connected: boolean
  demo_mode: boolean
}

export interface GmailSyncResult {
  success: boolean
  new_messages: number
  message: string
  timestamp: number
  demo_mode: boolean
}

export interface GmailOAuthResponse {
  auth_url: string
  demo_mode: boolean
  message: string
}

export const CalendarEventSchema = z.object({
  id: z.number(),
  title: z.string(),
  time: z.string(),
  attendees: z.number(),
  type: z.string(),
  color: z.string(),
})
export type CalendarEventModel = z.infer<typeof CalendarEventSchema>

export const MeetingSchema = z.object({
  id: z.number(),
  title: z.string(),
  time: z.string(),
  duration: z.string(),
  host: z.string(),
  attendees: z.array(z.string()),
  status: z.string(),
  link: z.string().optional(),
  notes: z.boolean().optional(),
  scheduledDate: z.string().optional(),
  meetLink: z.string().optional(),
  recording: z.string().optional(),
  transcript: z.string().optional(),
  summary: z.string().optional(),
  heldAt: z.string().optional(),
})
export type MeetingModel = z.infer<typeof MeetingSchema>

export const TaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.enum(['todo', 'in-progress', 'done']),
  priority: z.enum(['high', 'medium', 'low']),
  due: z.string(),
  tag: z.string(),
})
export type TaskModel = z.infer<typeof TaskSchema>

export const NoteSchema = z.object({
  id: z.number(),
  title: z.string(),
  preview: z.string(),
  date: z.string(),
  tag: z.string(),
  color: z.string(),
})
export type NoteModel = z.infer<typeof NoteSchema>


export const PreferencesSchema = z.object({
  pinned_ids: z.array(z.string()),
  hidden_ids: z.array(z.string()),
  widget_order: z.record(z.number()),
  widget_spans: z.record(z.number()),
  saved_layouts: z.record(z.any())
})

export type Preferences = z.infer<typeof PreferencesSchema>


// ── Calendar Event (full model for CRUD) ─────────────────────

export const CalendarEventFullSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  location: z.string(),
  attendees: z.array(z.string()),
  calendar: z.string(),
  sync_status: z.string(),
})

export type CalendarEventFull = z.infer<typeof CalendarEventFullSchema>

export interface CalendarEventCreatePayload {
  title: string
  description?: string
  date: string
  start_time: string
  end_time: string
  location?: string
  attendees?: string[]
  calendar?: string
  sync_status?: string
}

export interface CalendarEventUpdatePayload {
  title?: string
  description?: string
  date?: string
  start_time?: string
  end_time?: string
  location?: string
  attendees?: string[]
  calendar?: string
  sync_status?: string
}


// ── Connections ──────────────────────────────────────────────

export const ConnectionStatusSchema = z.object({
  id: z.string(),
  provider: z.string(),
  connected: z.boolean(),
  demo_mode: z.boolean(),
  last_sync_at: z.number().nullable(),
  sync_error: z.string().nullable(),
  event_count: z.number(),
  credentials_configured: z.boolean(),
  last_sync_result: z.string().nullable(),
})

export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>

export const SyncResultSchema = z.object({
  success: z.boolean(),
  events_synced: z.number(),
  message: z.string(),
  timestamp: z.number(),
  demo_mode: z.boolean(),
})

export type SyncResult = z.infer<typeof SyncResultSchema>

export const OAuthStartSchema = z.object({
  auth_url: z.string(),
  demo_mode: z.boolean(),
  message: z.string(),
})

export type OAuthStartResponse = z.infer<typeof OAuthStartSchema>

// Meeting processing result
export interface MeetingProcessResult {
  transcript: string
  formatted_transcript: string
  segments: { start: number; end: number; text: string }[]
  summary: string
  duration: string
  error?: string
}

// API fetch functions
export const apiService = {
  async getHealth(): Promise<HealthResponse> {
    const { data } = await api.get('/health')
    return HealthResponseSchema.parse(data)
  },
  async getRoles(): Promise<Role[]> {
    const { data } = await api.get('/roles')
    return z.array(RoleSchema).parse(data)
  },
  async getDashboard(role: string): Promise<DashboardPlan> {
    const { data } = await api.get(`/dashboard/${role}`)
    return DashboardPlanSchema.parse(data)
  },
  async postPrompt(req: PromptRequest): Promise<DashboardPlan> {
    const { data } = await api.post('/prompt', req)
    return DashboardPlanSchema.parse(data)
  },
  async postScheduleMeeting(req: ScheduleMeetingRequest): Promise<DashboardPlan> {
    const { data } = await api.post('/actions/schedule-meeting', req)
    return DashboardPlanSchema.parse(data)
  },
  async getPreferences(role: string): Promise<Preferences> {
    const { data } = await api.get(`/preferences/${role}`)
    return PreferencesSchema.parse(data)
  },
  async putPreferences(role: string, prefs: Preferences): Promise<Preferences> {
    const { data } = await api.put(`/preferences/${role}`, prefs)
    return PreferencesSchema.parse(data)
  },

  /**
   * Upload meeting audio → Groq Whisper transcription → LLM summarization.
   * Returns transcript, timestamped transcript, AI summary, and duration.
   */
  async processMeeting(audioBlob: Blob, title: string): Promise<MeetingProcessResult> {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'meeting.webm')
    formData.append('title', title)
    const { data } = await api.post('/meetings/process', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })
    return data
  },

  /** Summarize from existing transcript text (no audio). */
  async summarizeMeeting(transcript: string, title: string): Promise<{ summary: string }> {
    const { data } = await api.post('/meetings/summarize', { transcript, title })
    return data
  },

  // ── Calendar Events ──────────────────────────────────────
  async getCalendarEvents(startDate?: string, endDate?: string): Promise<CalendarEventFull[]> {
    const params: Record<string, string> = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    const { data } = await api.get('/calendar/events', { params })
    return z.array(CalendarEventFullSchema).parse(data)
  },
  async createCalendarEvent(payload: CalendarEventCreatePayload): Promise<CalendarEventFull> {
    const { data } = await api.post('/calendar/events', payload)
    return CalendarEventFullSchema.parse(data)
  },
  async updateCalendarEvent(id: number, payload: CalendarEventUpdatePayload): Promise<CalendarEventFull> {
    const { data } = await api.put(`/calendar/events/${id}`, payload)
    return CalendarEventFullSchema.parse(data)
  },
  async deleteCalendarEvent(id: number): Promise<void> {
    await api.delete(`/calendar/events/${id}`)
  },

  // ── Connections ──────────────────────────────────────────
  async getConnections(): Promise<ConnectionStatus[]> {
    const { data } = await api.get('/connections')
    return z.array(ConnectionStatusSchema).parse(data)
  },
  async getConnection(id: string): Promise<ConnectionStatus> {
    const { data } = await api.get(`/connections/${id}`)
    return ConnectionStatusSchema.parse(data)
  },
  async toggleConnection(id: string, action: 'connect' | 'disconnect'): Promise<ConnectionStatus> {
    const { data } = await api.post(`/connections/${id}/toggle`, { action })
    return ConnectionStatusSchema.parse(data)
  },
  async syncConnection(id: string): Promise<SyncResult> {
    const { data } = await api.post(`/connections/${id}/sync`)
    return SyncResultSchema.parse(data)
  },
  async startOAuth(): Promise<OAuthStartResponse> {
    const { data } = await api.get('/connections/google-calendar/oauth/start')
    return OAuthStartSchema.parse(data)
  },

  // ── Gmail ─────────────────────────────────────────────────
  async getGmailConnection(): Promise<GmailConnection> {
    const { data } = await api.get('/gmail/connection')
    return data
  },
  async startGmailOAuth(): Promise<GmailOAuthResponse> {
    const { data } = await api.get('/gmail/oauth/start')
    return data
  },
  async connectGmailDemo(): Promise<GmailConnection> {
    const { data } = await api.post('/gmail/connect')
    return data
  },
  async disconnectGmail(): Promise<GmailConnection> {
    const { data } = await api.post('/gmail/disconnect')
    return data
  },
  async getGmailMessages(params?: {
    q?: string; max_results?: number; page_token?: string; category?: string
  }): Promise<GmailInboxResponse> {
    const { data } = await api.get('/gmail/messages', { params })
    return data
  },
  async getGmailMessage(messageId: string): Promise<GmailMessage> {
    const { data } = await api.get(`/gmail/messages/${messageId}`)
    return data
  },
  async modifyGmailMessage(messageId: string, action: 'read' | 'unread' | 'star' | 'unstar'): Promise<GmailMessage> {
    const { data } = await api.post(`/gmail/messages/${messageId}/modify`, { action })
    return data
  },
  async syncGmail(): Promise<GmailSyncResult> {
    const { data } = await api.post('/gmail/sync')
    return data
  },
  async checkGmailUpdates(): Promise<{ hasUpdates: boolean; unreadCount: number; historyId: string | null }> {
    const { data } = await api.get('/gmail/check')
    return data
  },
}