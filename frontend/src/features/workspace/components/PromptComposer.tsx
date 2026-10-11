import React, { useRef, useState } from 'react'
import { FileSpreadsheet, Loader2, Sparkles, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { SheetRecord } from '@/lib/sheets'

interface PromptComposerProps {
  isLoading: boolean
  onSubmit: (prompt: string) => void
  sheets: SheetRecord[]
  selectedSheetId: string
  onSelectedSheetChange: (sheetId: string) => void
  onUploadSheet: (file: File) => Promise<void>
}

const SUGGESTED_CHIPS = [
  "Build my daily dashboard",
  "Prepare for my next meeting",
  "Show overdue work",
  "Summarize my day",
  "Create follow-up tasks"
]

export function PromptComposer({ isLoading, onSubmit, sheets, selectedSheetId, onSelectedSheetChange, onUploadSheet }: PromptComposerProps) {
  const [prompt, setPrompt] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim())
      setPrompt('')
    }
  }

  const handleChipClick = (chip: string) => {
    if (!isLoading) {
      onSubmit(chip)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto text-center">
      <form onSubmit={handleSubmit} className="relative group mb-4">
        <div className="absolute -inset-0.5 bg-gradient-brand rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
        <div className="relative bg-white rounded-2xl shadow-sm border border-surface-200 flex items-center p-2 pl-4">
          {isLoading ? (
            <Loader2 className="w-6 h-6 text-brand-500 mr-3 animate-spin" />
          ) : (
            <Sparkles className="w-6 h-6 text-brand-500 mr-3" />
          )}
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            placeholder="Ask anything... For example: Schedule my meeting and give me points to discuss" 
            className="flex-1 outline-none text-lg text-surface-900 placeholder-surface-400 py-3 bg-transparent disabled:opacity-50"
          />
          <Button 
            type="submit" 
            disabled={!prompt.trim() || isLoading}
            className="ml-2 rounded-xl h-[48px]"
          >
            {isLoading ? "Updating..." : "Adapt Workspace"}
          </Button>
        </div>
      </form>

      <div className="mx-auto mb-4 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-left">
        <label htmlFor="dashboard-sheet-context" className="shrink-0 text-xs font-bold uppercase tracking-wide text-surface-500">
          Use sheet context
        </label>
        <select
          id="dashboard-sheet-context"
          value={selectedSheetId}
          onChange={event => onSelectedSheetChange(event.target.value)}
          disabled={isLoading}
          className="min-w-[220px] flex-1 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-semibold text-surface-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="">No sheet selected</option>
          {sheets.map(sheet => (
            <option key={sheet.id} value={sheet.id}>
              {sheet.name} {sheet.status === 'analyzed' ? '• analyzed' : '• ready to analyze'}
            </option>
          ))}
        </select>
        {selectedSheetId && (
          <button
            type="button"
            onClick={() => onSelectedSheetChange('')}
            disabled={isLoading}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-white text-surface-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Remove selected sheet"
            aria-label="Remove selected sheet"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void onUploadSheet(file)
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0"
        >
          <Upload className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Upload sheet</span>
          <FileSpreadsheet className="h-4 w-4 sm:hidden" />
        </Button>
      </div>

      {/* Suggested Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {SUGGESTED_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => handleChipClick(chip)}
            disabled={isLoading}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-surface-100 text-surface-600 hover:bg-surface-200 hover:text-surface-900 transition-colors border border-surface-200 disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
