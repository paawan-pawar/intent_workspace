import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/app/providers/ToastProvider'
import { apiService, type SheetGoal } from '@/lib/api'
import { Button } from '@/components/ui/Button'

export function GoalsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [goals, setGoals] = useState<SheetGoal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshingId, setRefreshingId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    void apiService.getSheetGoals()
      .then(setGoals)
      .catch(error => setLoadError(error instanceof Error ? error.message : 'Goals could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [])

  const refreshGoal = async (goal: SheetGoal) => {
    setRefreshingId(goal.id)
    try {
      const refreshed = await apiService.refreshSheetGoal(goal.id)
      setGoals(current => current.map(item => item.id === refreshed.id ? refreshed : item))
      showToast('Goal progress refreshed from calculated sheet data')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Goal progress could not be refreshed.')
    } finally {
      setRefreshingId(null)
    }
  }

  return (
    <section className="mx-auto mt-6 max-w-6xl animate-slide-up pb-12" aria-labelledby="goals-title">
      <header className="mb-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800"><Target className="h-6 w-6" aria-hidden="true" /></span>
          <div>
            <h2 id="goals-title" className="text-2xl font-bold text-surface-900">Goals</h2>
            <p className="mt-1 text-sm text-surface-600">Track targets linked to calculated metrics in your sheets.</p>
          </div>
        </div>
      </header>

      {isLoading && <p role="status" className="py-10 text-center text-sm text-surface-600">Loading goals…</p>}
      {loadError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{loadError}</p>}
      {!isLoading && !loadError && goals.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
          <Target className="mx-auto h-8 w-8 text-emerald-700" aria-hidden="true" />
          <h3 className="mt-3 font-bold text-surface-900">No goals yet</h3>
          <p className="mt-1 text-sm text-surface-600">Analyze a sheet, then choose “Add to goal” to set a target linked to one of its numeric metrics.</p>
          <Button className="mt-4 bg-cyan-800 hover:bg-cyan-900" onClick={() => navigate('/sheets')}>Browse Sheets</Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {goals.map(goal => {
          const completed = goal.progress_percent >= 100
          return (
            <article key={goal.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${completed ? 'border-emerald-200' : 'border-surface-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-surface-900">{goal.title}</h3>
                  <p className="mt-1 text-xs text-surface-600">{goal.metric} · {goal.direction === 'reduce' ? 'reduce' : 'increase'} · due {goal.deadline}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${completed ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                  {completed ? 'Goal reached' : `${goal.progress_percent}%`}
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-surface-500">Current value · calculated</p>
                  <p className="text-xl font-extrabold text-cyan-950">{goal.current_value.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-surface-500">Target</p>
                  <p className="font-bold text-surface-800">{goal.target_value.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-100" role="progressbar" aria-label={`${goal.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={goal.progress_percent}>
                <div className={`h-full rounded-full transition-all ${completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-emerald-500'}`} style={{ width: `${goal.progress_percent}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-surface-600">
                <span>{goal.progress_percent}% progress</span>
                <span>Remaining gap: {goal.remaining_gap.toLocaleString()}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-surface-100 pt-3">
                <button type="button" onClick={() => navigate(goal.source_url)} className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-800 hover:underline">
                  {goal.sheet_name} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </button>
                <Button size="sm" variant="outline" onClick={() => void refreshGoal(goal)} disabled={refreshingId === goal.id} className="border-cyan-200 text-cyan-900">
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshingId === goal.id ? 'animate-spin' : ''}`} aria-hidden="true" />
                  Refresh from sheet
                </Button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}