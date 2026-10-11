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
  }
}
