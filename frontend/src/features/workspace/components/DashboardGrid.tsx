import { DashboardPlan } from '@/lib/api'
import { WidgetRenderer } from './WidgetRenderer'
import { Skeleton } from '@/components/ui/Skeleton'

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
  onScheduleMeeting?: (req: any) => Promise<void>
}

export function DashboardGrid({ plan, isLoading, pinnedIds, hiddenIds, onTogglePin, onHide, onMoveUp, onMoveDown, onResize, onScheduleMeeting }: DashboardGridProps) {
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
          onScheduleMeeting={onScheduleMeeting}
        />
      ))}
      {visibleWidgets.length === 0 && (
        <div className="col-span-full py-12 text-center text-surface-500 border-2 border-dashed border-surface-200 rounded-2xl">
          All widgets are hidden. Use the "Reset to default" button to bring them back.
        </div>
      )}
    </div>
  )
}
