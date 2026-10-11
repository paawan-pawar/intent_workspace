import { Plus, CheckCircle2, Circle, Clock, ExternalLink, Sparkles } from 'lucide-react'
import { apiService, TaskModel, type SheetLinkedTask } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/app/providers/ToastProvider'

const INITIAL_TASKS: TaskModel[] = [
  { id: 1, title: "Review Q3 Marketing Strategy", status: "todo", priority: "high", due: "Today", tag: "Marketing" },
  { id: 2, title: "Update Homepage Hero Copy", status: "todo", priority: "medium", due: "Tomorrow", tag: "Design" },
  { id: 3, title: "Fix Navigation Bug on Mobile", status: "in-progress", priority: "high", due: "Today", tag: "Engineering" },
  { id: 4, title: "Finalize Budget Proposal", status: "done", priority: "medium", due: "Yesterday", tag: "Finance" },
]

function TaskCard({ task }: { task: TaskModel }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-surface-200 cursor-grab hover:shadow-md transition-shadow group">
      <div className="flex items-start gap-3">
        <button className="mt-0.5 text-surface-300 hover:text-brand-500 transition-colors">
          {task.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5" />}
        </button>
        <div className="flex-1">
          <h4 className={`font-semibold text-sm mb-2 ${task.status === 'done' ? 'text-surface-400 line-through' : 'text-surface-900'}`}>{task.title}</h4>
          <div className="flex items-center justify-between text-xs">
            <span className={`px-2 py-1 rounded-md font-medium ${task.priority === 'high' ? 'bg-danger/10 text-danger-dark' : 'bg-warning/10 text-warning-dark'}`}>
              {task.priority}
            </span>
            <span className="text-surface-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {task.due}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TasksPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [tasks, setTasks] = useState<TaskModel[]>(INITIAL_TASKS)
  const [sheetTasks, setSheetTasks] = useState<SheetLinkedTask[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  useEffect(() => {
    void apiService.getSheetTasks()
      .then(setSheetTasks)
      .catch(error => showToast(error instanceof Error ? error.message : 'Sheet-linked tasks could not be loaded.'))
  }, [])

  const updateSheetTaskStatus = async (task: SheetLinkedTask) => {
    const status = task.status === 'done' ? 'todo' : 'done'
    try {
      const updated = await apiService.updateSheetTask(task.id, status)
      setSheetTasks(current => current.map(item => item.id === updated.id ? updated : item))
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Task status could not be updated.')
    }
  }

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) {
      setIsAdding(false)
      return
    }
    const newTask: TaskModel = {
      id: Date.now(),
      title: newTaskTitle,
      status: 'todo',
      priority: 'medium',
      due: 'Today',
      tag: 'General'
    }
    setTasks([newTask, ...tasks])
    setNewTaskTitle('')
    setIsAdding(false)
  }

  return (
    <div className="mt-6 max-w-6xl mx-auto h-full flex flex-col animate-slide-up pb-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-surface-900">Tasks</h2>
        <button onClick={() => setIsAdding(true)} className="btn-primary py-2 px-4 gap-2">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {sheetTasks.length > 0 && (
        <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4" aria-labelledby="sheet-tasks-title">
          <h3 id="sheet-tasks-title" className="mb-3 flex items-center gap-2 font-bold text-amber-950">
            <Sparkles className="h-4 w-4 text-violet-700" aria-hidden="true" /> AI-suggested tasks from sheets
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {sheetTasks.map(task => (
              <article key={task.id} className="rounded-xl border border-amber-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => void updateSheetTaskStatus(task)} aria-label={task.status === 'done' ? `Reopen ${task.title}` : `Complete ${task.title}`} className="mt-0.5 text-emerald-700">
                    {task.status === 'done' ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={`text-sm font-bold ${task.status === 'done' ? 'text-surface-400 line-through' : 'text-surface-900'}`}>{task.title}</h4>
                      <span className="rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-900">AI suggestion</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-950">{task.priority}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-surface-700">{task.reason}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-surface-600">
                      <span>{task.sheet_name}</span>
                      {task.metric && <span>Metric: {task.metric}</span>}
                      {task.due_date && <span><Clock className="mr-1 inline h-3 w-3" />Due {task.due_date}</span>}
                    </p>
                    <button type="button" onClick={() => navigate(task.source_url)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-800 hover:underline">
                      Open related sheet insight <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* To Do */}
        <div className="bg-surface-50 rounded-2xl p-4 border border-surface-200/50">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-bold text-surface-700 flex items-center gap-2">To Do <span className="bg-surface-200 text-surface-600 px-2 py-0.5 rounded-full text-xs">{tasks.filter(t => t.status === 'todo').length}</span></h3>
            <button onClick={() => setIsAdding(true)} className="text-surface-400 hover:text-surface-700"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            {isAdding && (
              <form onSubmit={handleAddTask} className="bg-white p-3 rounded-xl shadow-sm border border-brand-300">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="What needs to be done?" 
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onBlur={() => { if(!newTaskTitle.trim()) setIsAdding(false) }}
                  className="w-full text-sm font-semibold text-surface-900 focus:outline-none placeholder:text-surface-400"
                />
              </form>
            )}
            {tasks.filter(t => t.status === 'todo').map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-brand-50/30 rounded-2xl p-4 border border-brand-100">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-bold text-brand-800 flex items-center gap-2">In Progress <span className="bg-brand-200 text-brand-700 px-2 py-0.5 rounded-full text-xs">{tasks.filter(t => t.status === 'in-progress').length}</span></h3>
            <button className="text-brand-500 hover:text-brand-700"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            {tasks.filter(t => t.status === 'in-progress').map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>

        {/* Done */}
        <div className="bg-success/5 rounded-2xl p-4 border border-success/10">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-bold text-success-dark flex items-center gap-2">Done <span className="bg-success/20 text-success-dark px-2 py-0.5 rounded-full text-xs">{tasks.filter(t => t.status === 'done').length}</span></h3>
          </div>
          <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
            {tasks.filter(t => t.status === 'done').map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>
      </div>
    </div>
  )
}