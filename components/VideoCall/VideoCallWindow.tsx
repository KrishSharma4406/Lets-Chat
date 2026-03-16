'use client'

import React, { useEffect, useRef, useState } from 'react'
import SimplePeer from 'simple-peer'
import { useVideoCall } from '@/hooks/useChat'

interface VideoCallWindowProps {
  callId: string
  recipientId: string
  recipientName: string
  isInitiator: boolean
  onCallEnd?: () => void
}

export function VideoCallWindow({
  callId,
  recipientId,
  recipientName,
  isInitiator,
  onCallEnd
}: VideoCallWindowProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isCallActive, setIsCallActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [callDuration, setCallDuration] = useState(0)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<SimplePeer.Instance | null>(null)

  const { endCall } = useVideoCall()

  const handleCallEnd = React.useCallback(async () => {
    try {
      await endCall(callId, callDuration)
      setIsCallActive(false)
      peerRef.current?.destroy()
      stream?.getTracks().forEach(track => track.stop())
      remoteStream?.getTracks().forEach(track => track.stop())
      onCallEnd?.()
    } catch (err) {
      console.error('Failed to end call:', err)
    }
  }, [endCall, callId, callDuration, stream, remoteStream, onCallEnd])

  // Initialize media stream
  useEffect(() => {
    async function initializeMedia() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true
        })
        setStream(mediaStream)

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream
        }

        // Start WebRTC peer connection
        const peer = new SimplePeer({
          initiator: isInitiator,
          trickle: true,
          stream: mediaStream,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        })

        peer.on('signal', (data) => {
          // Send signal to other peer via WebSocket
          const event = isInitiator ? 'webrtc_offer' : 'webrtc_answer'
          // Emit through socket
          console.log('WebRTC signal:', event, data)
        })

        peer.on('stream', (stream) => {
          setRemoteStream(stream)
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream
          }
        })

        peer.on('error', (err) => {
          setError(err.message)
          console.error('WebRTC Error:', err)
        })

        peer.on('close', () => {
          handleCallEnd()
        })

        peerRef.current = peer
        setIsCallActive(true)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to access camera/microphone'
        setError(message)
        console.error('Media error:', err)
      }
    }

    initializeMedia()

    return () => {
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [isInitiator, handleCallEnd, stream])

  // Call duration tracking
  useEffect(() => {
    if (!isCallActive) return

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isCallActive])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsVideoOn(!isVideoOn)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-red-50 rounded-lg p-4">
        <span className="text-red-600 font-semibold mb-2">Call Error</span>
        <p className="text-red-500 text-center">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-black rounded-lg overflow-hidden">
      {/* Remote video (main) */}
      <div className="relative flex-1 bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Local video (small PIP) */}
        <div className="absolute bottom-4 right-4 w-24 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        {/* Call info overlay */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg">
          <p className="font-semibold">{recipientName}</p>
          <p className="text-sm text-gray-300">{formatDuration(callDuration)}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-4 flex justify-center gap-4">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full transition-colors ${
            isMuted
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <span className="text-white text-lg">🎤</span>
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition-colors ${
            !isVideoOn
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={isVideoOn ? 'Turn off video' : 'Turn on video'}
        >
          <span className="text-white text-lg">📹</span>
        </button>

        <button
          onClick={handleCallEnd}
          className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold transition-colors"
        >
          End Call
        </button>
      </div>
    </div>
  )
}

export default VideoCallWindow
