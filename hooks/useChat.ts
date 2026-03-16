import { useEffect, useState, useCallback, useRef } from 'react'
import io, { Socket } from 'socket.io-client'

interface UseSocketOptions {
  userId?: string
  token?: string
}

/**
 * Hook for managing Socket.IO connections
 */
export function useSocket(options: UseSocketOptions & { disabled?: boolean } = {}) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (options.disabled) return

    setIsLoading(true)
    
    const socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      auth: {
        token: options.token || localStorage.getItem('auth-token')
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })

    socket.on('connect', () => {
      setIsConnected(true)
      setIsLoading(false)
      console.log('Socket connected:', socket.id)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [options.disabled, options.token])

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
      return () => {
        socketRef.current?.off(event, callback)
      }
    }
  }, [])

  const off = useCallback((event: string) => {
    if (socketRef.current) {
      socketRef.current.off(event)
    }
  }, [])

  return {
    socket: socketRef.current,
    isConnected,
    isLoading,
    emit,
    on,
    off
  }
}

/**
 * Hook for managing encryption/decryption
 */
export function useEncryption() {
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [privateKey, setPrivateKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load or generate encryption keys on component mount
    loadEncryptionKeys()
  }, [])

  const loadEncryptionKeys = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/encryption/keys', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to load encryption keys')
      }

      const data = await response.json()
      setPublicKey(data.publicKey)
      
      // In a real app, private key should be stored securely (e.g., IndexedDB)
      // Never send private key to server
      const storedKeyPair = localStorage.getItem('keypair')
      if (storedKeyPair) {
        const { privateKey: stored } = JSON.parse(storedKeyPair)
        setPrivateKey(stored)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const getRecipientPublicKey = async (userId: string): Promise<string> => {
    const response = await fetch('/api/encryption/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId })
    })

    if (!response.ok) {
      throw new Error('Failed to get recipient public key')
    }

    const data = await response.json()
    return data.publicKey
  }

  return {
    publicKey,
    privateKey,
    isLoading,
    error,
    loadEncryptionKeys,
    getRecipientPublicKey
  }
}

/**
 * Hook for managing typing indicators
 */
export function useTypingIndicator(conversationId: string) {
  const [typingUsers, setTypingUsers] = useState<any[]>([])
  const { emit, on, off } = useSocket()
  const typingTimeoutRef = useRef<any>(null)

  useEffect(() => {
    const unsubscribe = on('user_typing', (data) => {
      if (data.conversationId === conversationId) {
        // User is typing
      }
    })

    return () => unsubscribe?.()
  }, [conversationId, on])

  const startTyping = useCallback(() => {
    emit('typing', conversationId)
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, 3000)
  }, [conversationId, emit])

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    emit('stop_typing', conversationId)
  }, [conversationId, emit])

  return {
    typingUsers,
    startTyping,
    stopTyping
  }
}

/**
 * Hook for managing video calls
 */
export function useVideoCall() {
  const [callInProgress, setCallInProgress] = useState(false)
  const [incomingCall, setIncomingCall] = useState<any>(null)
  const { emit, on } = useSocket()

  useEffect(() => {
    const unsubscribe = on('incoming_call', (data) => {
      setIncomingCall(data)
    })

    return () => unsubscribe?.()
  }, [on])

  const initiateCall = useCallback(async (recipientId: string) => {
    try {
      const response = await fetch('/api/video-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipientId })
      })

      if (!response.ok) {
        throw new Error('Failed to initiate call')
      }

      const call = await response.json()
      setCallInProgress(true)

      // Emit call initiation for real-time notification
      emit('call_initiated', {
        callerId: call.caller.id,
        callerName: call.caller.name,
        callId: call.id,
        recipientId
      })

      return call
    } catch (error) {
      console.error('Failed to initiate call:', error)
      throw error
    }
  }, [emit])

  const acceptCall = useCallback((callId: string) => {
    return fetch(`/api/video-calls/${callId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: 'accepted' })
    })
  }, [])

  const rejectCall = useCallback((callId: string) => {
    return fetch(`/api/video-calls/${callId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: 'rejected' })
    })
  }, [])

  const endCall = useCallback((callId: string, duration?: number) => {
    setCallInProgress(false)
    return fetch(`/api/video-calls/${callId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: 'ended', duration })
    })
  }, [])

  return {
    callInProgress,
    incomingCall,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall
  }
}

/**
 * Hook for managing user blocking
 */
export function useBlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadBlockedUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/users/blocked', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to load blocked users')
      }

      const data = await response.json()
      setBlockedUsers(data)
    } catch (error) {
      console.error('Failed to load blocked users:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const blockUser = useCallback(async (userId: string) => {
    try {
      const response = await fetch('/api/users/blocked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ blockedUserId: userId })
      })

      if (!response.ok) {
        throw new Error('Failed to block user')
      }

      await loadBlockedUsers()
    } catch (error) {
      console.error('Failed to block user:', error)
      throw error
    }
  }, [loadBlockedUsers])

  const unblockUser = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/users/blocked/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to unblock user')
      }

      await loadBlockedUsers()
    } catch (error) {
      console.error('Failed to unblock user:', error)
      throw error
    }
  }, [loadBlockedUsers])

  useEffect(() => {
    loadBlockedUsers()
  }, [loadBlockedUsers])

  return {
    blockedUsers,
    isLoading,
    blockUser,
    unblockUser,
    loadBlockedUsers
  }
}

export default {
  useSocket,
  useEncryption,
  useTypingIndicator,
  useVideoCall,
  useBlockedUsers
}
