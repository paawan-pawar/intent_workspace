import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Share2, Eye, Clock, ArrowLeft, Loader2, AlertCircle, Globe } from 'lucide-react'
import { apiService, WidgetModel } from '@/lib/api'
import { WidgetRenderer } from '@/features/workspace/components/WidgetRenderer'
import { Button } from '@/components/ui/Button'
import { IntentLogo } from '@/features/auth/components/IntentLogo'

interface SharedDashboardData {
  token: string
  title: string
  role_name: string
  explanation?: string
  theme?: string
  widgets: WidgetModel[]
  shared_by: string
  created_at: string
  view_count: number
}

export function SharedDashboardPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<SharedDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setIsLoading(true)
    apiService.getSharedDashboard(token)
      .then(result => {
        setData(result)
        document.title = `${result.title} — Shared Dashboard | Intent Workspace`
      })
      .catch(() => {
        setError('This shared dashboard was not found or the link has expired.')
      })
      .finally(() => setIsLoading(false))

    return () => { document.title = 'Intent Workspace' }
  }, [token])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
          <p className="text-surface-500 font-semibold">Loading shared dashboard…</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Dashboard Not Found</h1>
          <p className="text-surface-600 leading-relaxed">{error || 'This shared dashboard link is invalid.'}</p>
          <Button variant="primary" size="lg" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-5 h-5" /> Go to Home
          </Button>
        </div>
      </div>
    )
  }

  const formattedDate = new Date(data.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const sortedWidgets = [...data.widgets].sort((a, b) => a.order - b.order)

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Top banner */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-white/70" />
            <span className="text-sm font-medium text-white/80">
              Shared Dashboard — View only
            </span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <IntentLogo size="sm" />
            <span className="hidden sm:inline">Open Intent Workspace</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-surface-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 md:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-5 h-5 text-violet-600" />
                </div>
                <h1 className="text-2xl font-bold text-surface-900">{data.title}</h1>
                <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 border border-violet-200">
                  {data.role_name}
                </span>
              </div>
              {data.explanation && (
                <p className="text-surface-600 text-sm max-w-2xl leading-relaxed">{data.explanation}</p>
              )}
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 rounded-lg border border-surface-200">
                <Share2 className="w-3.5 h-3.5" />
                <span>Shared by <strong className="text-surface-700">{data.shared_by}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 rounded-lg border border-surface-200">
                <Clock className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 rounded-lg border border-surface-200">
                <Eye className="w-3.5 h-3.5" />
                <span>{data.view_count} view{data.view_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className="max-w-screen-2xl mx-auto px-6 md:px-8 py-8">
        {sortedWidgets.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-surface-300 bg-white px-6 py-16 text-center">
            <LayoutDashboard className="w-12 h-12 text-surface-300 mb-4" />
            <h3 className="text-lg font-bold text-surface-700">No widgets in this dashboard</h3>
            <p className="text-surface-500 mt-1">The shared dashboard snapshot is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-min">
            {sortedWidgets.map(widget => (
              <WidgetRenderer
                key={widget.id}
                widget={widget}
                isPinned={false}
                onTogglePin={() => {}}
                onHide={() => {}}
                onMoveUp={() => {}}
                onMoveDown={() => {}}
                onResize={() => {}}
                onRemoveSheetWidget={() => {}}
                theme={data.theme}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-surface-400 border-t border-surface-200 bg-white/50">
        <p>Intent Workspace — Shared Dashboard View</p>
      </footer>
    </div>
  )
}