'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function useOnlineStatus() {
  const { data: session } = useSession()

  useEffect(() => {
    if (!session?.user) return

    const updateStatus = async (isOnline: boolean) => {
      try {
        await fetch('/api/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isOnline }),
        })
      } catch (error) {
        console.error('Failed to update online status:', error)
      }
    }

    // Set online when component mounts
    updateStatus(true)

    // Set offline when page is closed/hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateStatus(false)
      } else {
        updateStatus(true)
      }
    }

    const handleBeforeUnload = () => {
      updateStatus(false)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Update status every 30 seconds to keep alive
    const interval = setInterval(() => {
      if (!document.hidden) {
        updateStatus(true)
      }
    }, 30000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearInterval(interval)
      updateStatus(false)
    }
  }, [session])
}
