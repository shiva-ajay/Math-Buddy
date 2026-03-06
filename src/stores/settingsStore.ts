import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_MODEL, DEFAULT_SYSTEM_PROMPT } from '@/lib/constants'

interface SettingsState {
  model: string
  systemPrompt: string
  sidebarOpen: boolean
  darkMode: boolean

  setModel: (model: string) => void
  setSystemPrompt: (prompt: string) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleDarkMode: () => void
}

// Bump this version whenever DEFAULT_SYSTEM_PROMPT changes to force update cached prompts
const SYSTEM_PROMPT_VERSION = 3

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      model: DEFAULT_MODEL,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      sidebarOpen: true,
      darkMode: true,

      setModel: (model) => set({ model }),
      setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
    }),
    {
      name: 'mohana-gpt-settings',
      version: SYSTEM_PROMPT_VERSION,
      migrate: () => {
        // When version changes, reset the system prompt to the new default
        return {
          model: DEFAULT_MODEL,
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
          sidebarOpen: true,
          darkMode: true,
        }
      },
    },
  ),
)
