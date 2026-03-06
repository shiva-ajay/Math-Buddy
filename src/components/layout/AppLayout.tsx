import { useEffect } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useMobile } from '@/hooks/useMobile'
import { Sidebar } from '../sidebar/Sidebar'
import { ChatArea } from '../chat/ChatArea'

export function AppLayout() {
  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen)
  const setSidebarOpen = useSettingsStore((s) => s.setSidebarOpen)
  const isMobile = useMobile()

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [isMobile, setSidebarOpen])

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface-0">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={
          isMobile
            ? `fixed left-0 top-0 bottom-0 z-50 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `shrink-0 h-full overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${sidebarOpen ? 'w-72' : 'w-0'}`
        }
      >
        <div className="w-72 h-full border-r border-white/5">
          <Sidebar />
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 min-w-0 h-full">
        <ChatArea />
      </div>
    </div>
  )
}
