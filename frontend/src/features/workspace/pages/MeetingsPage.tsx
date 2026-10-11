import { Video, Calendar as CalendarIcon, Clock, Users, ArrowUpRight, Copy } from 'lucide-react'
import { MeetingModel } from '@/lib/api'

const DEMO_MEETINGS: MeetingModel[] = [
  { id: 1, title: "Product Sync", time: "10:00 AM", duration: "60m", host: "Sarah J.", attendees: ["Me", "Sarah J.", "Marcus C.", "Alex D."], status: "Upcoming", link: "meet.google.com/abc-defg-hij" },
  { id: 2, title: "Design Review", time: "1:30 PM", duration: "90m", host: "Alex D.", attendees: ["Me", "Alex D.", "Sarah J."], status: "Upcoming", link: "zoom.us/j/123456789" },
  { id: 3, title: "Weekly Standup", time: "Yesterday", duration: "15m", host: "Me", attendees: ["Engineering Team"], status: "Completed", notes: true },
]

export function MeetingsPage() {
  return (
    <div className="mt-6 max-w-5xl mx-auto animate-slide-up">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-surface-900">Meetings</h2>
        <button className="btn-primary gap-2 py-2">
          <Video className="w-4 h-4" /> Start Instant Meeting
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Next Meeting Highlight */}
        <div className="col-span-1 md:col-span-2 bg-gradient-brand text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-[50px] -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <div className="text-brand-100 font-semibold text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-warning animate-pulse"></div> Up Next in 15m
            </div>
            <h3 className="text-3xl font-bold mb-2">Product Sync</h3>
            <p className="text-brand-100 flex items-center gap-4 mb-8">
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 10:00 AM - 11:00 AM</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> 4 Attendees</span>
            </p>
            <div className="flex items-center gap-3">
              <button className="bg-white text-brand-700 hover:bg-brand-50 px-6 py-2.5 rounded-xl font-bold shadow-sm transition-colors flex items-center gap-2">
                <Video className="w-5 h-5" /> Join Meeting
              </button>
              <button className="bg-brand-700/50 hover:bg-brand-700/70 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm">
                <Copy className="w-4 h-4" /> Copy Link
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-sm flex flex-col">
          <h3 className="font-bold text-surface-900 mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-500" /> Today's Stats
          </h3>
          <div className="flex-1 flex flex-col justify-center gap-4">
            <div className="flex justify-between items-center p-3 bg-surface-50 rounded-xl">
              <span className="text-surface-600 font-medium">Total Meetings</span>
              <span className="text-xl font-bold text-surface-900">3</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-surface-50 rounded-xl">
              <span className="text-surface-600 font-medium">Time in Meetings</span>
              <span className="text-xl font-bold text-surface-900">2h 45m</span>
            </div>
          </div>
        </div>
      </div>

      <h3 className="font-bold text-surface-900 text-lg mb-4">Agenda</h3>
      <div className="bg-white border border-surface-200 rounded-2xl shadow-sm overflow-hidden">
        {DEMO_MEETINGS.map((meeting, i) => (
          <div key={meeting.id} className={`p-4 flex items-center justify-between hover:bg-surface-50 transition-colors ${i !== 0 ? 'border-t border-surface-100' : ''}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${meeting.status === 'Upcoming' ? 'bg-brand-50 text-brand-600' : 'bg-surface-100 text-surface-500'}`}>
                <span className="text-[10px] font-bold uppercase">{meeting.time.split(' ')[1] || ''}</span>
                <span className="text-sm font-bold">{meeting.time.split(' ')[0]}</span>
              </div>
              <div>
                <h4 className={`font-bold ${meeting.status === 'Completed' ? 'text-surface-500 line-through' : 'text-surface-900'}`}>{meeting.title}</h4>
                <p className="text-sm text-surface-500 flex items-center gap-2 mt-0.5">
                  <span className="text-surface-700">{meeting.host}</span>
                  <span className="w-1 h-1 rounded-full bg-surface-300"></span>
                  {meeting.duration}
                  <span className="w-1 h-1 rounded-full bg-surface-300"></span>
                  {meeting.attendees.join(', ')}
                </p>
              </div>
            </div>
            
            {meeting.status === 'Upcoming' ? (
              <button className="text-brand-600 hover:text-brand-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-brand-50 transition-colors flex items-center gap-1">
                Join <ArrowUpRight className="w-4 h-4" />
              </button>
            ) : meeting.notes ? (
              <button className="text-surface-600 hover:text-surface-900 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-surface-100 transition-colors">
                View Notes
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
