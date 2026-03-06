import { useRef, useCallback, useEffect } from 'react'
import { useVoiceCallStore } from '@/stores/voiceCallStore'
import { apiPost } from '@/lib/api'

interface RealtimeSession {
  client_secret: { value: string; expires_at: number }
}

export function useVoiceCall() {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timerRef = useRef<number | null>(null)
  const speakingCheckRef = useRef<number | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const isStartingRef = useRef(false)

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (speakingCheckRef.current) {
      cancelAnimationFrame(speakingCheckRef.current)
      speakingCheckRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (dcRef.current) {
      try { dcRef.current.close() } catch {}
      dcRef.current = null
    }
    if (pcRef.current) {
      try { pcRef.current.close() } catch {}
      pcRef.current = null
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close() } catch {}
      audioContextRef.current = null
    }
    if (audioElRef.current) {
      audioElRef.current.srcObject = null
      audioElRef.current = null
    }
    analyserRef.current = null
    isStartingRef.current = false
  }, [])

  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)
      const store = useVoiceCallStore.getState()

      switch (data.type) {
        // User speech transcription completed
        case 'conversation.item.input_audio_transcription.completed': {
          const text = data.transcript?.trim()
          if (text) {
            store.addTranscriptEntry({
              id: data.item_id || crypto.randomUUID(),
              role: 'user',
              text,
              timestamp: Date.now(),
            })
          }
          break
        }

        // AI response audio transcript delta (streaming)
        case 'response.audio_transcript.delta': {
          const delta = data.delta || ''
          store.setPendingAiText(store.pendingAiText + delta)
          break
        }

        // AI response audio transcript done
        case 'response.audio_transcript.done': {
          const text = data.transcript?.trim()
          if (text) {
            store.addTranscriptEntry({
              id: data.item_id || crypto.randomUUID(),
              role: 'assistant',
              text,
              timestamp: Date.now(),
            })
          }
          store.setPendingAiText('')
          break
        }
      }
    } catch {
      // Ignore non-JSON or unparseable messages
    }
  }, [])

  const startCall = useCallback(async () => {
    // Guard: prevent double-start
    if (isStartingRef.current) return
    const currentStatus = useVoiceCallStore.getState().status
    if (currentStatus === 'connecting' || currentStatus === 'connected') return

    isStartingRef.current = true
    const { setStatus, setError, setCallDuration, setAiSpeaking } = useVoiceCallStore.getState()

    try {
      setStatus('connecting')
      setCallDuration(0)

      // 1. Request microphone
      let localStream: MediaStream
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        setError('Microphone access denied. Please allow microphone access and try again.')
        isStartingRef.current = false
        return
      }
      streamRef.current = localStream

      // 2. Get ephemeral token
      let ephemeralKey: string
      try {
        const session = await apiPost<RealtimeSession>('/realtime-session', {})
        ephemeralKey = session.client_secret.value
      } catch (e) {
        throw new Error(`Failed to get session token: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }

      // 3. Create peer connection
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      // 4. Set up remote audio playback + analyser
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0]
        if (!remoteStream) return

        const audioEl = new Audio()
        audioEl.srcObject = remoteStream
        audioEl.play()
        audioElRef.current = audioEl

        const source = audioContext.createMediaStreamSource(remoteStream)
        source.connect(analyser)

        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        const checkSpeaking = () => {
          analyser.getByteFrequencyData(dataArray)
          const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length
          const speaking = avg > 10
          const current = useVoiceCallStore.getState().isAiSpeaking
          if (speaking !== current) {
            setAiSpeaking(speaking)
          }
          speakingCheckRef.current = requestAnimationFrame(checkSpeaking)
        }
        checkSpeaking()
      }

      // 5. Add local audio track
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
      })

      // 6. Create data channel for events
      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc

      dc.onopen = () => {
        // Enable input audio transcription + server VAD
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            turn_detection: { type: 'server_vad' },
            input_audio_transcription: { model: 'whisper-1' },
          },
        }))
      }

      dc.onmessage = handleDataChannelMessage

      // 7. Create and set SDP offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // 8. Send offer to OpenAI Realtime API
      let sdpResponse: Response
      try {
        sdpResponse = await fetch(
          'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${ephemeralKey}`,
              'Content-Type': 'application/sdp',
            },
            body: offer.sdp,
          }
        )
      } catch (e) {
        throw new Error(`Network error connecting to OpenAI: ${e instanceof Error ? e.message : 'Unknown'}`)
      }

      if (!sdpResponse.ok) {
        const errorBody = await sdpResponse.text().catch(() => '')
        console.error('[VoiceCall] SDP error:', sdpResponse.status, errorBody)
        throw new Error(`Failed to connect (${sdpResponse.status}): ${sdpResponse.statusText}`)
      }

      // Check if connection was cancelled during the await
      if (pc.signalingState === 'closed') {
        isStartingRef.current = false
        return
      }

      const answerSdp = await sdpResponse.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      // 9. Connected! Start timer
      setStatus('connected')
      isStartingRef.current = false
      const startTime = Date.now()
      timerRef.current = window.setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)

    } catch (err) {
      cleanup()
      const { status } = useVoiceCallStore.getState()
      if (status !== 'idle') {
        setError(err instanceof Error ? err.message : 'Failed to start call')
      }
    }
  }, [cleanup, handleDataChannelMessage])

  const endCall = useCallback(() => {
    cleanup()
    useVoiceCallStore.getState().reset()
  }, [cleanup])

  const toggleMute = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    const { isMuted, setMuted } = useVoiceCallStore.getState()
    stream.getAudioTracks().forEach((track) => {
      track.enabled = isMuted
    })
    setMuted(!isMuted)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
      useVoiceCallStore.getState().reset()
    }
  }, [cleanup])

  return {
    startCall,
    endCall,
    toggleMute,
    analyserRef,
  }
}
