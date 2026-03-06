import { useState, useRef, useEffect } from 'react'
import { Settings2, ChevronDown } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'

export function SystemPrompt() {
  const [expanded, setExpanded] = useState(false)
  const systemPrompt = useSettingsStore((s) => s.systemPrompt)
  const setSystemPrompt = useSettingsStore((s) => s.setSystemPrompt)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    if (expanded) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expanded])

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 h-9 px-3 rounded-xl text-sm transition-all duration-150 cursor-pointer ${
          expanded
            ? 'bg-surface-3 text-text-primary'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
        }`}
      >
        <Settings2 size={14} />
        <span className="hidden sm:inline font-medium">System</span>
        <ChevronDown
          size={13}
          className={`text-text-tertiary transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="absolute top-full right-0 mt-2 w-[26rem] max-w-[92vw] bg-surface-2 border border-border rounded-2xl shadow-[var(--shadow-float)] z-50 animate-slide-down overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-border-subtle">
            <h3 className="text-sm font-bold text-text-primary tracking-tight">System Prompt</h3>
            <p className="text-[0.6875rem] text-text-tertiary mt-1 leading-relaxed">
              Define the assistant's behavior and personality.
            </p>
          </div>
          <div className="p-4">
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              className="w-full bg-surface-1 border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/30 transition-colors duration-200 resize-none leading-relaxed"
              placeholder="Enter system instructions..."
            />
          </div>
        </div>
      )}
    </div>
  )
}
