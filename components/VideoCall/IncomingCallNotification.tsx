'use client'
/**
 * IncomingCallNotification — slide-up notification for incoming calls
 */
import { useEffect } from 'react'
import { Phone, PhoneOff, Video } from 'lucide-react'
import Image from 'next/image'
import { useCallStore } from '@/lib/stores/callStore'
import { useSocketStore } from '@/lib/stores/socketStore'

export default function IncomingCallNotification() {
  const { status, callId, conversationId, remoteUserId, remoteUserName, remoteUserImage, isVideo, setCall, resetCall } = useCallStore()
  const { socket } = useSocketStore()
  
  const handleReject = () => {
    socket?.emit('call:reject', { callId, callerId: remoteUserId, conversationId })
    resetCall()
  }

  // Auto-reject after 45 seconds
  useEffect(() => {
    if (status !== 'incoming') return
    const t = setTimeout(() => {
      handleReject()
    }, 45000)
    return () => clearTimeout(t)
  }, [status]) // eslint-disable-line

  if (status !== 'incoming') return null

  const handleAccept = async () => {
    if (!socket || !remoteUserId) return
    socket.emit('call:accept', { callId, callerId: remoteUserId, conversationId })
    socket.emit('call:join', callId)
    setCall({ status: 'active', startedAt: new Date() })
  }


  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-85 rounded-3xl shadow-xl overflow-hidden animate-slide-up"
      style={{ background: 'var(--brand-primary)' }}>
      <div className="relative p-5">
        {/* Animated ring */}
        <div className="absolute inset-0 rounded-3xl" style={{ background: 'rgba(37,211,102,0.15)' }} />

        <div className="relative flex items-center space-x-4">
          {/* Caller avatar */}
          <div className="relative">
            {remoteUserImage ? (
              <Image src={remoteUserImage} alt={remoteUserName || ''} width={56} height={56} className="rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                {(remoteUserName || 'U')[0].toUpperCase()}
              </div>
            )}
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full animate-pulse-ring border-2 border-white/30" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/70 font-medium">{isVideo ? 'Incoming video call' : 'Incoming voice call'}</p>
            <p className="text-white font-semibold text-base truncate">{remoteUserName || 'Unknown'}</p>
          </div>

          {/* Decline */}
          <button onClick={handleReject}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-90"
            style={{ background: '#EF4444' }}>
            <PhoneOff size={20} className="text-white" />
          </button>

          {/* Accept */}
          <button onClick={handleAccept}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-90"
            style={{ background: 'var(--brand-accent)' }}>
            {isVideo ? <Video size={20} className="text-white" /> : <Phone size={20} className="text-white" />}
          </button>
        </div>
      </div>
    </div>
  )
}
