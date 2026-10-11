import { useState, useEffect, useCallback } from 'react'
import {
  Zap,
  Calendar,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plug,
  Unplug,
  ArrowRightLeft,
  Clock,
  Info,
  ExternalLink,
  AlertCircle,
  LogIn,
} from 'lucide-react'
import { useToast } from '@/app/providers/ToastProvider'
import { apiService, ConnectionStatus, SyncResult } from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Helpers ──────────────────────────────────────────────────

function formatTimestamp(ts: number | null): string {
  if (!ts) return 'Never'
  const d = new Date(ts * 1000)
  const now = Date.now()
  const diffMs = now - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}


// ── ConnectionsPage ──────────────────────────────────────────

export function ConnectionsPage() {
  const { showToast } = useToast()

  // Connection state — sourced from backend
  const [connections, setConnections] = useState<ConnectionStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Action state
  const [isToggling, setIsToggling] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState<string | null>(null)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)
  const [isStartingOAuth, setIsStartingOAuth] = useState(false)

  // Check for OAuth callback params in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      showToast('Google Calendar connected successfully!')
      window.history.replaceState({}, '', '/connections')
      fetchConnections()
    } else if (params.get('error')) {
      const err = params.get('error')
      showToast(`Connection failed: ${err === 'invalid_state' ? 'Invalid OAuth state' : err}`)
      window.history.replaceState({}, '', '/connections')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fetch connections ────────────────────────────────────

  const fetchConnections = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await apiService.getConnections()
      setConnections(data)
    } catch {
      setLoadError('Failed to load connections from the server.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  // ── Handlers ─────────────────────────────────────────────

  const handleConnect = async (conn: ConnectionStatus) => {
    if (conn.credentials_configured) {
      // Start real OAuth flow
      setIsStartingOAuth(true)
      try {
        const result = await apiService.startOAuth()
        if (result.demo_mode || !result.auth_url) {
          // Fallback to demo mode
          await handleDemoConnect(conn)
        } else {
          // Redirect to Google OAuth
          window.location.href = result.auth_url
        }
      } catch {
        showToast('Failed to start OAuth flow')
        await handleDemoConnect(conn)
      } finally {
        setIsStartingOAuth(false)
      }
    } else {
      await handleDemoConnect(conn)
    }
  }

  const handleDemoConnect = async (conn: ConnectionStatus) => {
    setIsToggling(conn.id)
    try {
      const updated = await apiService.toggleConnection(conn.id, 'connect')
      setConnections(prev => prev.map(c => (c.id === updated.id ? updated : c)))
      showToast(`${conn.provider} connected (demo mode)`)
    } catch {
      showToast(`Failed to connect ${conn.provider}`)
    } finally {
      setIsToggling(null)
    }
  }

  const handleDisconnect = async (conn: ConnectionStatus) => {
    setIsToggling(conn.id)
    setLastSyncResult(null)
    try {
      const updated = await apiService.toggleConnection(conn.id, 'disconnect')
      setConnections(prev => prev.map(c => (c.id === updated.id ? updated : c)))
      showToast(`${conn.provider} disconnected`)
    } catch {
      showToast(`Failed to disconnect ${conn.provider}`)
    } finally {
      setIsToggling(null)
    }
  }

  const handleSync = async (conn: ConnectionStatus) => {
    setIsSyncing(conn.id)
    setLastSyncResult(null)
    try {
      const result = await apiService.syncConnection(conn.id)
      setLastSyncResult(result)

      // Refresh connection data
      const updated = await apiService.getConnection(conn.id)
      setConnections(prev => prev.map(c => (c.id === updated.id ? updated : c)))

      showToast(result.message)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed'
      showToast(`Sync failed: ${message}`)
      await fetchConnections()
    } finally {
      setIsSyncing(null)
    }
  }


  // ── Loading / Error states ───────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col h-full mt-6 max-w-3xl mx-auto animate-slide-up">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-7 h-7 animate-spin text-brand-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-surface-700">Loading connections...</p>
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col h-full mt-6 max-w-3xl mx-auto animate-slide-up">
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-sm">
            <AlertCircle className="w-8 h-8 text-danger mx-auto mb-3" />
            <p className="text-sm font-semibold text-surface-900 mb-1">Could not load connections</p>
            <p className="text-xs text-surface-500 mb-4">{loadError}</p>
            <button onClick={fetchConnections} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-500">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        </div>
      </div>
    )
  }


  // ── Main render ──────────────────────────────────────────

  const googleConn = connections.find(c => c.id === 'google-calendar')

  return (
    <div className="flex flex-col h-full mt-6 max-w-3xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center text-white shadow-sm">
            <Zap className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900">Connections</h2>
            <p className="text-xs text-surface-500">Manage integrations and synchronization</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* ── Google Calendar Card ──────────────────────────── */}
        {googleConn && (
          <div className="bg-white rounded-2xl border border-surface-200 shadow-sm">
            {/* Compact header row */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Google Calendar icon */}
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shadow-sm',
                  googleConn.connected
                    ? 'bg-brand-50 text-brand-600'
                    : 'bg-surface-100 text-surface-400',
                )}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-surface-900">{googleConn.provider}</h3>
                    {googleConn.demo_mode && googleConn.connected && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest bg-warning/15 text-warning-dark border border-warning/25">
                        Demo Mode
                      </span>
                    )}
                  </div>
                  {/* Status line */}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs font-semibold',
                      googleConn.connected ? 'text-success' : 'text-surface-400',
                    )}>
                      {googleConn.connected ? (
                        <><CheckCircle2 className="w-3 h-3" /> Connected</>
                      ) : (
                        <><XCircle className="w-3 h-3" /> Disconnected</>
                      )}
                    </span>
                    {googleConn.connected && (
                      <>
                        <span className="text-surface-200">·</span>
                        <span className="text-[11px] text-surface-400 font-medium">{googleConn.event_count} event{googleConn.event_count !== 1 ? 's' : ''}</span>
                        <span className="text-surface-200">·</span>
                        <span className="text-[11px] text-surface-400 font-medium flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {formatTimestamp(googleConn.last_sync_at)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {googleConn.connected && (
                  <button
                    onClick={() => handleSync(googleConn)}
                    disabled={isSyncing === googleConn.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-surface-200 text-surface-600 hover:bg-surface-50 hover:text-surface-900 transition-all disabled:opacity-50"
                  >
                    {isSyncing === googleConn.id ? (
                      <><RefreshCw className="w-3 h-3 animate-spin" /> Syncing</>
                    ) : (
                      <><ArrowRightLeft className="w-3 h-3" /> Sync Now</>
                    )}
                  </button>
                )}

                <button
                  onClick={() => googleConn.connected ? handleDisconnect(googleConn) : handleConnect(googleConn)}
                  disabled={isToggling === googleConn.id || isStartingOAuth}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50',
                    googleConn.connected
                      ? 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50 hover:text-danger'
                      : 'bg-brand-600 text-white hover:bg-brand-500 shadow-sm',
                  )}
                >
                  {isToggling === googleConn.id || isStartingOAuth ? (
                    <><RefreshCw className="w-3 h-3 animate-spin" /> ...</>
                  ) : googleConn.connected ? (
                    <><Unplug className="w-3 h-3" /> Disconnect</>
                  ) : googleConn.credentials_configured ? (
                    <><LogIn className="w-3 h-3" /> Connect with Google</>
                  ) : (
                    <><Plug className="w-3 h-3" /> Connect</>
                  )}
                </button>
              </div>
            </div>

            {/* Sync error */}
            {googleConn.sync_error && (
              <div className="mx-4 mb-3 flex items-start gap-2 p-2.5 bg-danger/5 border border-danger/15 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
                <p className="text-xs text-danger font-medium">{googleConn.sync_error}</p>
              </div>
            )}

            {/* Sync result */}
            {lastSyncResult && (
              <div className={cn(
                'mx-4 mb-3 flex items-center gap-2 p-2.5 rounded-lg border',
                lastSyncResult.success
                  ? 'bg-success/5 border-success/15'
                  : 'bg-danger/5 border-danger/15'
              )}>
                {lastSyncResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-danger shrink-0" />
                )}
                <p className={cn('text-xs font-medium', lastSyncResult.success ? 'text-success' : 'text-danger')}>
                  {lastSyncResult.message}
                </p>
              </div>
            )}

            {/* Last sync result from backend (persistent) */}
            {!lastSyncResult && googleConn.last_sync_result && googleConn.connected && (
              <div className="mx-4 mb-3 flex items-center gap-2 p-2.5 bg-surface-50 rounded-lg border border-surface-100">
                <Info className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                <p className="text-xs text-surface-500 font-medium">{googleConn.last_sync_result}</p>
              </div>
            )}

            {/* Setup instructions when not configured */}
            {!googleConn.credentials_configured && !googleConn.connected && (
              <div className="mx-4 mb-4 p-3 bg-brand-50/50 border border-brand-100 rounded-xl">
                <div className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-brand-900 mb-1.5">Google Calendar credentials not configured</p>
                    <p className="text-[11px] text-brand-700 leading-relaxed mb-2">
                      Without credentials, the connection operates in <strong>demo mode</strong> — events are stored locally and sync is simulated.
                    </p>
                    <p className="text-[11px] text-brand-700 leading-relaxed">To connect a real Google Calendar:</p>
                    <ol className="text-[11px] text-brand-700 mt-1 space-y-0.5 list-decimal list-inside">
                      <li>Create a project in the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-900 inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-2 h-2" /></a></li>
                      <li>Enable the <strong>Google Calendar API</strong></li>
                      <li>Create <strong>OAuth 2.0</strong> credentials (Web application)</li>
                      <li>Add <code className="bg-brand-100/50 px-1 py-0.5 rounded text-[9px] font-mono">http://localhost:8001/api/connections/google-calendar/oauth/callback</code> as a redirect URI</li>
                      <li>Set <code className="bg-brand-100/50 px-1 py-0.5 rounded text-[9px] font-mono">GOOGLE_CLIENT_ID</code> and <code className="bg-brand-100/50 px-1 py-0.5 rounded text-[9px] font-mono">GOOGLE_CLIENT_SECRET</code> environment variables</li>
                      <li>Restart the backend server</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Future Integrations ─────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { id: 'outlook', name: 'Outlook Calendar', desc: 'Microsoft scheduling' },
            { id: 'notion', name: 'Notion', desc: 'Tasks & notes sync' },
            { id: 'slack', name: 'Slack', desc: 'Status & notifications' },
          ].map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-surface-200 p-3 opacity-50">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-surface-100 text-surface-300 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-surface-500">{item.name}</span>
              </div>
              <p className="text-[10px] text-surface-400">{item.desc}</p>
              <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-100 text-surface-400 uppercase tracking-wider">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}