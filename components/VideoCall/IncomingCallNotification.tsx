'use client'

import React, { useEffect, useState } from 'react'
import { useVideoCall } from '@/hooks/useChat'

interface IncomingCallProps {
  onAccept?: () => void
  onReject?: () => void
}

export function IncomingCallNotification({ onAccept, onReject }: IncomingCallProps) {
  const { incomingCall } = useVideoCall()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (incomingCall) {
      setIsVisible(true)
      // Ring sound notification
      const audio = new Audio('/sounds/call-ringtone.mp3')
      audio.loop = true
      audio.play().catch(e => console.log('Could not play sound:', e))

      return () => {
        audio.pause()
      }
    }
  }, [incomingCall])

  if (!isVisible || !incomingCall) return null

  const handleAccept = () => {
    setIsVisible(false)
    onAccept?.()
  }

  const handleReject = () => {
    setIsVisible(false)
    onReject?.()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full animate-pulse">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📞</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Incoming Call</h2>
          <p className="text-gray-600 font-semibold">{incomingCall.callerName}</p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={handleReject}
            className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold transition-colors"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}

export default IncomingCallNotification
