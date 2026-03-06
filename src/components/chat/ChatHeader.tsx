import { Menu, PanelLeft } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useMobile } from '@/hooks/useMobile'
import { ModelSelector } from './ModelSelector'

import { CallProfessorButton } from '@/components/voice/CallProfessorButton'

export function ChatHeader() {
  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen)
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar)
  const isMobile = useMobile()

  return (
    <header className="flex items-center justify-between px-5 h-16 shrink-0 bg-surface-0/80 backdrop-blur-md border-b border-border-subtle/60 z-10">
      <div className="flex items-center gap-3">
        {(isMobile || !sidebarOpen) && (
          <button
            onClick={toggleSidebar}
            className="p-2.5 -ml-1 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 rounded-xl transition-all duration-150 cursor-pointer"
          >
            {isMobile ? <Menu size={18} /> : <PanelLeft size={18} />}
          </button>
        )}
        <ModelSelector />
      </div>
      <div className="flex items-center gap-2">
        <CallProfessorButton />

      </div>
    </header>
  )
}
