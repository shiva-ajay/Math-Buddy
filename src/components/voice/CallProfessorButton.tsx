import { Phone, PhoneOff } from 'lucide-react'
import { useVoiceCallStore } from '@/stores/voiceCallStore'
import { useVoiceCall } from '@/hooks/useVoiceCall'
import { VoiceCallOverlay } from './VoiceCallOverlay'

export function CallProfessorButton() {
  const status = useVoiceCallStore((s) => s.status)
  const isOverlayOpen = useVoiceCallStore((s) => s.isOverlayOpen)
  const setOverlayOpen = useVoiceCallStore((s) => s.setOverlayOpen)
  const voiceCall = useVoiceCall()

  const isActive = status !== 'idle' && status !== 'error'

  const handleClick = () => {
    if (isActive) {
      voiceCall.endCall()
      setOverlayOpen(false)
    } else {
      setOverlayOpen(true)
      voiceCall.startCall()
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        title={isActive ? 'End Call' : 'Call Professor'}
        className={`
          relative flex items-center gap-2 h-11 w-11 sm:w-auto sm:h-9 px-0 sm:px-3 justify-center sm:justify-start rounded-xl text-sm font-medium
          transition-all duration-200 cursor-pointer
          ${isActive
            ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
            : 'text-text-secondary hover:text-accent hover:bg-accent-muted'
          }
        `}
      >
        {!isActive && (
          <span className="absolute inset-0 rounded-xl animate-pulse-ring" />
        )}
        {isActive ? (
          <>
            <PhoneOff className="size-5 sm:size-4" />
            <span className="hidden sm:inline">End Call</span>
          </>
        ) : (
          <>
            <Phone className="size-5 sm:size-4" />
            <span className="hidden sm:inline">Call Professor</span>
          </>
        )}
      </button>

      {isOverlayOpen && (
        <VoiceCallOverlay
          voiceCall={voiceCall}
          onClose={() => {
            voiceCall.endCall()
            setOverlayOpen(false)
          }}
        />
      )}
    </>
  )
}
