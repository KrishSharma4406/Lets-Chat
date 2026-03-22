'use client'
/**
 * useMessages — paginated message fetching with real-time Socket.IO updates.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useSocketStore } from '@/lib/stores/socketStore'

export interface MessageSender {
    id: string
    name: string | null
    email: string
    image: string | null
}

export interface Reaction {
    emoji: string
    userId: string
    user: { name: string | null; image: string | null }
}

export interface Message {
    id: string
    content: string
    image?: string | null
    fileName?: string | null
    fileType?: string | null
    messageType?: string
    createdAt: string
    isEdited?: boolean
    isDeleted?: boolean
    replyToId?: string | null
    replyTo?: { id: string; content: string; sender: MessageSender } | null
    sender: MessageSender
    seenBy?: Array<{ userId: string; seenAt: string }>
    reactions?: Reaction[]
}

const PAGE_SIZE = 30

export function useMessages(conversationId: string | null) {
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const cursorRef = useRef<string | null>(null)
    const { socket } = useSocketStore()

    /* ── Fetch a page ───────────────────────────────────── */
    const fetchPage = useCallback(async (cursor?: string) => {
        if (!conversationId) {
            console.warn('[useMessages] fetchPage: conversationId is missing')
            return
        }
        setLoading(true)
        try {
            const url = `/api/conversations/${conversationId}/messages?limit=${PAGE_SIZE}${cursor ? `&cursor=${cursor}` : ''}`
            console.log('[useMessages] fetching from:', url)
            
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
            
            const res = await fetch(url, { signal: controller.signal })
            clearTimeout(timeoutId)
            
            console.log('[useMessages] response status:', res.status)
            
            if (!res.ok) {
                let errorDetail = `HTTP ${res.status}`
                try {
                    const errorText = await res.text()
                    if (errorText) errorDetail += `: ${errorText}`
                } catch {}
                console.error('[useMessages] fetch failed:', errorDetail)
                throw new Error(errorDetail)
            }
            
            const data: Message[] = await res.json()
            console.log('[useMessages] messages received:', data.length)

            if (data.length < PAGE_SIZE) setHasMore(false)
            if (data.length > 0) cursorRef.current = data[data.length - 1].id

            // API now returns oldest-first (asc), append new older messages when paginating
            setMessages((prev) => cursor ? [...prev, ...data] : data)
        } catch (e) {
            console.error('[useMessages] fetch error:', {
                error: e instanceof Error ? e.message : String(e),
                conversationId,
                type: e instanceof TypeError ? 'Network/Fetch Error' : 'Other Error'
            })
            setHasMore(false)
        } finally {
            setLoading(false)
        }
    }, [conversationId])

    /* ── Initial load ───────────────────────────────────── */
    useEffect(() => {
        if (!conversationId) {
            console.log('useMessages: conversationId not ready, resetting state')
            setMessages([])
            return
        }
        console.log('useMessages: loading messages for conversation:', conversationId)
        cursorRef.current = null
        setHasMore(true)
        setMessages([])
        fetchPage()
        // Mark read
        fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' }).catch((err) => {
            console.error('Failed to mark conversation as read:', err)
        })
    }, [conversationId, fetchPage])

    /* ── Socket real-time events + Polling fallback ────── */
    useEffect(() => {
        if (!conversationId) return

        // Join if socket available
        if (socket) {
            socket.emit('join:conversation', conversationId)
        }

        const onNew = (msg: Message) => {
            setMessages((prev) => [...prev, msg])
            fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' }).catch(() => { })
        }

        const onDeleted = ({ messageId }: { messageId: string }) => {
            setMessages((prev) =>
                prev.map((m) => m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m)
            )
        }

        const onEdited = ({ messageId, content }: { messageId: string; content: string }) => {
            setMessages((prev) =>
                prev.map((m) => m.id === messageId ? { ...m, content, isEdited: true } : m)
            )
        }

        const onRead = ({ messageId, userId }: { messageId: string; userId: string }) => {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId
                        ? { ...m, seenBy: [...(m.seenBy || []), { userId, seenAt: new Date().toISOString() }] }
                        : m
                )
            )
        }

        const onReaction = ({ messageId, emoji, userId }: { messageId: string; emoji: string; userId: string; conversationId: string }) => {
            setMessages((prev) =>
                prev.map((m) => {
                    if (m.id !== messageId) return m
                    const existing = (m.reactions || []).find((r) => r.emoji === emoji && r.userId === userId)
                    const reactions = existing
                        ? (m.reactions || []).filter((r) => !(r.emoji === emoji && r.userId === userId))
                        : [...(m.reactions || []), { emoji, userId, user: { name: null, image: null } }]
                    return { ...m, reactions }
                })
            )
        }

        // Socket listeners
        if (socket) {
            socket.on('message:new', onNew)
            socket.on('message:deleted', onDeleted)
            socket.on('message:edited', onEdited)
            socket.on('message:read', onRead)
            socket.on('reaction:update', onReaction)
        }

        // Polling fallback: if socket is not connected, poll every 3 seconds
        const pollInterval = setInterval(() => {
            if (!socket?.connected) {
                console.log('[useMessages] Socket not connected, polling for updates...')
                fetchPage()
            }
        }, 3000)

        return () => {
            clearInterval(pollInterval)
            if (socket) {
                socket.emit('leave:conversation', conversationId)
                socket.off('message:new', onNew)
                socket.off('message:deleted', onDeleted)
                socket.off('message:edited', onEdited)
                socket.off('message:read', onRead)
                socket.off('reaction:update', onReaction)
            }
        }
    }, [socket, conversationId, fetchPage])

    const loadMore = useCallback(() => {
        if (!loading && hasMore && cursorRef.current) {
            fetchPage(cursorRef.current)
        }
    }, [loading, hasMore, fetchPage])

    const addOptimistic = useCallback((msg: Message) => {
        setMessages((prev) => [...prev, msg])
    }, [])

    const removeOptimistic = useCallback((tempId: string) => {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
    }, [])

    const replaceOptimistic = useCallback((tempId: string, msg: Message) => {
        setMessages((prev) => prev.map((m) => m.id === tempId ? msg : m))
    }, [])

    return { messages, loading, hasMore, loadMore, addOptimistic, removeOptimistic, replaceOptimistic }
}
