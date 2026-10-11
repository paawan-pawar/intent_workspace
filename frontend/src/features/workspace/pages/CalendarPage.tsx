import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Users } from 'lucide-react'

export function CalendarPage() {
  return (
    <div className="flex flex-col h-full mt-6 max-w-6xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-surface-900">October 2026</h2>
          <div className="flex items-center gap-1 bg-white border border-surface-200 rounded-lg p-1">
            <button className="p-1 hover:bg-surface-100 rounded-md"><ChevronLeft className="w-5 h-5 text-surface-600" /></button>
            <button className="px-3 py-1 text-sm font-semibold text-surface-700 hover:bg-surface-100 rounded-md">Today</button>
            <button className="p-1 hover:bg-surface-100 rounded-md"><ChevronRight className="w-5 h-5 text-surface-600" /></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-white border border-surface-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50">
            <option>Day</option>
            <option>Week</option>
            <option>Month</option>
          </select>
          <button className="btn-primary py-1.5 px-4 text-sm gap-2">
            <CalendarIcon className="w-4 h-4" /> New Event
          </button>
        </div>
      </div>

      <div className="flex gap-6 h-[600px]">
        {/* Mini Calendar & Filters */}
        <div className="w-64 shrink-0 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm">
            <h3 className="font-bold text-surface-900 mb-4 flex justify-between">October 2026</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-surface-400 mb-2">
              <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {Array.from({ length: 31 }).map((_, i) => (
                <button key={i} className={`p-1.5 rounded-full hover:bg-surface-100 font-medium ${i + 1 === 11 ? 'bg-brand-500 text-white hover:bg-brand-600' : 'text-surface-700'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm">
            <h3 className="font-bold text-surface-900 mb-3 text-sm">My Calendars</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-brand-500 focus:ring-brand-500 border-surface-300" />
                <span className="text-sm font-medium text-surface-700">Work</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-purple-500 focus:ring-purple-500 border-surface-300" />
                <span className="text-sm font-medium text-surface-700">Personal</span>
              </label>
            </div>
          </div>
        </div>

        {/* Day View Timeline */}
        <div className="flex-1 bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-surface-200 bg-surface-50">
            <h2 className="text-lg font-bold text-surface-900">Sunday, Oct 11</h2>
          </div>
          <div className="flex-1 overflow-y-auto relative">
            <div className="absolute top-0 left-0 bottom-0 w-16 border-r border-surface-100 bg-surface-50/50"></div>
            {/* Hour lines */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex h-20 border-b border-surface-100">
                <div className="w-16 flex justify-center pt-2 text-xs font-medium text-surface-400">
                  {i + 9}:00 {i + 9 < 12 ? 'AM' : 'PM'}
                </div>
                <div className="flex-1"></div>
              </div>
            ))}
            
            {/* Events Overlay */}
            <div className="absolute top-20 left-20 right-4 p-3 border rounded-xl shadow-sm bg-brand-50 text-brand-700 border-brand-200">
              <h4 className="font-bold text-sm">Product Sync</h4>
              <p className="text-xs mt-1 flex items-center gap-1 opacity-80"><Clock className="w-3 h-3"/> 10:00 AM - 11:00 AM</p>
              <p className="text-xs mt-1 flex items-center gap-1 opacity-80"><Users className="w-3 h-3"/> 4 attendees</p>
            </div>
            
            <div className="absolute top-[280px] h-[120px] left-20 right-4 p-3 border rounded-xl shadow-sm bg-purple-50 text-purple-700 border-purple-200">
              <h4 className="font-bold text-sm">Design Review: Mobile App</h4>
              <p className="text-xs mt-1 flex items-center gap-1 opacity-80"><Clock className="w-3 h-3"/> 1:30 PM - 3:00 PM</p>
              <p className="text-xs mt-1 flex items-center gap-1 opacity-80"><MapPin className="w-3 h-3"/> Conference Room B</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
