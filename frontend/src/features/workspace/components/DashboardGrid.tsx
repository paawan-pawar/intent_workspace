import { DashboardPlan } from '@/lib/api'
import { WidgetRenderer } from './WidgetRenderer'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { LayoutDashboard, RotateCcw } from 'lucide-react'

interface DashboardGridProps {
  plan: DashboardPlan | undefined
  isLoading: boolean
  pinnedIds: string[]
  hiddenIds: string[]
  onTogglePin: (id: string) => void
  onHide: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onResize: (id: string) => void
  onRemoveSheetWidget: (id: string) => void
  onReset: () => void
  onScheduleMeeting?: (req: any) => Promise<void>
  theme?: string
}

export function DashboardGrid({ plan, isLoading, pinnedIds, hiddenIds, onTogglePin, onHide, onMoveUp, onMoveDown, onResize, onRemoveSheetWidget, onReset, onScheduleMeeting, theme }: DashboardGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className={`h-64 ${i === 1 ? 'md:col-span-3' : 'md:col-span-1'}`} />
        ))}
      </div>
    )
  }

  if (!plan) return null

  // Filter out hidden widgets
  const hiddenSet = new Set(hiddenIds)
  const pinnedSet = new Set(pinnedIds)

  const visibleWidgets = plan.widgets
    .filter(w => !hiddenSet.has(w.id))
    .sort((a, b) => {
      // Sort pinned to top, then by order
      const aPinned = pinnedSet.has(a.id)
      const bPinned = pinnedSet.has(b.id)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return a.order - b.order
    })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-min">
      {visibleWidgets.map(widget => (
        <WidgetRenderer
          key={widget.id}
          widget={widget}
          isPinned={pinnedSet.has(widget.id)}
          onTogglePin={onTogglePin}
          onHide={onHide}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onResize={onResize}
          onRemoveSheetWidget={onRemoveSheetWidget}
          onScheduleMeeting={onScheduleMeeting}
          theme={theme}
        />
      ))}
      {visibleWidgets.length === 0 && (
        <div className="col-span-full flex flex-col items-center rounded-2xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-6 py-12 text-center">
          <div className="mb-4 rounded-2xl bg-indigo-100 p-3 text-indigo-700">
            <LayoutDashboard className="h-7 w-7" aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-surface-900">Your dashboard is clear</h3>
          <p className="mt-1 max-w-sm text-sm text-surface-600">All widgets are hidden. Restore your default layout to bring them back.</p>
          <Button
            variant="outline"
            className="mt-5 border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
            onClick={onReset}
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reset to default
          </Button>
        </div>
      )}
    </div>
  )
}