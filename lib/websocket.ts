import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import type { NextApiRequest, NextApiResponse } from 'next'

interface ExtendedSocket extends Socket {
  userId?: string
  conversationId?: string
}

export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  })

  // Middleware to authenticate socket connections
  io.use((socket: ExtendedSocket, next) => {
    const token = socket.handshake.auth.token
    // Verify token here - for now just accept if token exists
    if (token) {
      next()
    } else {
      next(new Error('Authentication failed'))
    }
  })

  // Connection event
  io.on('connection', (socket: ExtendedSocket) => {
    console.log('User connected:', socket.id)

    // Join conversation room
    socket.on('join_conversation', (conversationId: string, userId: string) => {
      socket.userId = userId
      socket.conversationId = conversationId
      socket.join(`conversation_${conversationId}`)
      
      // Notify others that user joined
      socket.to(`conversation_${conversationId}`).emit('user_joined', {
        userId,
        conversationId,
        timestamp: new Date()
      })
    })

    // Handle typing indicator
    socket.on('typing', (conversationId: string, userId: string) => {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId,
        conversationId
      })
    })

    // Handle stopped typing
    socket.on('stop_typing', (conversationId: string, userId: string) => {
      socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
        userId,
        conversationId
      })
    })

    // Handle new message
    socket.on('new_message', (message: any) => {
      socket.to(`conversation_${message.conversationId}`).emit('message_received', message)
    })

    // Handle message read
    socket.on('message_read', (messageId: string, conversationId: string) => {
      socket.to(`conversation_${conversationId}`).emit('message_marked_read', {
        messageId,
        timestamp: new Date()
      })
    })

    // Handle message deleted
    socket.on('message_deleted', (messageId: string, conversationId: string) => {
      socket.to(`conversation_${conversationId}`).emit('message_was_deleted', {
        messageId
      })
    })

    // Handle message edited
    socket.on('message_edited', (data: any) => {
      socket.to(`conversation_${data.conversationId}`).emit('message_was_edited', data)
    })

    // Handle reaction
    socket.on('reaction_added', (data: any) => {
      socket.to(`conversation_${data.conversationId}`).emit('reaction_received', data)
    })

    // Video call signaling
    socket.on('call_initiated', (data: any) => {
      io.to(data.recipientId).emit('incoming_call', {
        callerId: data.callerId,
        callerName: data.callerName,
        callId: data.callId
      })
    })

    socket.on('call_accepted', (data: any) => {
      socket.to(`call_${data.callId}`).emit('call_accepted', data)
      socket.join(`call_${data.callId}`)
    })

    socket.on('call_rejected', (data: any) => {
      io.to(`call_${data.callId}`).emit('call_rejected', data)
    })

    socket.on('call_ended', (data: any) => {
      io.to(`call_${data.callId}`).emit('call_ended', data)
      io.socketsLeave(`call_${data.callId}`)
    })

    // WebRTC signaling
    socket.on('webrtc_offer', (data: any) => {
      socket.to(data.to).emit('webrtc_offer', {
        from: socket.id,
        offer: data.offer
      })
    })

    socket.on('webrtc_answer', (data: any) => {
      socket.to(data.to).emit('webrtc_answer', {
        from: socket.id,
        answer: data.answer
      })
    })

    socket.on('webrtc_ice', (data: any) => {
      socket.to(data.to).emit('webrtc_ice', {
        from: socket.id,
        candidate: data.candidate
      })
    })

    // Typing indicator cleanup on disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
      
      if (socket.conversationId && socket.userId) {
        socket.to(`conversation_${socket.conversationId}`).emit('user_left', {
          userId: socket.userId,
          conversationId: socket.conversationId
        })
      }
    })

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })
  })

  return io
}

/**
 * Emit message to specific user across all their socket connections
 */
export function emitToUser(io: SocketIOServer, userId: string, event: string, data: any) {
  io.to(userId).emit(event, data)
}

/**
 * Emit message to all users in a conversation
 */
export function emitToConversation(
  io: SocketIOServer,
  conversationId: string,
  event: string,
  data: any
) {
  io.to(`conversation_${conversationId}`).emit(event, data)
}

/**
 * Emit message to all clients except sender
 */
export function emitToOthers(
  socket: ExtendedSocket,
  event: string,
  data: any
) {
  socket.broadcast.emit(event, data)
}

export default {
  initializeSocketIO,
  emitToUser,
  emitToConversation,
  emitToOthers
}
