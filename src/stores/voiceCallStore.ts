import { create } from 'zustand'

export type CallStatus = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'error'

export interface TranscriptEntry {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}

interface VoiceCallState {
  status: CallStatus
  isMuted: boolean
  callDuration: number
  error: string | null
  isAiSpeaking: boolean
  isOverlayOpen: boolean
  transcript: TranscriptEntry[]
  pendingAiText: string

  setStatus: (status: CallStatus) => void
  setMuted: (muted: boolean) => void
  setCallDuration: (seconds: number) => void
  setError: (error: string | null) => void
  setAiSpeaking: (speaking: boolean) => void
  setOverlayOpen: (open: boolean) => void
  addTranscriptEntry: (entry: TranscriptEntry) => void
  updateLastAssistantEntry: (text: string) => void
  setPendingAiText: (text: string) => void
  reset: () => void
}

export const useVoiceCallStore = create<VoiceCallState>((set) => ({
  status: 'idle',
  isMuted: false,
  callDuration: 0,
  error: null,
  isAiSpeaking: false,
  isOverlayOpen: false,
  transcript: [],
  pendingAiText: '',

  setStatus: (status) => set({ status }),
  setMuted: (isMuted) => set({ isMuted }),
  setCallDuration: (callDuration) => set({ callDuration }),
  setError: (error) => set({ error, status: error ? 'error' : 'idle' }),
  setAiSpeaking: (isAiSpeaking) => set({ isAiSpeaking }),
  setOverlayOpen: (isOverlayOpen) => set({ isOverlayOpen }),
  addTranscriptEntry: (entry) => set((s) => ({ transcript: [...s.transcript, entry] })),
  updateLastAssistantEntry: (text) => set((s) => {
    const transcript = [...s.transcript]
    for (let i = transcript.length - 1; i >= 0; i--) {
      if (transcript[i].role === 'assistant') {
        transcript[i] = { ...transcript[i], text }
        break
      }
    }
    return { transcript }
  }),
  setPendingAiText: (pendingAiText) => set({ pendingAiText }),
  reset: () => set({
    status: 'idle',
    isMuted: false,
    callDuration: 0,
    error: null,
    isAiSpeaking: false,
    isOverlayOpen: false,
    transcript: [],
    pendingAiText: '',
  }),
}))
