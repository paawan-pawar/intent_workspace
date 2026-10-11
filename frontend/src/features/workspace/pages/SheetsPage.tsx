import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle, Check, ChevronDown, CloudUpload, FileSpreadsheet, FileText,
  CalendarDays, Filter, ListTodo, LoaderCircle, Plus, Search, Sparkles, Table2, Trash2, Upload, X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/app/providers/ToastProvider'
import { apiService } from '@/lib/api'
import type { ColumnType, SheetAnalysis, SheetAnalysisFilters, SheetRecord, SheetSource, SheetStatus, SheetTaskSuggestion, SheetUploadPayload } from '@/lib/sheets'
import { SheetAnalysisDashboard } from '@/features/workspace/components/SheetAnalysisDashboard'
import { SheetLinkConfirmationDialog, type SheetLinkAction, type SheetLinkConfirmation } from '@/features/workspace/components/SheetLinkConfirmationDialog'
import { cn } from '@/lib/utils'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const PREVIEW_ROWS = 30

type UploadState = {
  name: string
  size: number
  progress: number
  phase: 'reading' | 'saving' | 'success' | 'error'
  message?: string
}

const SOURCE_LABELS: Record<SheetSource, string> = {
  google_sheets: 'Google Sheets',
  excel_upload: 'Excel upload',
  csv_upload: 'CSV upload',
}

const STATUS_LABELS: Record<SheetStatus, string> = {
  not_analyzed: 'Not analyzed',
  analyzing: 'Analyzing',
  analyzed: 'Analyzed',
  error: 'Error',
}

