import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, LayoutDashboard, RefreshCw, Undo2, HelpCircle, Save, ChevronDown, List, Calendar, Mail, FileText, CheckSquare, Zap, Clock, CalendarPlus, User, Sparkles, Table2, Target } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@/app/providers/UserProvider'
import { useToast } from '@/app/providers/ToastProvider'
import { apiService, DashboardPlan, ScheduleMeetingRequest, Preferences, WidgetModel } from '@/lib/api'
import { DashboardGrid } from '@/features/workspace/components/DashboardGrid'
import { PromptComposer } from '@/features/workspace/components/PromptComposer'
import { CommandPalette } from '@/features/workspace/components/CommandPalette'
import { Button } from '@/components/ui/Button'
import { InboxPage } from '@/features/workspace/pages/InboxPage'
import { CalendarPage } from '@/features/workspace/pages/CalendarPage'
import { MeetingsPage } from '@/features/workspace/pages/MeetingsPage'
import { TasksPage } from '@/features/workspace/pages/TasksPage'
import { NotesPage } from '@/features/workspace/pages/NotesPage'
import { ConnectionsPage } from '@/features/workspace/pages/ConnectionsPage'
import { SheetsPage } from '@/features/workspace/pages/SheetsPage'
import { GoalsPage } from '@/features/workspace/pages/GoalsPage'
import type { SheetRecord } from '@/lib/sheets'
import { cn } from '@/lib/utils'

