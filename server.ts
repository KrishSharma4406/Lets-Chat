/**
 * Standalone Socket.IO server — runs on port 3000 alongside Next.js dev server.
 * Start with: npx ts-node --project tsconfig.server.json server.ts
 * Or via: npm run server
 */
import { createServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'

const PORT = Number(process.env.SOCKET_PORT || 3000)
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/* ── Types ──────────────────────────────────────────────────── */
interface AuthSocket extends Socket {
    userId?: string
    userName?: string
}

/* ── HTTP + Socket.IO bootstrap ─────────────────────────────── */
const httpServer = createServer()
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: [ALLOWED_ORIGIN, 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
})

/* ── Auth middleware ─────────────────────────────────────────── */
io.use((socket: AuthSocket, next) => {
    const userId = socket.handshake.auth?.userId as string | undefined
    const userName = socket.handshake.auth?.userName as string | undefined

    if (!userId) {
        // Allow unauthenticated connections in dev — just warn
        console.warn('[Socket] Unauthenticated connection:', socket.id)
    }
    socket.userId = userId
    socket.userName = userName
    next()
})

/* ── Online users map: userId -> Set<socketId> ──────────────── */
const onlineUsers = new Map<string, Set<string>>()

function addOnline(userId: string, socketId: string) {
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
    onlineUsers.get(userId)!.add(socketId)
}
function removeOnline(userId: string, socketId: string) {
    onlineUsers.get(userId)?.delete(socketId)
    if (onlineUsers.get(userId)?.size === 0) onlineUsers.delete(userId)
}
function isOnline(userId: string): boolean {
    return (onlineUsers.get(userId)?.size ?? 0) > 0
}

/* ── Connection handler ──────────────────────────────────────── */
io.on('connection', (socket: AuthSocket) => {
    const userId = socket.userId

    if (userId) {
        socket.join(`user:${userId}`)
        addOnline(userId, socket.id)

        // Broadcast presence to everyone
        io.emit('presence:update', { userId, isOnline: true })
        console.log(`[Socket] ${userId} connected (${socket.id})`)
    }

    /* ── Join conversation room ─────────────────────────── */
    socket.on('join:conversation', (conversationId: string) => {
        socket.join(`conv:${conversationId}`)
    })

    socket.on('leave:conversation', (conversationId: string) => {
        socket.leave(`conv:${conversationId}`)
    })

    /* ── Messaging ──────────────────────────────────────── */
    socket.on('message:send', (payload: {
        conversationId: string
        message: Record<string, unknown>
    }) => {
        socket.to(`conv:${payload.conversationId}`).emit('message:new', payload.message)
    })

    socket.on('message:read', (payload: {
        conversationId: string
        messageId: string
        userId: string
    }) => {
        socket.to(`conv:${payload.conversationId}`).emit('message:read', payload)
    })

    socket.on('message:delete', (payload: {
        conversationId: string
        messageId: string
    }) => {
        io.to(`conv:${payload.conversationId}`).emit('message:deleted', payload)
    })

    socket.on('message:edit', (payload: {
        conversationId: string
        messageId: string
        content: string
    }) => {
        io.to(`conv:${payload.conversationId}`).emit('message:edited', payload)
    })

    socket.on('reaction:add', (payload: {
        conversationId: string
        messageId: string
        userId: string
        emoji: string
    }) => {
        io.to(`conv:${payload.conversationId}`).emit('reaction:update', payload)
    })

    /* ── Typing ─────────────────────────────────────────── */
    socket.on('typing:start', (payload: { conversationId: string; userId: string; userName: string }) => {
        socket.to(`conv:${payload.conversationId}`).emit('typing:start', payload)
    })

    socket.on('typing:stop', (payload: { conversationId: string; userId: string }) => {
        socket.to(`conv:${payload.conversationId}`).emit('typing:stop', payload)
    })

    /* ── Voice/Video Calls ──────────────────────────────── */
    socket.on('call:initiate', (data: {
        callId: string
        callerId: string
        callerName: string
        callerImage: string
        recipientId: string
        isVideo: boolean
    }) => {
        io.to(`user:${data.recipientId}`).emit('call:incoming', data)
    })

    socket.on('call:accept', (data: { callId: string; callerId: string }) => {
        io.to(`user:${data.callerId}`).emit('call:accepted', data)
    })

    socket.on('call:reject', (data: { callId: string; callerId: string }) => {
        io.to(`user:${data.callerId}`).emit('call:rejected', data)
    })

    socket.on('call:end', (data: { callId: string; userId: string }) => {
        io.to(`call:${data.callId}`).emit('call:ended', data)
    })

    socket.on('call:join', (callId: string) => {
        socket.join(`call:${callId}`)
    })

    /* ── WebRTC Signaling ───────────────────────────────── */
    socket.on('webrtc:offer', (data: { to: string; offer: any; callId: string }) => {
        io.to(`user:${data.to}`).emit('webrtc:offer', { from: socket.userId, offer: data.offer, callId: data.callId })
    })

    socket.on('webrtc:answer', (data: { to: string; answer: any; callId: string }) => {
        io.to(`user:${data.to}`).emit('webrtc:answer', { from: socket.userId, answer: data.answer, callId: data.callId })
    })

    socket.on('webrtc:ice', (data: { to: string; candidate: any; callId: string }) => {
        io.to(`user:${data.to}`).emit('webrtc:ice', { from: socket.userId, candidate: data.candidate })
    })

    /* ── Presence query ─────────────────────────────────── */
    socket.on('presence:query', (userIds: string[], cb: (map: Record<string, boolean>) => void) => {
        const result: Record<string, boolean> = {}
        userIds.forEach((id) => { result[id] = isOnline(id) })
        cb(result)
    })

    /* ── Disconnect ─────────────────────────────────────── */
    socket.on('disconnect', () => {
        if (userId) {
            removeOnline(userId, socket.id)
            if (!isOnline(userId)) {
                io.emit('presence:update', { userId, isOnline: false, lastSeen: new Date().toISOString() })
                console.log(`[Socket] ${userId} went offline`)
            }
        }
    })
})

httpServer.listen(PORT, () => {
    console.log(`[Socket.IO] Server listening on port ${PORT}`)
})
