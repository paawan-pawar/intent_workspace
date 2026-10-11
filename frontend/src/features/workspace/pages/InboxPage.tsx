import { Star, Clock, MoreVertical, Search, Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { EmailModel } from '@/lib/api'

const DEMO_EMAILS: EmailModel[] = [
  { id: 1, sender: "Sarah Jenkins", subject: "Q3 Design Review Update", preview: "I've attached the latest mockups for the new dashboard. Please take a look when you have a moment...", time: "10:23 AM", unread: true, important: true },
  { id: 2, sender: "GitHub", subject: "[intent-workspace] Pull Request #42: Add Inbox Feature", preview: "User @dev pushed new commits to the feature/inbox branch. 2 files changed...", time: "9:45 AM", unread: true, important: false },
  { id: 3, sender: "Marcus Chen", subject: "Sync regarding product roadmap", preview: "Are we still on for 2 PM today? I have a few updates to the timeline that I'd like to run by you.", time: "Yesterday", unread: false, important: true },
  { id: 4, sender: "Figma", subject: "Alex commented on 'Web App UI'", preview: "Alex: \"Can we try making the primary button slightly more vibrant?\"", time: "Yesterday", unread: false, important: false },
  { id: 5, sender: "Weekly Digest", subject: "Your Activity Summary", preview: "You had a productive week! You completed 14 tasks and attended 6 meetings. Here is your breakdown...", time: "Oct 8", unread: false, important: false },
]

export function InboxPage() {
  const [activeTab, setActiveTab] = useState('focused')
  
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden animate-slide-up mt-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-200 bg-surface-50">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-surface-900">Inbox</h2>
          <div className="flex bg-surface-200 rounded-lg p-0.5">
            <button onClick={() => setActiveTab('focused')} className={cn("px-4 py-1.5 text-sm font-semibold rounded-md transition-colors", activeTab === 'focused' ? "bg-white text-surface-900 shadow-sm" : "text-surface-600 hover:text-surface-900")}>Focused</button>
            <button onClick={() => setActiveTab('other')} className={cn("px-4 py-1.5 text-sm font-semibold rounded-md transition-colors", activeTab === 'other' ? "bg-white text-surface-900 shadow-sm" : "text-surface-600 hover:text-surface-900")}>Other</button>
          </div>
        </div>
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input type="text" placeholder="Search mail..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2 p-3 border-b border-surface-200 text-surface-500">
        <button className="p-1.5 hover:bg-surface-100 rounded-md transition-colors"><Check className="w-4 h-4" /></button>
        <button className="p-1.5 hover:bg-surface-100 rounded-md transition-colors"><Clock className="w-4 h-4" /></button>
        <div className="h-4 w-px bg-surface-200 mx-2" />
        <button className="flex items-center gap-1 text-sm font-medium px-2 py-1.5 hover:bg-surface-100 rounded-md transition-colors">
          Filter <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {DEMO_EMAILS.map((email) => (
          <div key={email.id} className={cn("flex items-start gap-4 p-4 border-b border-surface-100 hover:bg-surface-50 cursor-pointer transition-colors group", email.unread ? "bg-brand-50/20" : "")}>
            <div className="pt-1 flex flex-col gap-2">
              <button className="text-surface-300 hover:text-surface-500"><Check className="w-4 h-4" /></button>
              <button className={cn(email.important ? "text-warning" : "text-surface-300 hover:text-warning")}><Star className="w-4 h-4" fill={email.important ? "currentColor" : "none"} /></button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className={cn("text-sm", email.unread ? "font-bold text-surface-900" : "font-semibold text-surface-700")}>{email.sender}</span>
                <span className={cn("text-xs whitespace-nowrap ml-4", email.unread ? "font-bold text-brand-600" : "text-surface-500")}>{email.time}</span>
              </div>
              <div className={cn("text-sm mb-1 truncate", email.unread ? "font-bold text-surface-900" : "font-medium text-surface-800")}>{email.subject}</div>
              <div className="text-sm text-surface-500 line-clamp-1">{email.preview}</div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 text-surface-400 hover:text-surface-900 rounded-md hover:bg-surface-200"><MoreVertical className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
