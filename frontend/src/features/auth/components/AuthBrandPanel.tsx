import React from 'react'
import { IntentLogo } from './IntentLogo'
import { LayoutDashboard, Layers, Sparkles, ShieldCheck } from 'lucide-react'

export const AuthBrandPanel: React.FC = () => {
  const benefits = [
    {
      icon: <LayoutDashboard className="w-5 h-5 text-brand-600" />,
      title: 'Adaptive dashboards for your role',
      desc: 'Widgets, priorities, and layout reorganize dynamically around your current focus and tasks.',
    },
    {
      icon: <Layers className="w-5 h-5 text-brand-600" />,
      title: 'Meetings, notes, and tasks in one place',
      desc: 'No more jumping across browser tabs. Integrated agenda, inbox, calendar, and action items.',
    },
    {
      icon: <Sparkles className="w-5 h-5 text-brand-600" />,
      title: 'AI-powered planning with user control',
      desc: 'Transparent AI assistance that suggests summaries and schedule drafts with full approval by you.',
    },
  ]

  return (
    <div className="relative hidden lg:flex flex-col justify-between w-full h-full p-12 xl:p-16 bg-gradient-to-br from-brand-50/70 via-surface-50 to-indigo-50/40 border-r border-surface-200/80 overflow-hidden select-none">
      {/* Decorative ambient backdrop rings using the app icon geometry subtly */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-brand-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-200/25 blur-3xl pointer-events-none" />

      {/* Subtle background watermark of the Intent app icon */}
      <div className="absolute -bottom-16 -right-16 opacity-[0.035] pointer-events-none text-surface-900">
        <svg className="w-[420px] h-[420px]" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
          <path d="M17 12.5C17 14.5 17.8 15.2 19.8 15.2C17.8 15.2 17 15.9 17 17.9C17 15.9 16.2 15.2 14.2 15.2C16.2 15.2 17 14.5 17 12.5Z" />
        </svg>
      </div>

      {/* Top Header / Branding */}
      <div className="relative z-10">
        <IntentLogo size="lg" showText subtitle="Adaptive Productivity Workspace" />
        
        <div className="mt-10 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-800 border border-brand-200 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />
            AI-Engineered Workspace
          </div>
          <h2 className="text-3xl xl:text-4xl font-extrabold text-surface-900 tracking-tight leading-tight">
            Your work, organized around your intent.
          </h2>
          <p className="mt-3 text-surface-600 text-base leading-relaxed">
            A unified dashboard that continuously synthesizes your schedule, conversations, and objectives into high-leverage workflows.
          </p>
        </div>
      </div>

      {/* Benefit Highlights */}
      <div className="relative z-10 my-10 space-y-4 max-w-lg">
        {benefits.map((b, idx) => (
          <div
            key={idx}
            className="group flex items-start gap-4 p-4 rounded-2xl bg-white/70 hover:bg-white border border-surface-200/70 shadow-sm hover:shadow transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0 group-hover:bg-brand-600 group-hover:text-white transition-colors duration-200">
              <div className="group-hover:text-white transition-colors">
                {b.icon}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-900 leading-snug">
                {b.title}
              </h3>
              <p className="text-xs text-surface-600 mt-0.5 leading-relaxed">
                {b.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Trust Badge */}
      <div className="relative z-10 pt-6 border-t border-surface-200/70 flex items-center justify-between text-xs text-surface-500">
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <span>Enterprise-grade encryption & user-governed AI</span>
        </div>
        <span className="font-mono text-[11px] text-surface-400">v2.4 LTS</span>
      </div>
    </div>
  )
}
