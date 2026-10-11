import { useState } from 'react'
import { Share2, Link2, Copy, Check, X, Globe, Eye, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { apiService, DashboardPlan } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ShareDashboardModalProps {
  isOpen: boolean
  onClose: () => void
  plan: DashboardPlan
  roleName: string
}

export function ShareDashboardModal({ isOpen, onClose, plan, roleName }: ShareDashboardModalProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [shareResult, setShareResult] = useState<{
    token: string
    share_url: string
    created_at: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleShare = async () => {
    setIsSharing(true)
    setError(null)
    try {
      const result = await apiService.createSharedDashboard({
        role_id: plan.role,
        role_name: roleName,
        title: plan.title,
        explanation: plan.explanation,
        theme: plan.theme,
        widgets: plan.widgets,
      })
      setShareResult(result)
    } catch (err) {
      setError('Failed to create share link. Please try again.')
    } finally {
      setIsSharing(false)
    }
  }

  const getFullUrl = () => {
    if (!shareResult) return ''
    return `${window.location.origin}${shareResult.share_url}`
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getFullUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = getFullUrl()
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleClose = () => {
    setShareResult(null)
    setCopied(false)
    setError(null)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl border border-surface-200 w-full max-w-lg pointer-events-auto animate-slide-up overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Share Dashboard</h2>
                  <p className="text-sm text-white/70">Create a view-only link for others</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Decorative gradient orbs */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-indigo-400/20 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">

            {/* Dashboard preview info */}
            <div className="flex items-start gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-100 to-violet-100 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-brand-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-surface-900 text-sm truncate">{plan.title}</h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  {plan.widgets.length} widget{plan.widgets.length !== 1 ? 's' : ''} • {roleName}
                </p>
                <p className="text-xs text-surface-400 mt-1 leading-relaxed line-clamp-2">
                  {plan.explanation || 'Your personalized dashboard snapshot will be shared as a read-only view.'}
                </p>
              </div>
            </div>

            {/* What gets shared */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wider">What's included</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'All visible widgets', icon: '📊' },
                  { label: 'Charts & metrics', icon: '📈' },
                  { label: 'Layout & theme', icon: '🎨' },
                  { label: 'View-only access', icon: '👁️' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 px-3 py-2 bg-surface-50 rounded-lg text-xs font-medium text-surface-700">
                    <span className="text-sm">{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            {/* Share result */}
            {shareResult ? (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-semibold text-emerald-700">Share link created successfully!</span>
                </div>

                {/* Link box */}
                <div className="flex items-center gap-2 p-1 bg-surface-100 rounded-xl border border-surface-200">
                  <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2">
                    <Link2 className="w-4 h-4 text-surface-400 shrink-0" />
                    <span className="text-sm font-mono text-surface-700 truncate">{getFullUrl()}</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCopy}
                    className={cn(
                      "shrink-0 gap-1.5 px-4 transition-all",
                      copied && "bg-emerald-600 hover:bg-emerald-500"
                    )}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>

                {/* Open link */}
                <a
                  href={getFullUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open shared dashboard
                </a>

                <p className="text-xs text-surface-400 text-center flex items-center justify-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  Anyone with this link can view the dashboard
                </p>
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20"
                onClick={handleShare}
                disabled={isSharing}
              >
                {isSharing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating link…
                  </>
                ) : (
                  <>
                    <Link2 className="w-5 h-5" />
                    Generate Share Link
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}