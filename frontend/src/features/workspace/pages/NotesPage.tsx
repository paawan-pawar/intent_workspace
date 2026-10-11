import { Search, Plus, FileText, MoreHorizontal, ExternalLink, Sparkles } from 'lucide-react'
import { apiService, NoteModel } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/app/providers/ToastProvider'

const INITIAL_NOTES: NoteModel[] = [
  { id: 1, title: "Product Roadmap Q4", preview: "Focus on user retention and onboarding flow improvements. Goal is to reduce drop-off by 15%...", date: "Oct 11", tag: "Strategy", color: "border-brand-200 bg-brand-50/50" },
  { id: 2, title: "Meeting Notes: Design Sync", preview: "- Need updated icons for sidebar\n- Adjust primary button color\n- Dark mode support discussed...", date: "Oct 10", tag: "Meeting", color: "border-purple-200 bg-purple-50/50" },
  { id: 3, title: "1:1 with Alex", preview: "Alex is doing well, focus for next month is improving the testing coverage. Discussed potential conference...", date: "Oct 8", tag: "Management", color: "border-green-200 bg-green-50/50" },
  { id: 4, title: "Ideas for Hackathon", preview: "1. AI driven scheduling\n2. Voice to text notes\n3. Workspace analytics dashboard...", date: "Oct 5", tag: "Ideation", color: "border-yellow-200 bg-yellow-50/50" },
]

export function NotesPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [notes, setNotes] = useState<NoteModel[]>(INITIAL_NOTES)
  const [isAdding, setIsAdding] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')

  useEffect(() => {
    void apiService.getSheetNotes()
      .then(sheetNotes => setNotes(current => [...sheetNotes, ...current.filter(note => !sheetNotes.some(item => item.id === note.id))]))
      .catch(error => showToast(error instanceof Error ? error.message : 'Sheet insight notes could not be loaded.'))
  }, [])

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteTitle.trim()) {
      setIsAdding(false)
      return
    }
    const newNote: NoteModel = {
      id: Date.now(),
      title: newNoteTitle,
      preview: "Start writing your note here...",
      date: "Just now",
      tag: "Draft",
      color: "border-brand-200 bg-brand-50/50"
    }
    setNotes([newNote, ...notes])
    setNewNoteTitle('')
    setIsAdding(false)
  }

  return (
    <div className="mt-6 max-w-6xl mx-auto animate-slide-up pb-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-surface-900">Notes</h2>
        <div className="flex items-center gap-4">
          <div className="relative w-64 hidden sm:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input type="text" placeholder="Search notes..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
          </div>
          <button onClick={() => setIsAdding(true)} className="btn-primary py-2 px-4 gap-2">
            <Plus className="w-4 h-4" /> New Note
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdding && (
          <form onSubmit={handleAddNote} className="group p-5 rounded-2xl border-2 border-brand-400 bg-white shadow-sm h-64 flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">New Note</span>
            </div>
            <input 
              autoFocus
              className="text-lg font-bold text-surface-900 mb-2 w-full focus:outline-none placeholder:text-surface-300 bg-transparent" 
              placeholder="Note title..."
              value={newNoteTitle}
              onChange={e => setNewNoteTitle(e.target.value)}
              onBlur={() => { if(!newNoteTitle.trim()) setIsAdding(false) }}
            />
            <p className="text-sm text-surface-400">Press enter to save</p>
          </form>
        )}
        {notes.map(note => (
          <div key={note.id} className={`group p-5 rounded-2xl border cursor-pointer hover:shadow-md transition-all h-64 flex flex-col ${note.color}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider opacity-60">{note.tag}</span>
                {note.ai_suggested && <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-900"><Sparkles className="h-3 w-3" /> AI insight</span>}
              </div>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/50 rounded-md">
                <MoreHorizontal className="w-4 h-4 text-surface-600" />
              </button>
            </div>
            <h3 className="text-lg font-bold text-surface-900 mb-2 line-clamp-2">{note.title}</h3>
            <p className="text-sm text-surface-600 flex-1 whitespace-pre-wrap line-clamp-5">{note.content ?? note.preview}</p>
            <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between text-xs font-medium text-surface-500">
              <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Document</span>
              <span>{note.date}</span>
            </div>
            {note.source_url && (
              <button type="button" onClick={() => navigate(note.source_url!)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-800 hover:underline">
                Open source sheet <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        
        {/* Add Note Card */}
        <button onClick={() => setIsAdding(true)} className="p-5 rounded-2xl border-2 border-dashed border-surface-200 bg-white/50 hover:bg-white hover:border-brand-300 transition-all h-64 flex flex-col items-center justify-center text-surface-500 hover:text-brand-600 group">
          <div className="w-12 h-12 rounded-full bg-surface-100 group-hover:bg-brand-50 flex items-center justify-center mb-3 transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-bold">Create New Note</span>
        </button>
      </div>
    </div>
  )
}