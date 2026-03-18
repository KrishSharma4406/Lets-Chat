'use client'
/**
 * VideoCallWindow — full-screen WebRTC voice/video call UI
 * Uses simple-peer for WebRTC, Socket.IO for signaling
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Mic, MicOff, Video, VideoOff, PhoneOff, RotateCcw, Volume2 } from 'lucide-react'
import SimplePeer from 'simple-peer'
import { useCallStore } from '@/lib/stores/callStore'
import { useSocketStore } from '@/lib/stores/socketStore'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

export default function VideoCallWindow() {
  const { data: session } = useSession()
  const { socket } = useSocketStore()
  const { status, callId, remoteUserId, remoteUserName, remoteUserImage, isVideo, isAudioMuted, isVideoOff, toggleMute, toggleVideo, resetCall, setCall } = useCallStore()

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<SimplePeer.Instance | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const [duration, setDuration] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isActive = status === 'active'
  const isCalling = status === 'calling'

  /** Get local media */
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo, audio: true,
      })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      return stream
    } catch {
      toast.error('Could not access camera/microphone')
      resetCall()
      return null
    }
  }, [isVideo, resetCall])

  /** Create WebRTC peer (initiator = caller) */
  const createPeer = useCallback((stream: MediaStream, initiator: boolean) => {
    const peer = new SimplePeer({
      initiator,
      stream,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    })

    peer.on('signal', (data) => {
      if (!socket || !remoteUserId) return
      if (initiator) {
        socket.emit('webrtc:offer', { to: remoteUserId, offer: data, callId })
      } else {
        socket.emit('webrtc:answer', { to: remoteUserId, answer: data, callId })
      }
    })

    peer.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
      setCall({ status: 'active', startedAt: new Date() })
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    })

    peer.on('error', (err) => {
      console.error('Peer error:', err)
      toast.error('Call connection failed')
      handleEndCall()
    })

    peerRef.current = peer
  }, [socket, remoteUserId, callId]) // eslint-disable-line

  /** Handle call initiation (outgoing) */
  useEffect(() => {
    if (status !== 'calling') return
    let mounted = true
    startLocalStream().then((stream) => {
      if (!stream || !mounted) return
      createPeer(stream, true) // initiator
    })
    return () => { mounted = false }
  }, [status]) // eslint-disable-line

  /** WebRTC signaling handlers */
  useEffect(() => {
    if (!socket) return

    const onOffer = async ({ offer }: { offer: SimplePeer.SignalData }) => {
      if (status !== 'active' && status !== 'incoming') return
      const stream = localStreamRef.current || await startLocalStream()
      if (!stream) return
      if (!peerRef.current) createPeer(stream, false)
      peerRef.current?.signal(offer)
    }

    const onAnswer = ({ answer }: { answer: SimplePeer.SignalData }) => {
      peerRef.current?.signal(answer)
    }

    const onIce = ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      peerRef.current?.signal({ type: 'candidate', candidate } as unknown as SimplePeer.SignalData)
    }

    const onEnded = () => { toast('Call ended'); cleanUp() }

    socket.on('webrtc:offer', onOffer)
    socket.on('webrtc:answer', onAnswer)
    socket.on('webrtc:ice', onIce)
    socket.on('call:ended', onEnded)

    return () => {
      socket.off('webrtc:offer', onOffer)
      socket.off('webrtc:answer', onAnswer)
      socket.off('webrtc:ice', onIce)
      socket.off('call:ended', onEnded)
    }
  }, [socket, status]) // eslint-disable-line

  const cleanUp = useCallback(() => {
    peerRef.current?.destroy()
    peerRef.current = null
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    resetCall()
  }, [resetCall])

  const handleEndCall = useCallback(() => {
    socket?.emit('call:end', { callId, userId: session?.user?.id })
    cleanUp()
  }, [socket, callId, session, cleanUp])

  const handleMuteToggle = useCallback(() => {
    toggleMute()
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled })
  }, [toggleMute])

  const handleVideoToggle = useCallback(() => {
    toggleVideo()
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled })
  }, [toggleVideo])

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (status === 'idle' || status === 'ended') return null

  const avatarLetter = (remoteUserName || 'U')[0].toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0B0B0B' }}>
      {/* Remote video / avatar */}
      <div className="flex-1 relative flex items-center justify-center">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" style={{ display: isActive ? 'block' : 'none' }} />

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
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center space-x-6 pb-10 pt-6" style={{ background: 'rgba(0,0,0,0.7)' }}>
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
        <CallBtn icon={<Volume2 size={22} />} label="Speaker" onClick={() => { }} />
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