const STATUS_STYLES: Record<SheetStatus, string> = {
  not_analyzed: 'border-amber-200 bg-amber-50 text-amber-800',
  analyzing: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  analyzed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: string): string {
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return date
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsedDate)
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function readFile(file: File, onProgress: (progress: number) => void): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 50))
    }
    reader.onerror = () => reject(new Error('The selected file could not be read.'))
    reader.onabort = () => reject(new Error('File reading was cancelled.'))
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        onProgress(50)
        resolve(reader.result)
      } else {
        reject(new Error('The selected file could not be read as spreadsheet data.'))
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

function ColumnTypeLabel({ type }: { type: ColumnType }) {
  const styles: Record<ColumnType, string> = {
    text: 'bg-slate-100 text-slate-700',
    number: 'bg-cyan-100 text-cyan-900',
    date: 'bg-indigo-100 text-indigo-900',
    boolean: 'bg-emerald-100 text-emerald-900',
    category: 'bg-violet-100 text-violet-900',
  }
  return <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', styles[type])}>{type}</span>
}

export function SheetsPage({
  role,
  onAddToDashboard,
}: {
  role: string
  onAddToDashboard: (sheet: SheetRecord) => Promise<void> | void
}) {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sheets, setSheets] = useState<SheetRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isConnectingDemo, setIsConnectingDemo] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [upload, setUpload] = useState<UploadState | null>(null)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedSheet, setSelectedSheet] = useState<SheetRecord | null>(null)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [addingToDashboardId, setAddingToDashboardId] = useState<string | null>(null)
  const [linkAction, setLinkAction] = useState<SheetLinkAction | null>(null)

  const loadSheets = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      setSheets(await apiService.getSheets())
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Sheets could not be loaded. Check your connection and try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSheets()
  }, [])

  useEffect(() => {
    const requestedId = searchParams.get('sheet')
    if (!requestedId || !sheets.length) return
    const linkedSheet = sheets.find(sheet => sheet.id === requestedId)
    if (linkedSheet) {
      setSelectedSheet(linkedSheet)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, sheets])

  const filteredSheets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return sheets.filter(sheet => {
      const matchesSearch = !normalizedSearch || [
        sheet.name,
        sheet.file_name ?? '',
        SOURCE_LABELS[sheet.source],
        sheet.updated_at,
        STATUS_LABELS[sheet.status],
      ].some(value => value.toLowerCase().includes(normalizedSearch))
      const matchesSource = sourceFilter === 'all' || sheet.source === sourceFilter
      const matchesStatus = statusFilter === 'all' || sheet.status === statusFilter
      const matchesDate = !dateFilter || sheet.updated_at.slice(0, 10) === dateFilter
      return matchesSearch && matchesSource && matchesStatus && matchesDate
    })
  }, [sheets, search, sourceFilter, statusFilter, dateFilter])

  const handleUpload = async (file?: File) => {
    if (!file) return
    const extension = file.name.toLowerCase().split('.').pop() ?? ''
    if (!['xlsx', 'xls', 'csv'].includes(extension)) {
      setUpload({ name: file.name, size: file.size, progress: 0, phase: 'error', message: 'Choose an .xlsx, .xls, or .csv file.' })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setUpload({ name: file.name, size: file.size, progress: 0, phase: 'error', message: 'File size must be 10 MB or less.' })
      return
    }

    setUpload({ name: file.name, size: file.size, progress: 0, phase: 'reading' })
    try {
      const contents = await readFile(file, progress => {
        setUpload(current => current ? { ...current, progress, phase: 'reading' } : current)
      })
      const { parseSheetFile } = await import('@/features/workspace/sheets/parseSheetFile')
      const parsed: SheetUploadPayload = parseSheetFile(file.name, contents)
      const source: SheetSource = extension === 'csv' ? 'csv_upload' : 'excel_upload'
      setUpload(current => current ? { ...current, progress: 55, phase: 'saving' } : current)
      const saved = await apiService.createSheet({
        name: parsed.name,
        source,
        file_name: file.name,
        file_size: file.size,
        row_count: parsed.rows.length,
        column_count: parsed.columns.length,
        columns: parsed.columns,
        rows: parsed.rows,
      }, progress => {
        setUpload(current => current ? { ...current, progress: 55 + Math.round(progress * 0.4), phase: 'saving' } : current)
      })
      setSheets(current => [saved, ...current])
      queryClient.setQueryData<SheetRecord[]>(['sheets'], current => [saved, ...(current ?? []).filter(sheet => sheet.id !== saved.id)])
      setUpload({ name: file.name, size: file.size, progress: 100, phase: 'success', message: 'Sheet imported and saved.' })
      showToast('Sheet imported successfully')
    } catch (error) {
      const message = getErrorMessage(error, 'The file could not be imported.')
      setUpload(current => current ? { ...current, phase: 'error', message } : current)
    }
  }

  const handleConnectDemo = async () => {
    setIsConnectingDemo(true)
    setConnectError(null)
    try {
      const result = await apiService.connectDemoSheets()
      setSheets(current => {
        const merged = new Map(current.map(sheet => [sheet.id, sheet]))
        for (const sheet of result.sheets) merged.set(sheet.id, sheet)
        return [...merged.values()]
      })
      queryClient.setQueryData<SheetRecord[]>(['sheets'], current => {
        const merged = new Map((current ?? []).map(sheet => [sheet.id, sheet]))
        for (const sheet of result.sheets) merged.set(sheet.id, sheet)
        return [...merged.values()]
      })
      showToast('Demo Google Sheets are ready')
    } catch (error) {
      setConnectError(getErrorMessage(error, 'Demo sheets could not be connected. Try again.'))
    } finally {
      setIsConnectingDemo(false)
    }
  }

  const handleAnalyze = async (sheet: SheetRecord, filters: SheetAnalysisFilters = {}): Promise<SheetRecord | null> => {
    setAnalyzingId(sheet.id)
    setSheets(current => current.map(item => item.id === sheet.id ? { ...item, status: 'analyzing' } : item))
    setSelectedSheet(current => current?.id === sheet.id ? { ...current, status: 'analyzing' } : current)
    try {
      const analysis: SheetAnalysis = await apiService.analyzeSheet(sheet.id, { ...filters, role })
      const updated = { ...sheet, status: 'analyzed' as const, analysis }
      setSheets(current => current.map(item => item.id === sheet.id ? updated : item))
      setSelectedSheet(current => current?.id === sheet.id ? updated : current)
      showToast(analysis.engine === 'ai' ? 'Sheet metrics and AI insights are ready' : 'Sheet metrics are ready; showing statistical analysis')
      return updated
    } catch (error) {
      const updated = { ...sheet, status: 'error' as const }
      setSheets(current => current.map(item => item.id === sheet.id ? updated : item))
      setSelectedSheet(current => current?.id === sheet.id ? updated : current)
      showToast(getErrorMessage(error, 'Sheet analysis failed. Try again.'))
      return null
    } finally {
      setAnalyzingId(null)
    }
  }

  const handleAddInsightsToDashboard = async (sheet: SheetRecord) => {
    setSelectedSheet(sheet)
    setAddingToDashboardId(sheet.id)
    try {
      const analyzed = sheet.analysis?.dashboard_plan?.role === role
        ? sheet
        : await handleAnalyze(sheet, { role })
      if (analyzed) await onAddToDashboard(analyzed)
    } finally {
      setAddingToDashboardId(null)
    }
  }

  const handleConfirmLinkAction = async (confirmation: SheetLinkConfirmation) => {
    try {
      if (confirmation.kind === 'task') {
        await apiService.createSheetTask(confirmation.sheet.id, {
          title: confirmation.suggestion.title,
          reason: confirmation.suggestion.reason,
          priority: confirmation.suggestion.priority,
          due_date: confirmation.suggestion.due_date_suggestion,
          metric: confirmation.suggestion.metric,
        })
        showToast('AI-suggested task added to Tasks')
      } else if (confirmation.kind === 'note') {
        await apiService.createSheetNote(confirmation.sheet.id)
        showToast('Insight note created')
      } else if (confirmation.kind === 'goal') {
        await apiService.createSheetGoal(confirmation.sheet.id, {
          title: confirmation.title,
          target_value: confirmation.target,
          deadline: confirmation.deadline,
          metric: confirmation.metric,
          direction: confirmation.direction,
        })
        showToast('Sheet-linked goal created')
      } else {
        await apiService.attachSheetToCalendarEvent(confirmation.sheet.id, confirmation.eventId)
        showToast('Sheet analysis attached to calendar event')
      }
      setLinkAction(null)
    } catch (error) {
      showToast(getErrorMessage(error, 'The sheet insight could not be linked.'))
    }
  }

  const handleRemove = async (sheet: SheetRecord) => {
    try {
      await apiService.deleteSheet(sheet.id)
      setSheets(current => current.filter(item => item.id !== sheet.id))
      queryClient.setQueryData<SheetRecord[]>(['sheets'], current => (current ?? []).filter(item => item.id !== sheet.id))
      setSelectedSheet(current => current?.id === sheet.id ? null : current)
      showToast('Sheet removed')
    } catch (error) {
      showToast(getErrorMessage(error, 'Sheet could not be removed.'))
    }
  }

  const resetFilters = () => {
    setSearch('')
    setSourceFilter('all')
    setStatusFilter('all')
    setDateFilter('')
  }

  const uploadInProgress = upload?.phase === 'reading' || upload?.phase === 'saving'
  const uploadButton = (
    <Button
      variant="outline"
      className="border-cyan-200 bg-white text-cyan-900 hover:bg-cyan-50 hover:text-cyan-950"
      onClick={() => fileInputRef.current?.click()}
      disabled={uploadInProgress}
    >
      <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
      Upload from computer
    </Button>
  )

  return (
    <section className="mx-auto mt-6 max-w-7xl animate-slide-up pb-12" aria-labelledby="sheets-title">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="sr-only"
        aria-label="Choose an Excel or CSV file"
        onChange={event => {
          void handleUpload(event.currentTarget.files?.[0])
          event.currentTarget.value = ''
        }}
      />

      <div className="mb-6 rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-cyan-100 p-2.5 text-cyan-900">
              <FileSpreadsheet className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h2 id="sheets-title" className="text-2xl font-bold text-surface-900">Sheets</h2>
              <p className="mt-1 max-w-2xl text-sm text-surface-600">
                Import spreadsheet data, preview it, and turn useful insights into dashboard widgets.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void handleConnectDemo()}
              disabled={isConnectingDemo}
              className="bg-indigo-700 text-white hover:bg-indigo-800"
            >
              {isConnectingDemo ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Connect Google Sheet
            </Button>
            {uploadButton}
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-indigo-100 bg-white/80 px-3 py-2.5 text-xs leading-relaxed text-surface-600">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" aria-hidden="true" />
          Demo connection only: no Google account is connected and no real Google account data is accessed. Synthetic sample spreadsheets will be added.
        </p>
      </div>

      {connectError && (
        <div role="alert" className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <span>{connectError}</span>
          <button className="rounded p-1 hover:bg-rose-100" onClick={() => void handleConnectDemo()} aria-label="Retry demo connection"><ChevronDown className="h-4 w-4 rotate-[-90deg]" /></button>
        </div>
      )}

      {upload && (
        <div role={upload.phase === 'error' ? 'alert' : 'status'} aria-live="polite" className={cn(
          'mb-5 rounded-2xl border p-4',
          upload.phase === 'error' ? 'border-rose-200 bg-rose-50' :
            upload.phase === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-cyan-200 bg-cyan-50'
        )}>
          <div className="flex items-start gap-3">
            {upload.phase === 'error' ? <AlertCircle className="mt-0.5 h-5 w-5 text-rose-700" /> :
              upload.phase === 'success' ? <Check className="mt-0.5 h-5 w-5 text-emerald-700" /> :
                <LoaderCircle className="mt-0.5 h-5 w-5 animate-spin text-cyan-800" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-surface-900">{upload.name}</p>
                  <p className="mt-0.5 text-xs text-surface-600">
                    {formatFileSize(upload.size)} · {upload.phase === 'reading' ? 'Reading file' :
                      upload.phase === 'saving' ? 'Saving parsed data' : upload.phase === 'success' ? 'Import complete' : 'Import failed'}
                  </p>
                </div>
                <button onClick={() => setUpload(null)} className="rounded-lg p-1 text-surface-500 hover:bg-white/70" aria-label="Dismiss upload status">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {(upload.phase === 'reading' || upload.phase === 'saving') && (
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-white"
                  role="progressbar"
                  aria-label={`Importing ${upload.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={upload.progress}
                >
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all" style={{ width: `${upload.progress}%` }} />
                </div>
              )}
              {upload.message && <p className={cn('mt-2 text-sm', upload.phase === 'error' ? 'text-rose-900' : 'text-emerald-900')}>{upload.message}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="mb-5 rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_190px_190px_190px_auto]">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" aria-hidden="true" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by name, source, date, or status"
              aria-label="Search sheets by name, source, date, or status"
              className="w-full rounded-xl border border-surface-200 bg-surface-50 py-2.5 pl-9 pr-3 text-sm text-surface-900 placeholder:text-surface-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </label>
          <label className="relative">
            <span className="sr-only">Filter by source</span>
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" aria-hidden="true" />
            <select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)} className="w-full appearance-none rounded-xl border border-surface-200 bg-white py-2.5 pl-9 pr-8 text-sm text-surface-700 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20">
              <option value="all">All sources</option>
              <option value="google_sheets">Google Sheets</option>
              <option value="excel_upload">Excel upload</option>
              <option value="csv_upload">CSV upload</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" aria-hidden="true" />
          </label>
          <label className="relative">
            <span className="sr-only">Filter by status</span>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="w-full appearance-none rounded-xl border border-surface-200 bg-white px-3 py-2.5 pr-8 text-sm text-surface-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="all">All statuses</option>
              <option value="not_analyzed">Not analyzed</option>
              <option value="analyzing">Analyzing</option>
              <option value="analyzed">Analyzed</option>
              <option value="error">Error</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" aria-hidden="true" />
          </label>
          <label>
            <span className="sr-only">Filter by updated date</span>
            <input type="date" value={dateFilter} onChange={event => setDateFilter(event.target.value)} aria-label="Filter by updated date" className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-sm text-surface-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </label>
          <Button variant="ghost" onClick={resetFilters} className="text-surface-600">Clear filters</Button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="mb-5 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <span>{loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void loadSheets()}>Retry</Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-surface-200 bg-white text-sm font-medium text-surface-600" role="status">
          <LoaderCircle className="h-6 w-6 animate-spin text-cyan-700" />
          Loading sheets…
        </div>
      ) : !loadError && sheets.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-indigo-50 px-6 py-12 text-center">
          <div className="mb-4 rounded-2xl bg-cyan-100 p-4 text-cyan-900"><Table2 className="h-8 w-8" aria-hidden="true" /></div>
          <h3 className="text-lg font-bold text-surface-900">No sheets added yet</h3>
          <p className="mt-2 max-w-md text-sm text-surface-600">Upload an Excel or CSV file, or add synthetic sample sheets using demo connection mode.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {uploadButton}
            <Button variant="outline" onClick={() => void handleConnectDemo()} disabled={isConnectingDemo} className="border-indigo-200 text-indigo-800 hover:bg-indigo-50">
              <CloudUpload className="mr-2 h-4 w-4" aria-hidden="true" /> Connect demo sheets
            </Button>
          </div>
        </div>
      ) : !loadError && filteredSheets.length === 0 ? (
        <div className="rounded-2xl border border-surface-200 bg-white px-6 py-14 text-center">
          <Search className="mx-auto h-7 w-7 text-surface-400" aria-hidden="true" />
          <h3 className="mt-3 font-bold text-surface-900">No matching sheets</h3>
          <p className="mt-1 text-sm text-surface-600">Try changing your search or filters.</p>
          <Button variant="ghost" onClick={resetFilters} className="mt-3">Clear filters</Button>
        </div>
      ) : !loadError ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredSheets.map(sheet => (
            <article key={sheet.id} className="overflow-hidden rounded-2xl border border-cyan-100 border-l-4 border-l-cyan-500 bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="bg-gradient-to-r from-cyan-50/80 to-white px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-xl bg-cyan-100 p-2 text-cyan-900"><FileSpreadsheet className="h-5 w-5" aria-hidden="true" /></div>
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-surface-900" title={sheet.name}>{sheet.name}</h3>
                      <p className="mt-1 text-xs text-surface-600">{SOURCE_LABELS[sheet.source]}{sheet.file_name ? ` · ${sheet.file_name}` : ''}</p>
                    </div>
                  </div>
                  <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[sheet.status])}>
                    {sheet.status === 'analyzing' && <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" />}
                    {STATUS_LABELS[sheet.status]}
                  </span>
                </div>
              </div>

              <div className="px-5 pb-5 pt-3">
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-surface-600">
                  <span>Updated {formatDate(sheet.updated_at)}</span>
                  <span>{sheet.row_count.toLocaleString()} rows</span>
                  <span>{sheet.column_count} columns</span>
                  {sheet.file_size > 0 && <span>{formatFileSize(sheet.file_size)}</span>}
                </div>
                <div className="mt-3 rounded-xl border border-surface-200 bg-surface-50/80 p-3">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-surface-500">Data preview</p>
                  <p className="line-clamp-2 text-xs leading-relaxed text-surface-700">
                    {sheet.columns.map(column => column.name).join(' · ')}
                    {sheet.rows[0] && ` — ${sheet.columns.slice(0, 4).map(column => formatCell(sheet.rows[0]?.[column.name])).join(' · ')}`}
                  </p>
                </div>
                {sheet.analysis && (
                  <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-900">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      {sheet.analysis.engine === 'ai' ? 'AI analysis' : 'Statistical analysis'}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-surface-700">
                      {sheet.analysis.ai_summary ?? `${sheet.analysis.summary.row_count.toLocaleString()} selected rows · ${sheet.analysis.summary.missing_values.toLocaleString()} missing cells`}
                    </p>
                  </div>
                )}
                {sheet.analysis?.dashboard_plan?.task_suggestions.map((suggestion, index) => (
                  <div key={`${suggestion.title}-${index}`} className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-900">AI suggestion</span>
                        <span className="text-[10px] font-bold uppercase text-amber-900">{suggestion.priority} priority</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setLinkAction({ kind: 'task', sheet, suggestion })} className="border-amber-300 text-amber-950 hover:bg-amber-100">
                        <ListTodo className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Review task
                      </Button>
                    </div>
                    <p className="mt-2 text-sm font-bold text-surface-900">{suggestion.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-surface-700">{suggestion.reason}</p>
                    <p className="mt-1 text-[10px] text-surface-600">
                      {suggestion.metric ? `Metric: ${suggestion.metric}` : 'No numeric metric'}
                      {suggestion.due_date_suggestion ? ` · Date from sheet: ${suggestion.due_date_suggestion}` : ''}
                    </p>
                  </div>
                ))}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedSheet(sheet)} className="border-cyan-200 text-cyan-900 hover:bg-cyan-50">
                    <Table2 className="mr-1.5 h-4 w-4" aria-hidden="true" /> Preview
                  </Button>
                  <Button size="sm" onClick={() => { setSelectedSheet(sheet); void handleAnalyze(sheet) }} disabled={analyzingId !== null} className="bg-violet-700 hover:bg-violet-800">
                    {analyzingId === sheet.id ? <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                    Analyze
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void handleAddInsightsToDashboard(sheet)} disabled={addingToDashboardId !== null || analyzingId !== null} className="border-emerald-200 text-emerald-900 hover:bg-emerald-50">
                    {addingToDashboardId === sheet.id ? <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                    {addingToDashboardId === sheet.id ? 'Preparing insights…' : 'Add insights to dashboard'}
                  </Button>
                  {sheet.analysis && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setLinkAction({ kind: 'note', sheet })} className="border-violet-200 text-violet-900 hover:bg-violet-50">
                        <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" /> Create note from insight
                      </Button>
                      {Object.keys(sheet.analysis.key_metrics.numeric).length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setLinkAction({ kind: 'goal', sheet })} className="border-emerald-200 text-emerald-900 hover:bg-emerald-50">
                          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Add to goal
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => setLinkAction({ kind: 'meeting', sheet })} className="border-indigo-200 text-indigo-900 hover:bg-indigo-50">
                        <CalendarDays className="mr-1.5 h-4 w-4" aria-hidden="true" /> Attach to meeting
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => void handleRemove(sheet)} className="ml-auto text-rose-800 hover:bg-rose-50 hover:text-rose-900">
                    <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" /> Remove
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {selectedSheet && (
        <SheetPreviewDialog
          sheet={selectedSheet}
          isAnalyzing={analyzingId === selectedSheet.id}
          onClose={() => setSelectedSheet(null)}
          onAnalyze={filters => void handleAnalyze(selectedSheet, filters)}
          onCreateTask={suggestion => setLinkAction({ kind: 'task', sheet: selectedSheet, suggestion })}
          onCreateNote={() => setLinkAction({ kind: 'note', sheet: selectedSheet })}
          onCreateGoal={() => setLinkAction({ kind: 'goal', sheet: selectedSheet })}
          onAttachMeeting={() => setLinkAction({ kind: 'meeting', sheet: selectedSheet })}
        />
      )}
      {linkAction && (
        <SheetLinkConfirmationDialog
          action={linkAction}
          onClose={() => setLinkAction(null)}
          onConfirm={handleConfirmLinkAction}
        />
      )}
    </section>
  )
}

function SheetPreviewDialog({
  sheet,
  isAnalyzing,
  onClose,
  onAnalyze,
  onCreateTask,
  onCreateNote,
  onCreateGoal,
  onAttachMeeting,
}: {
  sheet: SheetRecord
  isAnalyzing: boolean
  onClose: () => void
  onAnalyze: (filters?: SheetAnalysisFilters) => void
  onCreateTask: (suggestion: SheetTaskSuggestion) => void
  onCreateNote: () => void
  onCreateGoal: () => void
  onAttachMeeting: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const visibleRows = sheet.rows.slice(0, PREVIEW_ROWS)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-950/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="sheet-preview-title">
        <header className="flex items-start justify-between gap-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-900">
              <FileText className="h-4 w-4" aria-hidden="true" />
              {SOURCE_LABELS[sheet.source]} · Updated {formatDate(sheet.updated_at)}
            </div>
            <h2 id="sheet-preview-title" className="mt-1 truncate text-xl font-bold text-surface-900">{sheet.name}</h2>
          </div>
          <button autoFocus onClick={onClose} className="rounded-xl p-2 text-surface-500 hover:bg-surface-100 hover:text-surface-900" aria-label="Close sheet preview">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-surface-900">Data preview</h3>
              <p className="text-xs text-surface-500">Showing {visibleRows.length} of {sheet.row_count.toLocaleString()} rows</p>
            </div>
            <Button onClick={() => onAnalyze()} disabled={isAnalyzing} className="bg-violet-700 hover:bg-violet-800">
              {isAnalyzing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />}
              Analyze with AI
            </Button>
          </div>
          {isAnalyzing && !sheet.analysis && (
            <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-950" role="status" aria-live="polite">
              Reading data and generating insights…
            </div>
          )}
          {sheet.analysis && (
            <SheetAnalysisDashboard
              sheet={sheet}
              analysis={sheet.analysis}
              isAnalyzing={isAnalyzing}
              onApplyFilters={onAnalyze}
              onCreateTask={onCreateTask}
              onCreateNote={onCreateNote}
              onCreateGoal={onCreateGoal}
              onAttachMeeting={onAttachMeeting}
            />
          )}
          <div className="overflow-x-auto rounded-xl border border-surface-200">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-surface-50">
                <tr>
                  {sheet.columns.map(column => (
                    <th key={column.name} scope="col" className="min-w-32 border-b border-surface-200 px-3 py-2.5">
                      <span className="block truncate font-bold text-surface-800" title={column.name}>{column.name}</span>
                      <span className="mt-1 block"><ColumnTypeLabel type={column.type} /></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 ? 'bg-surface-50/70' : 'bg-white'}>
                    {sheet.columns.map(column => (
                      <td key={column.name} className="max-w-64 border-b border-surface-100 px-3 py-2 text-surface-700" title={formatCell(row[column.name])}>
                        <span className="block truncate">{formatCell(row[column.name])}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {sheet.rows.length === 0 && <p className="p-6 text-center text-sm text-surface-500">This sheet contains headers but no data rows.</p>}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-surface-500">
            Analyze with AI sends calculated metrics, column labels, and up to 6 relevant sample rows to the configured AI provider. Totals, averages, trends, and anomaly detection are calculated in backend Python code. If AI is not configured, the app still shows all calculated metrics.
          </p>
        </div>
      </section>
    </div>
  )
}