import { Star, Clock, MoreVertical, Search, Check, ChevronDown, RefreshCw, Mail, MailOpen, ArrowLeft, Paperclip, AlertCircle, Plug, ChevronRight, Eye, EyeOff, Inbox, X } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { apiService, GmailMessage, GmailConnection } from '@/lib/api'
import { useToast } from '@/app/providers/ToastProvider'


// ── Helpers ──────────────────────────────────────────────────

function formatEmailDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHours < 24) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}


// ── Email Detail Panel ───────────────────────────────────────

function EmailDetail({
  message,
  onClose,
  onToggleRead,
  onToggleStar,
}: {
  message: GmailMessage
  onClose: () => void
  onToggleRead: (id: string, unread: boolean) => void
  onToggleStar: (id: string, starred: boolean) => void
}) {
  const [fullMessage, setFullMessage] = useState<GmailMessage | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    apiService.getGmailMessage(message.id)
      .then(msg => { if (!cancelled) setFullMessage(msg) })
      .catch(() => { if (!cancelled) setFullMessage(message) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [message.id])

  // Auto-mark as read
  useEffect(() => {
    if (message.unread) {
      onToggleRead(message.id, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id])

  const displayMsg = fullMessage || message

  return (
    <div className="flex flex-col h-full animate-slide-up">
      {/* Detail Header */}
      <div className="flex items-center gap-3 p-4 border-b border-surface-200 bg-surface-50">
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-surface-200 rounded-lg transition-colors text-surface-500 hover:text-surface-900"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-surface-900 truncate">{displayMsg.subject}</h3>
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <span className="font-semibold">{displayMsg.sender}</span>
            {displayMsg.senderEmail && (
              <span className="text-surface-400">&lt;{displayMsg.senderEmail}&gt;</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleStar(displayMsg.id, displayMsg.starred)}
            className={cn("p-1.5 rounded-lg transition-colors", displayMsg.starred ? "text-warning" : "text-surface-300 hover:text-warning")}
          >
            <Star className="w-4 h-4" fill={displayMsg.starred ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => onToggleRead(displayMsg.id, !displayMsg.unread)}
            className="p-1.5 text-surface-400 hover:text-surface-900 rounded-lg hover:bg-surface-200 transition-colors"
            title={displayMsg.unread ? "Mark as read" : "Mark as unread"}
          >
            {displayMsg.unread ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Meta bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-surface-100 text-xs text-surface-500">
        <span>{formatEmailDate(displayMsg.date)}</span>
        {displayMsg.hasAttachments && (
          <span className="inline-flex items-center gap-1 text-surface-400">
            <Paperclip className="w-3 h-3" /> Attachment
          </span>
        )}
        {displayMsg.category === 'other' && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-surface-100 text-surface-400">Other</span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 animate-spin text-brand-500" />
          </div>
        ) : displayMsg.body_html ? (
          <div
            className="prose prose-sm max-w-none text-surface-800"
            dangerouslySetInnerHTML={{ __html: displayMsg.body_html }}
          />
        ) : displayMsg.body_text ? (
          <pre className="whitespace-pre-wrap text-sm text-surface-800 font-sans leading-relaxed">
            {displayMsg.body_text}
          </pre>
        ) : (
          <p className="text-sm text-surface-500 italic">No content available.</p>
        )}
      </div>
    </div>
  )
}


// ── Main InboxPage ───────────────────────────────────────────

export function InboxPage() {
  const { showToast } = useToast()

  // State
  const [activeTab, setActiveTab] = useState<'focused' | 'other'>('focused')
  const [searchQuery, setSearchQuery] = useState('')
  const [messages, setMessages] = useState<GmailMessage[]>([])
  const [connection, setConnection] = useState<GmailConnection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(true)

  // Search debounce
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)


  // ── Fetch Messages ─────────────────────────────────────────

  const fetchMessages = useCallback(async (query?: string, category?: string) => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const result = await apiService.getGmailMessages({
        q: query || undefined,
        category: category || undefined,
        max_results: 25,
      })
      setMessages(result.messages)
      setNextPageToken(result.nextPageToken)
      setIsDemoMode(result.demo_mode)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load messages'
      if (msg.includes('401') || msg.includes('revoked')) {
        setLoadError('Gmail access was revoked. Please reconnect.')
      } else {
        setLoadError(msg)
      }
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }, [])


  const loadMore = async () => {
    if (!nextPageToken || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const result = await apiService.getGmailMessages({
        q: searchQuery || undefined,
        category: activeTab,
        page_token: nextPageToken,
        max_results: 25,
      })
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMsgs = result.messages.filter(m => !existingIds.has(m.id))
        return [...prev, ...newMsgs]
      })
      setNextPageToken(result.nextPageToken)
    } catch {
      showToast('Failed to load more messages')
    } finally {
      setIsLoadingMore(false)
    }
  }


  // ── Fetch Connection ───────────────────────────────────────

  const fetchConnection = useCallback(async () => {
    try {
      const conn = await apiService.getGmailConnection()
      setConnection(conn)
      return conn
    } catch {
      return null
    }
  }, [])


  // ── Init ───────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const conn = await fetchConnection()
      if (conn?.connected) {
        await fetchMessages('', activeTab)
      } else {
        setIsLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // ── Auto-refresh via polling (30s) ─────────────────────────

  useEffect(() => {
    if (!connection?.connected) return

    pollTimerRef.current = setInterval(async () => {
      try {
        const status = await apiService.checkGmailUpdates()
        if (status.hasUpdates) {
          await fetchMessages(searchQuery || '', activeTab)
          if (connection) {
            setConnection(prev => prev ? { ...prev, unread_count: status.unreadCount } : prev)
          }
        }
      } catch { /* ignore poll errors */ }
    }, 30000)

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [connection?.connected, searchQuery, activeTab, fetchMessages, connection])


  // ── Tab change ─────────────────────────────────────────────

  useEffect(() => {
    if (connection?.connected) {
      fetchMessages(searchQuery || '', activeTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])


  // ── Search ─────────────────────────────────────────────────

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      if (connection?.connected) {
        fetchMessages(val, activeTab)
      }
    }, 400)
  }


  // ── Handlers ───────────────────────────────────────────────

  const handleRefresh = async () => {
    setIsSyncing(true)
    try {
      const result = await apiService.syncGmail()
      showToast(result.message)
      await fetchMessages(searchQuery || '', activeTab)
      await fetchConnection()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed'
      showToast(`Sync failed: ${msg}`)
    } finally {
      setIsSyncing(false)
    }
  }


  const handleToggleStar = async (id: string, currentlyStarred: boolean) => {
    const action = currentlyStarred ? 'unstar' : 'star'
    try {
      const updated = await apiService.modifyGmailMessage(id, action)
      setMessages(prev => prev.map(m => m.id === id ? { ...m, starred: updated.starred } : m))
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, starred: updated.starred } : prev)
      }
    } catch {
      showToast('Failed to update star status')
    }
  }


  const handleToggleRead = async (id: string, currentlyUnread: boolean) => {
    const action = currentlyUnread ? 'read' : 'unread'
    try {
      const updated = await apiService.modifyGmailMessage(id, action)
      setMessages(prev => prev.map(m => m.id === id ? { ...m, unread: updated.unread } : m))
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, unread: updated.unread } : prev)
      }
      setConnection(prev => {
        if (!prev) return prev
        const delta = action === 'read' ? -1 : 1
        return { ...prev, unread_count: Math.max(0, prev.unread_count + delta) }
      })
    } catch {
      showToast('Failed to update read status')
    }
  }


  const handleConnect = async () => {
    try {
      const conn = await fetchConnection()
      if (conn?.credentials_configured) {
        const result = await apiService.startGmailOAuth()
        if (result.demo_mode || !result.auth_url) {
          await handleDemoConnect()
        } else {
          window.location.href = result.auth_url
        }
      } else {
        await handleDemoConnect()
      }
    } catch {
      showToast('Failed to start Gmail connection')
    }
  }

  const handleDemoConnect = async () => {
    try {
      const conn = await apiService.connectGmailDemo()
      setConnection(conn)
      showToast('Gmail connected (demo mode)')
      await fetchMessages('', activeTab)
    } catch {
      showToast('Failed to connect Gmail')
    }
  }

  const handleDisconnect = async () => {
    try {
      const conn = await apiService.disconnectGmail()
      setConnection(conn)
      setMessages([])
      setSelectedMessage(null)
      showToast('Gmail disconnected')
    } catch {
      showToast('Failed to disconnect Gmail')
    }
  }


  // ── Filter messages by tab ────────────────────────────────

  const filteredMessages = messages.filter(m =>
    activeTab === 'focused' ? m.category === 'focused' : m.category === 'other'
  )

  const unreadCount = connection?.unread_count || messages.filter(m => m.unread).length


  // ── Disconnected state ─────────────────────────────────────

  if (!connection?.connected && !isLoading) {
    return (
      <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden animate-slide-up mt-6 max-w-5xl mx-auto">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-brand-500" />
            </div>
            <h3 className="text-lg font-bold text-surface-900 mb-2">Connect your Gmail</h3>
            <p className="text-sm text-surface-500 mb-6 leading-relaxed">
              Connect your Gmail account to see your real emails here, or try demo mode to explore the interface.
            </p>
            {connection?.sync_error && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-danger/5 border border-danger/15 rounded-xl text-left">
                <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <p className="text-xs text-danger font-medium">{connection.sync_error}</p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleConnect}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-600 text-white hover:bg-brand-500 shadow-sm transition-all"
              >
                <Plug className="w-4 h-4" />
                {connection?.credentials_configured ? 'Connect with Google' : 'Connect Gmail (Demo)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }


  // ── Detail View ────────────────────────────────────────────

  if (selectedMessage) {
    return (
      <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden animate-slide-up mt-6 max-w-5xl mx-auto">
        <EmailDetail
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
          onToggleRead={handleToggleRead}
          onToggleStar={handleToggleStar}
        />
      </div>
    )
  }


  // ── Main Inbox View ────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden animate-slide-up mt-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-200 bg-surface-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-surface-900">Inbox</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-600 text-white min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex bg-surface-200 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('focused')}
              className={cn("px-4 py-1.5 text-sm font-semibold rounded-md transition-colors", activeTab === 'focused' ? "bg-white text-surface-900 shadow-sm" : "text-surface-600 hover:text-surface-900")}
            >
              Focused
            </button>
            <button
              onClick={() => setActiveTab('other')}
              className={cn("px-4 py-1.5 text-sm font-semibold rounded-md transition-colors", activeTab === 'other' ? "bg-white text-surface-900 shadow-sm" : "text-surface-600 hover:text-surface-900")}
            >
              Other
            </button>
          </div>
          {isDemoMode && connection?.connected && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest bg-warning/15 text-warning-dark border border-warning/25">
              Demo
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search mail..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); fetchMessages('', activeTab) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-3 border-b border-surface-200 text-surface-500">
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-surface-100 rounded-md transition-colors"><Check className="w-4 h-4" /></button>
          <button className="p-1.5 hover:bg-surface-100 rounded-md transition-colors"><Clock className="w-4 h-4" /></button>
          <div className="h-4 w-px bg-surface-200 mx-2" />
          <button className="flex items-center gap-1 text-sm font-medium px-2 py-1.5 hover:bg-surface-100 rounded-md transition-colors">
            Filter <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
            {isSyncing ? 'Syncing...' : 'Refresh'}
          </button>
          {connection?.connected && (
            <button
              onClick={handleDisconnect}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-surface-400 hover:text-danger hover:bg-danger/5 transition-colors"
              title="Disconnect Gmail"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {loadError && (
        <div className="mx-4 mt-3 flex items-start gap-2 p-3 bg-danger/5 border border-danger/15 rounded-lg">
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-danger font-medium">{loadError}</p>
          </div>
          <button
            onClick={() => fetchMessages(searchQuery, activeTab)}
            className="text-xs font-semibold text-danger hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-surface-700">Loading inbox...</p>
          </div>
        </div>
      ) : filteredMessages.length === 0 ? (
        /* Empty state */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <Inbox className="w-10 h-10 text-surface-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-surface-700 mb-1">
              {searchQuery ? 'No results found' : `No ${activeTab} emails`}
            </p>
            <p className="text-xs text-surface-500">
              {searchQuery ? 'Try a different search query.' : 'Emails will appear here when they arrive.'}
            </p>
          </div>
        </div>
      ) : (
        /* Email List */
        <div className="flex-1 overflow-y-auto">
          {filteredMessages.map((email) => (
            <div
              key={email.id}
              onClick={() => setSelectedMessage(email)}
              className={cn(
                "flex items-start gap-4 p-4 border-b border-surface-100 hover:bg-surface-50 cursor-pointer transition-colors group",
                email.unread ? "bg-brand-50/20" : ""
              )}
            >
              <div className="pt-1 flex flex-col gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleRead(email.id, email.unread) }}
                  className="text-surface-300 hover:text-surface-500"
                  title={email.unread ? 'Mark as read' : 'Mark as unread'}
                >
                  {email.unread ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleStar(email.id, email.starred) }}
                  className={cn(email.starred ? "text-warning" : "text-surface-300 hover:text-warning")}
                >
                  <Star className="w-4 h-4" fill={email.starred ? "currentColor" : "none"} />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("text-sm truncate", email.unread ? "font-bold text-surface-900" : "font-semibold text-surface-700")}>
                      {email.sender}
                    </span>
                    {email.hasAttachments && (
                      <Paperclip className="w-3 h-3 text-surface-400 shrink-0" />
                    )}
                  </div>
                  <span className={cn("text-xs whitespace-nowrap ml-4", email.unread ? "font-bold text-brand-600" : "text-surface-500")}>
                    {formatEmailDate(email.date)}
                  </span>
                </div>
                <div className={cn("text-sm mb-1 truncate", email.unread ? "font-bold text-surface-900" : "font-medium text-surface-800")}>
                  {email.subject}
                </div>
                <div className="text-sm text-surface-500 line-clamp-1">{email.snippet}</div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleRead(email.id, email.unread) }}
                  className="p-1.5 text-surface-400 hover:text-surface-900 rounded-md hover:bg-surface-200"
                  title={email.unread ? 'Mark as read' : 'Mark as unread'}
                >
                  {email.unread ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-surface-400 hover:text-surface-900 rounded-md hover:bg-surface-200"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Load More */}
          {nextPageToken && (
            <div className="p-4 text-center">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Loading...</>
                ) : (
                  <><ChevronRight className="w-4 h-4" /> Load more</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Connected account footer */}
      {connection?.email_address && !isDemoMode && (
        <div className="px-4 py-2 border-t border-surface-100 bg-surface-50">
          <p className="text-[11px] text-surface-400 font-medium">
            Connected as <span className="text-surface-600">{connection.email_address}</span>
          </p>
        </div>
      )}
    </div>
  )
}