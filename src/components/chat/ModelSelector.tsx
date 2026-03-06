import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Zap } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { AVAILABLE_MODELS } from '@/lib/constants'

export function ModelSelector() {
  const [open, setOpen] = useState(false)
  const model = useSettingsStore((s) => s.model)
  const setModel = useSettingsStore((s) => s.setModel)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === model)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2.5 h-10 px-3.5 rounded-xl border text-sm transition-all duration-150 cursor-pointer ${
          open
            ? 'bg-surface-3 border-border-hover text-text-primary'
            : 'bg-surface-2/80 border-border-subtle hover:border-border hover:bg-surface-2 text-text-primary'
        }`}
      >
        <div className="w-5 h-5 rounded-md bg-accent/12 flex items-center justify-center">
          <Zap size={11} className="text-accent" />
        </div>
        <span className="font-semibold tracking-tight">{selectedModel?.name || model}</span>
        <ChevronDown
          size={13}
          className={`text-text-tertiary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-surface-2 border border-border rounded-2xl shadow-[var(--shadow-float)] overflow-hidden z-50 animate-slide-down">
          <div className="px-4 pt-3.5 pb-2">
            <p className="text-[0.625rem] font-bold text-text-quaternary uppercase tracking-[0.1em]">
              Select Model
            </p>
          </div>
          <div className="px-1.5 pb-1.5">
            {AVAILABLE_MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => { setModel(m.id); setOpen(false) }}
                className={`w-full text-left px-3 py-3 flex items-center gap-3 rounded-xl transition-all duration-100 cursor-pointer ${
                  m.id === model
                    ? 'bg-accent/8 text-text-primary'
                    : 'hover:bg-surface-3 text-text-secondary hover:text-text-primary'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[0.8125rem] font-semibold block leading-snug">{m.name}</span>
                  <p className="text-[0.6875rem] text-text-tertiary mt-0.5 leading-snug">{m.description}</p>
                </div>
                {m.id === model && <Check size={14} className="text-accent shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
