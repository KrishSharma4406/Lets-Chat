'use client'
/**
 * VideoCallWindow — full-screen WebRTC voice/video call UI
 * Uses simple-peer for WebRTC, Socket.IO for signaling
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2 } from 'lucide-react'
import SimplePeer from 'simple-peer'
import { useCallStore } from '@/lib/stores/callStore'
import { toast } from 'react-hot-toast'

export default function VideoCallWindow() {
  const { status, callId, remoteUserName, isVideo, isAudioMuted, isVideoOff, toggleMute, toggleVideo, resetCall, setCall } = useCallStore()

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<InstanceType<typeof SimplePeer> | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const durationRef = useRef(0)
  const [duration, setDuration] = useState(0)
  const [speakerEnabled, setSpeakerEnabled] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const processedSignalsRef = useRef<Set<string>>(new Set())

  const isActive = status === 'active'
  const isCalling = status === 'calling'

  /** Get local media */
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo ? { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user' // Front camera on mobile
        } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      
      // Ensure all tracks are enabled
      stream.getTracks().forEach(track => {
        track.enabled = true
      })
      
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        // Ensure autoplay works
        localVideoRef.current.play().catch(err => console.debug('Autoplay error:', err))
      }
      return stream
    } catch {
      toast.error('Could not access camera/microphone')
      resetCall()
      return null
    }
  }, [isVideo, resetCall])

  const cleanUp = useCallback(() => {
    peerRef.current?.destroy()
    peerRef.current = null
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    pollTimerRef.current = null
    if (statusPollRef.current) clearInterval(statusPollRef.current)
    statusPollRef.current = null
    durationRef.current = 0
    setDuration(0)
    processedSignalsRef.current.clear()
    resetCall()
  }, [resetCall])

  const handleEndCall = useCallback(() => {
    // Notify other user via database update with current duration
    if (callId) {
      fetch(`/api/video-calls/${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended', endedAt: new Date(), duration: durationRef.current }),
      }).catch(err => console.debug('End call update error:', err))
    }
    cleanUp()
  }, [callId, cleanUp])

  const createPeer = useCallback((stream: MediaStream, initiator: boolean) => {
    if (peerRef.current) return // Already exists
    
    const peer = new SimplePeer({
      initiator,
      stream,
      trickle: true,
      config: {
        iceServers: [
          { urls: ['stun:stun.l.google.com:19302'] },
          { urls: ['stun:stun1.l.google.com:19302'] },
          { urls: ['stun:stun2.l.google.com:19302'] },
          { urls: ['stun:stun3.l.google.com:19302'] },
          { urls: ['stun:stun4.l.google.com:19302'] },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    peer.on('signal', (data: any) => {
      if (!callId) return
      
      // data.type is 'offer', 'answer', or 'candidate' from simple-peer
      fetch(`/api/video-calls/${callId}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: data.type, data }),
      }).catch(err => console.debug('Signal send error:', err))
    })

    peer.on('stream', (remoteStream: MediaStream) => {
      console.log('[VideoCallWindow] Remote stream received:', remoteStream.getTracks().length, 'tracks')
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
        // Ensure autoplay works
        remoteVideoRef.current.play().catch(err => console.debug('Remote playback error:', err))
      }
      
      // Ensure timer is started when stream is received
      if (!timerRef.current && status === 'active') {
        timerRef.current = setInterval(() => {
          durationRef.current += 1
          setDuration((d) => d + 1)
        }, 1000)
      }
    })

    peer.on('connect', () => {
      console.log('[VideoCallWindow] Peer connection established')
      // Update status to active for both caller and callee
      // This ensures timer starts and video is shown
      setCall({ status: 'active' })
    })

    peer.on('error', (err: Error) => {
      console.error('Peer error:', err)
      toast.error('Call connection failed')
      // Cleanup immediately without calling handleEndCall to avoid circular refs
      cleanUp()
    })

    peerRef.current = peer
  }, [callId, setCall, cleanUp, status])

  /** Handle call initiation (outgoing) and incoming acceptance */
  useEffect(() => {
    if (status !== 'calling' && status !== 'incoming') return
    if (peerRef.current) return // Already initialized
    
    let mounted = true
    startLocalStream().then((stream) => {
      if (!stream || !mounted) return
      const isInitiator = status === 'calling'
      createPeer(stream, isInitiator)
    })
    return () => { mounted = false }
  }, [status, createPeer, startLocalStream])

  /** Start timer when call becomes active */
  useEffect(() => {
    if (status !== 'active') return
    
    // Start timer if not already running
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        durationRef.current += 1
        setDuration((d) => d + 1)
      }, 1000)
    }
    
    return () => {
      // Don't clear timer here, let it continue
    }
  }, [status])

  /** Poll call status to detect when other user ends call */
  useEffect(() => {
    if (status !== 'active' || !callId) return

    const pollCallStatus = async () => {
      try {
        const res = await fetch(`/api/video-calls/${callId}`)
        if (!res.ok) return
        
        const call = await res.json()
        
        // If call status changed to ended by other user, clean up
        if (call.status === 'ended' || call.status === 'rejected') {
          console.log('[VideoCallWindow] Call ended by other user, cleaning up')
          cleanUp()
        }
      } catch (err) {
        console.debug('Status poll error:', err)
      }
    }

    // Poll every 1 second for call status changes
    statusPollRef.current = setInterval(pollCallStatus, 1000)
    
    // Check immediately
    pollCallStatus()

    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current)
    }
  }, [callId, status, cleanUp])

  /** WebRTC signaling handlers - poll database instead of Socket.IO */
  useEffect(() => {
    if (!callId || !peerRef.current) return

    const pollSignals = async () => {
      try {
        const res = await fetch(`/api/video-calls/${callId}/signal`)
        if (!res.ok) return
        
        const signals: Array<{ fromUserId: string; id: string; type: string; data: unknown }> = await res.json()
        signals.forEach((signal) => {
          try {
            const id = `${signal.fromUserId}-${signal.id}-${signal.type}`
            if (processedSignalsRef.current.has(id)) return
            processedSignalsRef.current.add(id)

            if (!peerRef.current) return
            peerRef.current.signal(signal.data)
          } catch (err) {
            console.debug('Signal error:', err)
          }
        })
      } catch (err) {
        console.debug('Signal poll error:', err)
      }
    }

    // Poll every 500ms for signals (much faster than call polling)
    pollTimerRef.current = setInterval(pollSignals, 500)

    // Also check once immediately
    pollSignals()

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [callId])

  const handleMuteToggle = useCallback(() => {
    // Calculate new muted state BEFORE toggling
    const willBeMuted = !isAudioMuted
    
    // Update store
    toggleMute()
    
    // Update audio tracks - if will be muted, disable; if will be unmuted, enable
    const audioTracks = localStreamRef.current?.getAudioTracks() || []
    audioTracks.forEach((t) => {
      t.enabled = !willBeMuted
    })
    console.log('[handleMuteToggle] Audio muted:', willBeMuted, 'tracks:', audioTracks.length)
  }, [isAudioMuted, toggleMute])

  const handleVideoToggle = useCallback(() => {
    // Calculate new video state BEFORE toggling
    const willBeOff = !isVideoOff
    
    // Update store
    toggleVideo()
    
    // Update video tracks - if will be off, disable; if will be on, enable
    const videoTracks = localStreamRef.current?.getVideoTracks() || []
    videoTracks.forEach((t) => {
      t.enabled = !willBeOff
    })
    console.log('[handleVideoToggle] Video off:', willBeOff, 'tracks:', videoTracks.length)
  }, [isVideoOff, toggleVideo])

  const handleSpeakerToggle = useCallback(() => {
    const newSpeakerState = !speakerEnabled
    setSpeakerEnabled(newSpeakerState)
    
    // Control audio output volume
    if (remoteVideoRef.current) {
      // If speaker on, set to normal volume; if off, mute
      remoteVideoRef.current.volume = newSpeakerState ? 1 : 0
      remoteVideoRef.current.muted = !newSpeakerState
    }
    console.log('[handleSpeakerToggle] Speaker enabled:', newSpeakerState)
  }, [speakerEnabled])

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (status === 'idle' || status === 'ended') return null

  const avatarLetter = (remoteUserName || 'U')[0].toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0B0B0B' }}>
      {/* Remote video / avatar */}
      <div className="flex-1 relative flex items-center justify-center">
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          controls={false}
          className="w-full h-full object-contain" 
          style={{ display: isActive ? 'block' : 'none', background: '#000' }} 
        />

        {/* Avatar placeholder when call not yet connected */}
        {!isActive && (
          <div className="flex flex-col items-center space-y-4 text-white text-center">
            <div className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold animate-pulse-ring"
              style={{ background: 'var(--brand-primary)' }}>
              {avatarLetter}
            </div>
            <p className="text-2xl font-semibold">{remoteUserName || 'Unknown'}</p>
            <p className="text-white/60">{isCalling ? 'Calling…' : 'Connecting…'}</p>
          </div>
        )}

        {/* Duration badge */}
        {isActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm font-mono px-4 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.5)' }}>
            {formatDuration(duration)}
          </div>
        )}

        {/* Local PIP */}
        {isVideo && (
          <div className="absolute bottom-4 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 shadow-lg"
            style={{ borderColor: 'var(--brand-accent)' }}>
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline 
              controls={false}
              className="w-full h-full object-cover" 
            />
          </div>
        )}
      </div>

      {/* Controls bar - with safe area support for mobile */}
      <div className="flex items-center justify-center space-x-6 pb-6 pt-6" style={{ 
        background: 'rgba(0,0,0,0.7)',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))'
      }}>
        <CallBtn icon={isAudioMuted ? <MicOff size={22} /> : <Mic size={22} />}
          label={isAudioMuted ? 'Unmute' : 'Mute'}
          onClick={handleMuteToggle}
          active={isAudioMuted}
        />
        {isVideo && (
          <CallBtn icon={isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
            label={isVideoOff ? 'Show cam' : 'Hide cam'}
            onClick={handleVideoToggle}
            active={isVideoOff}
          />
        )}
        <CallBtn icon={<Volume2 size={22} />} 
          label={speakerEnabled ? 'Speaker' : 'Muted'} 
          onClick={handleSpeakerToggle}
          active={!speakerEnabled}
        />
        {/* End call */}
        <button onClick={handleEndCall}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
          style={{ background: '#EF4444' }}>
          <PhoneOff size={26} className="text-white" />
        </button>
      </div>
    </div>
  )
}

function CallBtn({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center space-y-1">
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-all"
        style={{ background: active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)' }}>
        {icon}
      </div>
      <span className="text-xs text-white/70">{label}</span>
    </button>
  )
}
