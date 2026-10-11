import React, { useEffect, useState, useRef } from 'react'
import { Search, Calendar, CheckSquare, MessageSquare, Briefcase } from 'lucide-react'
import { useUser } from '@/app/providers/UserProvider'
import { apiService } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

export function CommandPalette({ onPromptSubmit }: { onPromptSubmit: (p: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { setRole } = useUser()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiService.getRoles(),
  })

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (open) {
      setSearch('')
      setSelectedIndex(0)
      // Focus the input when palette opens
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  if (!open) return null

  const quickPrompts = [
    { label: "Schedule meeting & prep", icon: <Calendar className="w-4 h-4" />, action: "Schedule my meeting and provide me the points to discuss" },
    { label: "Show overdue work", icon: <CheckSquare className="w-4 h-4" />, action: "Show overdue work" },
    { label: "Summarize my day", icon: <MessageSquare className="w-4 h-4" />, action: "Summarize my day" },
  ]

  const roleItems = (roles || []).map(r => ({
    label: r.name,
    icon: <Briefcase className="w-4 h-4" />,
    action: () => { setRole(r); setOpen(false) },
    isRole: true
  }))

  const lower = search.toLowerCase()
  const filteredPrompts = quickPrompts.filter(p => p.label.toLowerCase().includes(lower))
  const filteredRoles = roleItems.filter(r => r.label.toLowerCase().includes(lower))

  const allItems = [
    ...filteredPrompts.map(p => ({ ...p, isRole: false as const })),
    ...filteredRoles
  ]

  const handleSelect = (index: number) => {
    const item = allItems[index]
    if (!item) return
    if (item.isRole && 'action' in item && typeof item.action === 'function') {
      item.action()
    } else if (!item.isRole && 'action' in item && typeof item.action === 'string') {
      onPromptSubmit(item.action)
      setOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(selectedIndex)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-surface-900/40 backdrop-blur-sm flex items-start justify-center pt-32"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-surface-200 animate-slide-up">
        <div className="flex items-center border-b border-surface-100 px-4 py-3">
          <Search className="w-5 h-5 text-surface-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-surface-900 text-lg placeholder-surface-400"
          />
        </div>

        <div ref={listRef} className="max-h-96 overflow-y-auto p-2">
          {allItems.length === 0 && (
            <div className="py-6 text-center text-surface-500">No results found.</div>
          )}

          {filteredPrompts.length > 0 && (
            <div>
              <div className="text-xs font-bold text-surface-400 uppercase tracking-wider px-2 py-2">Quick Prompts</div>
              {filteredPrompts.map((item, i) => {
                const globalIndex = i
                return (
                  <button
                    key={item.label}
                    onClick={() => { onPromptSubmit(item.action); setOpen(false) }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-surface-700 cursor-pointer w-full text-left transition-colors ${
                      selectedIndex === globalIndex ? 'bg-brand-50 text-brand-700' : 'hover:bg-brand-50 hover:text-brand-700'
                    }`}
                  >
                    {item.icon} {item.label}
                  </button>
                )
              })}
            </div>
          )}

          {filteredRoles.length > 0 && (
            <div>
              <div className="text-xs font-bold text-surface-400 uppercase tracking-wider px-2 py-2 mt-2">Switch Role</div>
              {filteredRoles.map((item, i) => {
                const globalIndex = filteredPrompts.length + i
                return (
                  <button
                    key={item.label}
                    onClick={() => { if (typeof item.action === 'function') item.action() }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-surface-700 cursor-pointer w-full text-left transition-colors ${
                      selectedIndex === globalIndex ? 'bg-brand-50 text-brand-700' : 'hover:bg-brand-50 hover:text-brand-700'
                    }`}
                  >
                    {item.icon} {item.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