export function WorkspacePage() {
  const { role, setRole, clearRole } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const isDashboard = !['/inbox', '/calendar', '/meetings', '/sheets', '/goals', '/tasks', '/notes', '/connections'].includes(location.pathname)
  const isSheetsPage = location.pathname === '/sheets'

  useEffect(() => {
    if (!role) navigate('/onboarding')
  }, [role, navigate])

  useEffect(() => {
    document.title = isDashboard ? 'Your Dashboard | Intent Workspace' : isSheetsPage ? 'Sheets | Intent Workspace' : location.pathname === '/goals' ? 'Goals | Intent Workspace' : 'Intent Workspace'
    return () => { document.title = 'Intent Workspace' }
  }, [isDashboard, isSheetsPage, location.pathname])

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiService.getRoles(),
  })

  const { data: sheets = [] } = useQuery({
    queryKey: ['sheets'],
    queryFn: () => apiService.getSheets(),
  })

  const { data: initialPlan, isLoading: planLoading, isError: planError, refetch: refetchPlan } = useQuery({
    queryKey: ['dashboard', role?.id],
    queryFn: () => apiService.getDashboard(role!.id),
    enabled: !!role,
    retry: 1
  })

  const { data: initialPrefs, isLoading: prefsLoading } = useQuery({
    queryKey: ['preferences', role?.id],
    queryFn: () => apiService.getPreferences(role!.id),
    enabled: !!role
  })

  const [currentPlan, setCurrentPlan] = useState<DashboardPlan | null>(null)
  const [planHistory, setPlanHistory] = useState<DashboardPlan[]>([])
  
  const [prefs, setPrefs] = useState<Preferences>({
    pinned_ids: [], hidden_ids: [], widget_order: {}, widget_spans: {}, saved_layouts: {}
  })

  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [selectedSheetId, setSelectedSheetId] = useState('')

  const handleDashboardSheetUpload = async (file: File) => {
    const extension = file.name.toLowerCase().split('.').pop() ?? ''
    if (!['xlsx', 'xls', 'csv'].includes(extension)) {
      showToast('Choose an .xlsx, .xls, or .csv file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be 10 MB or less.')
      return
    }

    try {
      const { parseSheetFile } = await import('@/features/workspace/sheets/parseSheetFile')
      const parsed = parseSheetFile(file.name, await file.arrayBuffer())
      const saved = await apiService.createSheet({
        name: parsed.name,
        source: extension === 'csv' ? 'csv_upload' : 'excel_upload',
        file_name: file.name,
        file_size: file.size,
        row_count: parsed.rows.length,
        column_count: parsed.columns.length,
        columns: parsed.columns,
        rows: parsed.rows,
      })
      queryClient.setQueryData<SheetRecord[]>(['sheets'], current => [saved, ...(current ?? []).filter(sheet => sheet.id !== saved.id)])
      setSelectedSheetId(saved.id)
      showToast(`${saved.name} is ready. Describe the dashboard you want.`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'The sheet could not be uploaded.')
    }
  }

  useEffect(() => {
    if (initialPlan && initialPrefs) {
      const hydratedWidgets = initialPlan.widgets.map(w => ({
        ...w,
        span: initialPrefs.widget_spans[w.id] || w.span,
        order: initialPrefs.widget_order[w.id] || w.order
      }))
      setCurrentPlan({ ...initialPlan, widgets: hydratedWidgets })
      setPrefs(initialPrefs)
      setPlanHistory([])
    }
  }, [initialPlan, initialPrefs, role?.id])

  const syncPrefs = async (newPrefs: Preferences, showMsg?: string) => {
    setPrefs(newPrefs)
    if (!role) return
    try {
      await apiService.putPreferences(role.id, newPrefs)
      if (showMsg) showToast(showMsg)
    } catch (e) {
      showToast("Failed to save preferences.")
    }
  }

  // --- Handlers ---
  const togglePin = (id: string) => {
    const pinned = new Set(prefs.pinned_ids)
    if (pinned.has(id)) { pinned.delete(id); syncPrefs({ ...prefs, pinned_ids: Array.from(pinned) }, "Widget unpinned") } 
    else { pinned.add(id); syncPrefs({ ...prefs, pinned_ids: Array.from(pinned) }, "Widget pinned") }
  }

  const hideWidget = (id: string) => {
    const hidden = new Set(prefs.hidden_ids)
    hidden.add(id)
    syncPrefs({ ...prefs, hidden_ids: Array.from(hidden) }, "Widget hidden")
  }

  const handleMoveUp = (id: string) => {
    if (!currentPlan) return
    const newOrder = { ...prefs.widget_order }
    const ordered = [...currentPlan.widgets].sort((a, b) => (newOrder[a.id] || a.order) - (newOrder[b.id] || b.order))
    const idx = ordered.findIndex(w => w.id === id)
    if (idx > 0) {
      const prev = ordered[idx-1]
      const curr = ordered[idx]
      if (!prev || !curr) return
      const currentVal = newOrder[id] ?? curr.order
      const prevVal = newOrder[prev.id] ?? prev.order
      newOrder[id] = prevVal
      newOrder[prev.id] = currentVal
      const newWidgets = currentPlan.widgets.map(w => 
        w.id === id ? { ...w, order: prevVal } : w.id === prev.id ? { ...w, order: currentVal } : w
      )
      setCurrentPlan({ ...currentPlan, widgets: newWidgets })
      syncPrefs({ ...prefs, widget_order: newOrder })
    }
  }

  const handleMoveDown = (id: string) => {
    if (!currentPlan) return
    const newOrder = { ...prefs.widget_order }
    const ordered = [...currentPlan.widgets].sort((a, b) => (newOrder[a.id] || a.order) - (newOrder[b.id] || b.order))
    const idx = ordered.findIndex(w => w.id === id)
    if (idx < ordered.length - 1) {
      const curr = ordered[idx]
      const next = ordered[idx+1]
      if (!curr || !next) return
      const currentVal = newOrder[id] ?? curr.order
      const nextVal = newOrder[next.id] ?? next.order
      newOrder[id] = nextVal
      newOrder[next.id] = currentVal
      const newWidgets = currentPlan.widgets.map(w => 
        w.id === id ? { ...w, order: nextVal } : w.id === next.id ? { ...w, order: currentVal } : w
      )
      setCurrentPlan({ ...currentPlan, widgets: newWidgets })
      syncPrefs({ ...prefs, widget_order: newOrder })
    }
  }

  const handleResize = (id: string) => {
    if (!currentPlan) return
    const w = currentPlan.widgets.find(x => x.id === id)
    if (!w) return
    const newSpan = w.span >= 3 ? 1 : w.span + 1
    const newWidgets = currentPlan.widgets.map(x => x.id === id ? { ...x, span: newSpan } : x)
    setCurrentPlan({ ...currentPlan, widgets: newWidgets })
    syncPrefs({ ...prefs, widget_spans: { ...prefs.widget_spans, [id]: newSpan } })
  }

  const resetFilters = () => {
    if (!initialPlan) return
    setCurrentPlan(initialPlan)
    syncPrefs({ ...prefs, pinned_ids: [], hidden_ids: [], widget_order: {}, widget_spans: {} }, "Dashboard reset to default")
  }

  const saveLayout = () => {
    if (!currentPlan) return
    const layoutName = prompt("Name this layout (e.g., 'Daily review')")
    if (layoutName) {
      syncPrefs({ ...prefs, saved_layouts: { ...prefs.saved_layouts, [layoutName]: currentPlan } }, `Layout '${layoutName}' saved`)
    }
  }

  const handlePromptSubmit = async (prompt: string) => {
    if (!currentPlan || !role) return
    setIsAiLoading(true)
    setAiError(null)
    try {
      const selectedSheet = sheets.find(sheet => sheet.id === selectedSheetId)
      if (selectedSheet) {
        const analysis = await apiService.analyzeSheet(selectedSheet.id, { role: role.id, intent: prompt })
        const result = await apiService.addSheetToDashboard(selectedSheet.id, role.id)
        const sheetPlan = analysis.dashboard_plan
        setPlanHistory(prev => [...prev, currentPlan])
        syncPrefs({ ...prefs, hidden_ids: [] })
        setCurrentPlan({
          ...currentPlan,
          title: sheetPlan?.title ?? `${selectedSheet.name} insights`,
          explanation: sheetPlan?.explanation ?? `Generated an interactive dashboard from ${selectedSheet.name}.`,
          clarificationQuestion: sheetPlan?.clarificationQuestion ?? null,
          theme: sheetPlan?.theme ?? analysis.theme,
          widgets: result.widgets,
        })
        showToast(`Dashboard generated from ${selectedSheet.name}`)
        return
      }

      const updatedPlan = await apiService.postPrompt({
        prompt, role: role.id, currentWidgets: currentPlan.widgets,
        pinnedIds: prefs.pinned_ids, hiddenIds: prefs.hidden_ids
      })
      setPlanHistory(prev => [...prev, currentPlan])
      syncPrefs({ ...prefs, hidden_ids: [] }) 
      setCurrentPlan(updatedPlan)
    } catch (err) {
      setAiError("Failed to update workspace. Please try again.")
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleScheduleMeeting = async (details: Omit<ScheduleMeetingRequest, 'currentPlan'>) => {
    if (!currentPlan) return
    setIsAiLoading(true)
    try {
      const updatedPlan = await apiService.postScheduleMeeting({ ...details, currentPlan })
      setPlanHistory(prev => [...prev, currentPlan])
      setCurrentPlan(updatedPlan)
      showToast("Meeting scheduled successfully")
    } catch (err) {
      showToast("Failed to schedule meeting.")
    } finally {
      setIsAiLoading(false)
    }
  }

  const addSheetToDashboard = async (sheet: SheetRecord) => {
    if (!currentPlan) {
      showToast('Dashboard data is not ready yet. Try again shortly.')
      return
    }

    if (!role) return

    try {
      const result = await apiService.addSheetToDashboard(sheet.id, role.id)
      const existingIds = new Set(currentPlan.widgets.map(widget => widget.id))
      const additions = result.widgets.filter(widget => !existingIds.has(widget.id))
      if (additions.length === 0) {
        showToast('Insights from this sheet are already on your dashboard.')
        return
      }
      const nextOrder = Math.max(0, ...currentPlan.widgets.map(item => item.order)) + 1
      const widgets: WidgetModel[] = additions.map((widget, index) => ({
        ...widget,
        order: nextOrder + index,
      }))
      setPlanHistory(history => [...history, currentPlan])
      setCurrentPlan({ ...currentPlan, widgets: [...currentPlan.widgets, ...widgets] })
      showToast(result.aiInsightsAvailable
        ? 'Sheet insights added to dashboard. Use Undo to revert.'
        : 'Calculated sheet widgets added; AI insights were unavailable. Use Undo to revert.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Sheet could not be added to the dashboard.')
    }
  }

  const removeSheetWidgetFromDashboard = (widgetId: string) => {
    if (!currentPlan || !widgetId.startsWith('sheet-')) return
    setPlanHistory(history => [...history, currentPlan])
    setCurrentPlan({
      ...currentPlan,
      widgets: currentPlan.widgets.filter(widget => widget.id !== widgetId),
    })
    showToast('Sheet widget removed. Use Undo to restore it.')
  }

  if (!role) return null

  const mainNav = [
    { label: "Your Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, path: '/your-dashboard' },
    { label: "Inbox", icon: <Mail className="w-4 h-4" /> },
    { label: "Calendar", icon: <Calendar className="w-4 h-4" /> },
    { label: "Meetings", icon: <Clock className="w-4 h-4" /> },
    { label: "Sheets", icon: <Table2 className="w-4 h-4" /> },
    { label: "Goals", icon: <Target className="w-4 h-4" /> },
    { label: "Notes", icon: <FileText className="w-4 h-4" /> },
    { label: "Tasks", icon: <CheckSquare className="w-4 h-4" /> }
  ]

  return (
    <div className="flex h-screen bg-surface-100 overflow-hidden font-sans">
      <CommandPalette onPromptSubmit={handlePromptSubmit} />
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-surface-200 flex flex-col z-20 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-surface-200">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm mr-3">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-surface-900 tracking-tight text-lg">Intent</h1>
        </div>
        
        <div className="flex-1 py-4 overflow-y-auto">
          <nav className="px-3 space-y-0.5 mb-8">
            {mainNav.map(nav => {
              const navPath = nav.path || `/${nav.label.toLowerCase()}`
              const isActive = location.pathname === navPath || (location.pathname === '/workspace' && nav.label === 'Your Dashboard')
              return (
                <button key={nav.label} onClick={() => navigate(navPath)} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors", isActive ? "bg-brand-50 text-brand-700" : "text-surface-600 hover:bg-surface-50 hover:text-surface-900")}>
                  {nav.icon} {nav.label}
                </button>
              )
            })}
            <button onClick={() => navigate('/connections')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors", location.pathname === '/connections' ? "bg-brand-50 text-brand-700" : "text-surface-600 hover:bg-surface-50 hover:text-surface-900")}>
              <Zap className="w-4 h-4" /> Connections
            </button>
          </nav>

          <div className="px-6 mb-4">
            <h2 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2">Switch Role (Demo)</h2>
            <div className="space-y-0.5">
              {roles?.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRole(r)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left",
                    role.id === r.id ? "bg-surface-100 text-surface-900" : "text-surface-500 hover:bg-surface-50 hover:text-surface-900"
                  )}
                >
                  <span className="text-sm">{r.icon}</span>
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-surface-200">
          <div className="flex items-center gap-3 px-2 py-2">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex flex-1 min-w-0 items-center gap-3 rounded-lg text-left hover:bg-surface-50 transition-colors"
              aria-label="Open profile"
            >
              <div className="w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center text-surface-600 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-surface-900 truncate">Prototype User</div>
                <div className="text-xs font-medium text-brand-600 truncate">{role.name}</div>
              </div>
            </button>
            <button onClick={clearRole} className="p-1.5 text-surface-400 hover:text-surface-900 transition-colors shrink-0" title="Logout" aria-label="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative">
        <header className="h-16 bg-gradient-to-r from-white via-brand-50/30 to-white backdrop-blur-md border-b border-surface-200 sticky top-0 z-10 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2
              className="text-xl font-bold text-surface-900"
              aria-label={isDashboard ? 'Your Dashboard' : isSheetsPage ? 'Sheets' : `${role.name} Dashboard`}
            >
              {isDashboard ? 'Your Dashboard' : isSheetsPage ? 'Sheets' : `${role.name} Dashboard`}
            </h2>
            {isDashboard && (
              <span className="hidden sm:inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100">
                {role.name}
              </span>
            )}
            <div className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">Demo Data</div>
            <div className="text-xs font-medium text-surface-400 ml-2 hidden sm:block">Connected apps: mock mode</div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium text-surface-400 mr-2 hidden lg:flex items-center gap-1 bg-surface-100 px-2 py-1 rounded-md border border-surface-200">
              <kbd className="font-sans">⌘</kbd><kbd className="font-sans">K</kbd>
            </div>
            
            {planHistory.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => { const last = planHistory[planHistory.length - 1]; setPlanHistory(prev => prev.slice(0, -1)); if (last) setCurrentPlan(last); showToast("Reverted changes"); }}>
                <Undo2 className="w-4 h-4 mr-2" /> Undo
              </Button>
            )}

            <div className="h-6 w-px bg-surface-200 mx-1" />

            <div className="flex items-center gap-2">
              {Object.keys(prefs.saved_layouts).length > 0 && (
                <div className="relative group">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <List className="w-4 h-4" /> Layouts <ChevronDown className="w-3 h-3 opacity-50" />
                  </Button>
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-card border border-surface-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    {Object.keys(prefs.saved_layouts).map(name => (
                      <button key={name} onClick={() => { setCurrentPlan(prefs.saved_layouts[name]); showToast(`Loaded '${name}' layout`); }} className="w-full text-left px-4 py-2 text-sm font-semibold text-surface-700 hover:bg-surface-50 hover:text-brand-600">
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <Button variant="outline" size="sm" onClick={saveLayout} title="Save current widgets layout">
                <Save className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Save</span>
              </Button>
              
              <Button variant="ghost" size="sm" onClick={resetFilters} title="Reset to default layout">
                <RefreshCw className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Reset</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-screen-2xl mx-auto w-full p-8 pb-24">
          
          {/* Quick Actions Row */}
          <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
            <Button variant="outline" className="bg-indigo-50/60 hover:bg-indigo-100 hover:text-indigo-700 border-indigo-200 text-indigo-700 shadow-sm shrink-0" onClick={() => handlePromptSubmit("Schedule a meeting")}>
              <CalendarPlus className="w-4 h-4 mr-2 text-indigo-500" /> Schedule meeting
            </Button>
            <Button variant="outline" className="bg-emerald-50/60 hover:bg-emerald-100 hover:text-emerald-700 border-emerald-200 text-emerald-700 shadow-sm shrink-0" onClick={() => handlePromptSubmit("Add a task")}>
              <CheckSquare className="w-4 h-4 mr-2 text-emerald-500" /> Add task
            </Button>
            <Button variant="outline" className="bg-amber-50/60 hover:bg-amber-100 hover:text-amber-700 border-amber-200 text-amber-700 shadow-sm shrink-0" onClick={() => handlePromptSubmit("Take a note")}>
              <FileText className="w-4 h-4 mr-2 text-amber-500" /> Add note
            </Button>
            <Button variant="outline" className="bg-violet-50/60 hover:bg-violet-100 hover:text-violet-700 border-violet-200 text-violet-700 shadow-sm shrink-0" onClick={() => handlePromptSubmit("Summarize my day")}>
              <Zap className="w-4 h-4 mr-2 text-violet-500" /> Summarize day
            </Button>
          </div>

          <div className="mb-10 text-center">
            <PromptComposer
              isLoading={isAiLoading}
              onSubmit={handlePromptSubmit}
              sheets={sheets}
              selectedSheetId={selectedSheetId}
              onSelectedSheetChange={setSelectedSheetId}
              onUploadSheet={handleDashboardSheetUpload}
            />
            <div className="mt-8 text-left max-w-3xl mx-auto">
              {aiError ? (
                <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-center justify-between">
                  <div className="text-danger font-semibold">Could not update workspace. Please try again.</div>
                  <Button variant="outline" size="sm" onClick={() => handlePromptSubmit("Retry")}>Retry</Button>
                </div>
              ) : planError ? (
                <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-center justify-between">
                  <div className="text-danger font-semibold">Failed to load dashboard data.</div>
                  <Button variant="outline" size="sm" onClick={() => refetchPlan()}>Retry</Button>
                </div>
              ) : isAiLoading ? (
                <div className="flex flex-col items-center gap-3 text-surface-500 justify-center p-6 bg-white rounded-2xl border border-surface-200 shadow-sm">
                  <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
                  <span className="font-semibold text-surface-900">Updating your workspace...</span>
                  <span className="text-sm">Synthesizing context and analyzing constraints.</span>
                </div>
              ) : currentPlan?.clarificationQuestion ? (
                <div className="bg-warning/10 border border-warning/20 p-5 rounded-2xl flex items-start gap-4">
                  <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                    <HelpCircle className="w-6 h-6 text-warning-dark" />
                  </div>
                  <div>
                    <h3 className="font-bold text-surface-900 mb-1">{currentPlan.explanation}</h3>
                    <p className="text-surface-700 font-medium mb-4">{currentPlan.clarificationQuestion}</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handlePromptSubmit("Preparing for my next meeting")}>Preparing for meeting</Button>
                      <Button size="sm" variant="outline" onClick={() => handlePromptSubmit("Catching up on tasks")}>Catching up</Button>
                    </div>
                  </div>
                </div>
              ) : currentPlan?.explanation && planHistory.length > 0 ? (
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 p-4 rounded-2xl flex items-start gap-3">
                  <div className="bg-white p-1.5 rounded-full shadow-sm shrink-0 mt-0.5 text-violet-500">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-violet-900 text-sm tracking-wide uppercase mb-1 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-violet-400"></span>
                      AI Suggestion
                    </h3>
                    <p className="text-violet-800 font-medium">{currentPlan.explanation}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {location.pathname === '/inbox' ? (
            <InboxPage />
          ) : location.pathname === '/calendar' ? (
            <CalendarPage />
          ) : location.pathname === '/meetings' ? (
            <MeetingsPage />
          ) : location.pathname === '/sheets' ? (
            <SheetsPage role={role.id} onAddToDashboard={addSheetToDashboard} />
          ) : location.pathname === '/goals' ? (
            <GoalsPage />
          ) : location.pathname === '/tasks' ? (
            <TasksPage />
          ) : location.pathname === '/notes' ? (
            <NotesPage />
          ) : location.pathname === '/connections' ? (
            <ConnectionsPage />
          ) : (
            <DashboardGrid 
              plan={currentPlan || undefined} 
              isLoading={planLoading || prefsLoading} 
              pinnedIds={prefs.pinned_ids} 
              hiddenIds={prefs.hidden_ids} 
              onTogglePin={togglePin} 
              onHide={hideWidget}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onResize={handleResize}
              onRemoveSheetWidget={removeSheetWidgetFromDashboard}
              onReset={resetFilters}
              onScheduleMeeting={handleScheduleMeeting}
              theme={currentPlan?.theme}
            />
          )}
        </div>
      </main>
    </div>
  )
}