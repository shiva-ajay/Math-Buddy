import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Mic, MicOff, PhoneOff, GraduationCap } from 'lucide-react'
import { useVoiceCallStore } from '@/stores/voiceCallStore'
import { AudioVisualizer } from './AudioVisualizer'

interface VoiceCallOverlayProps {
  voiceCall: {
    endCall: () => void
    toggleMute: () => void
    analyserRef: React.RefObject<AnalyserNode | null>
  }
  onClose: () => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function OverlayContent({ voiceCall, onClose }: VoiceCallOverlayProps) {
  const status = useVoiceCallStore((s) => s.status)
  const isMuted = useVoiceCallStore((s) => s.isMuted)
  const callDuration = useVoiceCallStore((s) => s.callDuration)
  const error = useVoiceCallStore((s) => s.error)
  const isAiSpeaking = useVoiceCallStore((s) => s.isAiSpeaking)
  const transcript = useVoiceCallStore((s) => s.transcript)
  const pendingAiText = useVoiceCallStore((s) => s.pendingAiText)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript, pendingAiText])

  // Close overlay when call resets to idle
  useEffect(() => {
    if (status === 'idle' && !error) {
      onClose()
    }
  }, [status, error, onClose])

  // Prevent body scroll while overlay is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const statusText = (() => {
    if (error) return error
    switch (status) {
      case 'connecting': return 'Connecting to Professor...'
      case 'connected': return isAiSpeaking ? 'Professor is speaking...' : 'Listening...'
      case 'disconnecting': return 'Ending call...'
      default: return ''
    }
  })()

  const hasTranscript = transcript.length > 0 || pendingAiText

  return (
    <div className="fixed inset-0 z-50 bg-surface-0/95 backdrop-blur-xl animate-scale-in flex flex-col items-center">
      {/* Top section: avatar + status */}
      <div className="flex flex-col items-center gap-4 pt-12 pb-4 shrink-0">
        {/* Status Text */}
        <div className="text-center">
          <h2 className="text-2xl font-display text-text-primary mb-1">
            PrepBuddy
          </h2>
          <p className={`text-sm text-text-secondary ${status === 'connecting' ? 'animate-shimmer-text' : ''}`}>
            {statusText}
          </p>
        </div>

        {/* Avatar Circle with Visualizer */}
        <div className="relative">
          <div
            className={`absolute -inset-4 rounded-full transition-opacity duration-1000 ${
              status === 'connected' ? 'opacity-100 animate-glow-pulse' : 'opacity-0'
            }`}
            style={{
              background: 'radial-gradient(circle, rgba(200, 149, 108, 0.15) 0%, transparent 70%)',
            }}
          />
          <div
            className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 ${
              status === 'connected'
                ? 'border-2 border-accent/50 shadow-[0_0_30px_rgba(200,149,108,0.2)]'
                : 'border-2 border-border-hover'
            }`}
          >
            <AudioVisualizer
              analyserNode={voiceCall.analyserRef.current}
              isActive={status === 'connected' && isAiSpeaking}
              size={112}
            />
            <GraduationCap
              size={32}
              className={`relative z-10 transition-colors duration-300 ${
                status === 'connected' ? 'text-accent' : 'text-text-tertiary'
              }`}
            />
          </div>
        </div>

        {/* Duration Timer */}
        {status === 'connected' && (
          <p className="font-mono text-xs text-text-tertiary tracking-wider">
            {formatDuration(callDuration)}
          </p>
        )}

        {/* Connecting animation */}
        {status === 'connecting' && (
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-accent"
                style={{
                  animation: `pulseDot 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Transcript section */}
      {status === 'connected' && (
        <div className="flex-1 w-full max-w-2xl overflow-hidden flex flex-col px-6">
          <div
            className={`flex-1 overflow-y-auto px-2 py-3 space-y-3 transition-opacity duration-300 ${
              hasTranscript ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {transcript.map((entry) => (
              <div
                key={entry.id}
                className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    entry.role === 'user'
                      ? 'bg-user-bubble text-user-bubble-text rounded-br-md'
                      : 'bg-surface-2 text-text-primary border border-border-subtle rounded-bl-md'
                  }`}
                >
                  {entry.text}
                </div>
              </div>
            ))}

            {/* Streaming AI response */}
            {pendingAiText && (
              <div className="flex justify-start animate-fade-in">
                <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed bg-surface-2 text-text-primary border border-border-subtle">
                  {pendingAiText}
                  <span className="inline-block w-1.5 h-4 ml-1 bg-accent/60 rounded-sm animate-pulse align-middle" />
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center animate-fade-in-up py-8">
          <p className="text-error text-sm mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-3 text-text-secondary hover:text-text-primary hover:bg-surface-4 transition-all text-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* Controls - fixed at bottom */}
      {(status === 'connected' || status === 'connecting') && (
        <div className="shrink-0 pb-10 pt-4 flex items-center gap-6">
          <button
            onClick={voiceCall.toggleMute}
            disabled={status !== 'connected'}
            title={isMuted ? 'Unmute' : 'Mute'}
            className={`
              w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
              ${isMuted
                ? 'bg-accent/20 text-accent'
                : 'bg-surface-3 text-text-secondary hover:bg-surface-4 hover:text-text-primary'
              }
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <button
            onClick={onClose}
            title="End Call"
            className="w-16 h-16 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      )}
    </div>
  )
}

export function VoiceCallOverlay(props: VoiceCallOverlayProps) {
  return createPortal(<OverlayContent {...props} />, document.body)
}
