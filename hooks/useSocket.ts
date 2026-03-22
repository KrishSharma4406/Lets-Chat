'use client'
/**
 * useSocket — global singleton Socket.IO client hook.
 * Connects once per session, stores in Zustand, syncs presence.
 */
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import io from 'socket.io-client'
import { useSocketStore } from '@/lib/stores/socketStore'
import { useChatStore } from '@/lib/stores/chatStore'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'

export function useSocket() {
    const { data: session } = useSession()
    const { socket, setSocket, setConnected } = useSocketStore()
    const { setUserOnline } = useChatStore()

    useEffect(() => {
        if (!session?.user?.id || socket) return

        console.log('[useSocket] Connecting to:', SOCKET_URL)
        const s = io(SOCKET_URL, {
            auth: {
                userId: session.user.id,
                userName: session.user.name || session.user.email,
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
        })

        s.on('connect', () => {
            console.log('[useSocket] Connected to Socket.IO server')
            setConnected(true)
        })

        s.on('disconnect', (reason) => {
            console.log('[useSocket] Disconnected:', reason)
            setConnected(false)
        })

        s.on('connect_error', (error) => {
            console.warn('[useSocket] Connection error:', error.message)
        })

        s.on('presence:update', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
            setUserOnline(userId, isOnline)
        })

        setSocket(s)

        return () => {
            s.disconnect()
            setSocket(null)
            setConnected(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user?.id])

    return useSocketStore((s) => s)
}
