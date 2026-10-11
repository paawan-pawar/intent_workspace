import React, { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface PromptComposerProps {
  isLoading: boolean
  onSubmit: (prompt: string) => void
}

const SUGGESTED_CHIPS = [
  "Prepare for my next meeting",
  "Show overdue work",
  "Summarize my day",
  "Create follow-up tasks"
]

export function PromptComposer({ isLoading, onSubmit }: PromptComposerProps) {
  const [prompt, setPrompt] = useState('')

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
