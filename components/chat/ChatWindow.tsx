/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
/**
 * ChatWindow — full-featured real-time chat window:
 * - Socket.IO real-time messages (no polling)
 * - Infinite scroll pagination (older messages on scroll-up)
 * - Typing indicator
 * - Message actions (reply, edit, delete, react)
 * - Video call button
 * - Presence (online/last seen) in header
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import { formatDistanceToNow } from 'date-fns'
import { Phone, Video, MoreVertical, Search, ArrowLeft, Users } from 'lucide-react'
import Image from 'next/image'
import { useInView } from 'react-intersection-observer'
import { useMessages, type Message } from '@/hooks/useMessages'
import { useChatStore } from '@/lib/stores/chatStore'
import { useSocketStore } from '@/lib/stores/socketStore'
import { useCallStore } from '@/lib/stores/callStore'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import toast from 'react-hot-toast'

interface Props {
  conversationId: string
  onBack?: () => void          // mobile: back to sidebar
}

interface ConvDetails {
  id: string; name: string | null; isGroup: boolean; groupImage?: string | null
  participants: Array<{ user: { id: string; name: string | null; email: string; image: string | null; isOnline?: boolean; lastSeen?: string | null } }>
}

export default function ChatWindow({ conversationId, onBack }: Props) {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id || ''
  const { messages, loading, hasMore, loadMore, addOptimistic, removeOptimistic, replaceOptimistic } = useMessages(conversationId)
  const { typingMap, onlineUsers } = useChatStore()
  const { socket } = useSocketStore()
  const { setCall } = useCallStore()

  const [conv, setConv] = useState<ConvDetails | null>(null)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editMsg, setEditMsg] = useState<Message | null>(null)
  const [aiMessages, setAiMessages] = useState<Message[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [isAiAssistant, setIsAiAssistant] = useState(false)
  const [aiIsTyping, setAiIsTyping] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const firstLoadRef = useRef(true)

  // Infinite scroll sentinel at top
  const { ref: topRef, inView: topInView } = useInView({ threshold: 0 })

  /* ── Fetch conversation details ── */
  useEffect(() => {
    if (!conversationId) return

    // Handle AI Assistant specially
    if (conversationId === 'ai-assistant') {
      setIsAiAssistant(true)
      setConv(null)
      setAiLoading(true)
      
      fetch('/api/ai-assistant')
        .then(r => r.json())
        .then((messages: any[]) => {
          const formattedMessages: Message[] = messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            createdAt: msg.createdAt,
            sender: {
              id: msg.sender === 'ai' ? 'ai-assistant' : currentUserId,
              name: msg.sender === 'ai' ? 'My AI Assistant' : session?.user?.name || null,
              email: msg.sender === 'ai' ? 'ai@assistant.local' : session?.user?.email || '',
              image: msg.sender === 'ai' ? null : session?.user?.image || null,
            },
            seenBy: [],
            reactions: [],
          }))
          setAiMessages(formattedMessages)
        })
        .catch(err => console.error('[ChatWindow] Failed to fetch AI messages:', err))
        .finally(() => setAiLoading(false))
      
      return
    }

    setIsAiAssistant(false)
    fetch('/api/conversations')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((list: ConvDetails[]) => {
        const c = list.find((x) => x.id === conversationId)
        if (c) setConv(c)
      })
      .catch((err) => {
        console.error('[ChatWindow] Failed to fetch conversation details:', err)
      })
  }, [conversationId, currentUserId, session])

  /* ── Scroll to bottom on first load ──────────────────── */
  useEffect(() => {
    if (!loading && firstLoadRef.current) {
      messagesEndRef.current?.scrollIntoView()
      firstLoadRef.current = false
    }
  }, [loading])

  /* ── Scroll to bottom when new message arrives (if near bottom) */
  useEffect(() => {
    if (firstLoadRef.current) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  /* ── Load more on scroll-to-top ──────────────────────── */
  useEffect(() => {
    if (topInView && hasMore && !loading) loadMore()
  }, [topInView, hasMore, loading, loadMore])

  /* ── Mark conversation as read ───────────────────────── */
  useEffect(() => {
    if (!conversationId) return
    const markAsRead = async () => {
      try {
        await fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' })
        socket?.emit('message:read', { conversationId, userId: currentUserId })
      } catch (e) {
        console.error('Failed to mark as read:', e)
      }
    }
    markAsRead()
  }, [conversationId, currentUserId, socket])

  /* ── Socket typing events ──*/
  useEffect(() => {
    if (!socket) return
    const onTypingStart = ({ userId, userName, conversationId: cid }: { userId: string; userName: string; conversationId: string }) => {
      if (cid !== conversationId || userId === currentUserId) return
      setTypingUsers((prev) => prev.includes(userId) ? prev : [...prev, userName || userId])
    }
    const onTypingStop = ({ userId, conversationId: cid }: { userId: string; conversationId: string }) => {
      if (cid !== conversationId) return
      setTypingUsers((prev) => prev.filter((u) => u !== userId && u !== typingMap[cid]?.find((x) => x === userId)))
    }
    socket.on('typing:start', onTypingStart)
    socket.on('typing:stop', onTypingStop)
    return () => {
      socket.off('typing:start', onTypingStart)
      socket.off('typing:stop', onTypingStop)
    }
  }, [socket, conversationId, currentUserId, typingMap])

  /* ── Header: other user info ── */
  const otherUser = conv && !conv.isGroup
    ? conv.participants.find((p) => p.user.id !== currentUserId)?.user
    : null

  const isOnline = otherUser
    ? onlineUsers.has(otherUser.id) || otherUser.isOnline
    : false

  const headerName = isAiAssistant
    ? 'My AI Assistant'
    : conv?.isGroup
      ? (conv.name || 'Group Chat')
      : (otherUser?.name || otherUser?.email || '…')

  const headerSub = isAiAssistant
    ? 'Always here to help'
    : conv?.isGroup
      ? `${conv.participants.length} members`
      : isOnline
        ? 'Online'
        : otherUser?.lastSeen
          ? `Last seen ${formatDistanceToNow(new Date(otherUser.lastSeen), { addSuffix: true })}`
          : 'Offline'

  /* ── Send message ── */
  const handleSend = useCallback(async (
    content: string, image?: string, fileName?: string, fileType?: string, replyToId?: string
  ) => {
    // Handle AI Assistant messages
    if (isAiAssistant) {
      const tempId = `temp_${Date.now()}`
      const userMessage: Message = {
        id: tempId,
        content,
        createdAt: new Date().toISOString(),
        sender: { id: currentUserId, name: session?.user?.name || null, email: session?.user?.email || '', image: session?.user?.image || null },
        seenBy: [],
        reactions: [],
      }

      setAiMessages(prev => [...prev, userMessage])

      try {
        setAiIsTyping(true)
        const res = await fetch('/api/ai-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content }),
        })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || errorData.details || 'Failed to send message')
        }
        const data = await res.json()

        // Add the actual user message and AI response
        setAiMessages(prev => {
          const updated = prev.filter(m => m.id !== tempId)
          return [
            ...updated,
            {
              id: data.userMessage.id,
              content: data.userMessage.content,
              createdAt: data.userMessage.createdAt,
              sender: { id: currentUserId, name: session?.user?.name || null, email: session?.user?.email || '', image: session?.user?.image || null },
              seenBy: [],
              reactions: [],
            },
            {
              id: data.aiMessage.id,
              content: data.aiMessage.content,
              createdAt: data.aiMessage.createdAt,
              sender: { id: 'ai-assistant', name: 'My AI Assistant', email: 'ai@assistant.local', image: null },
              seenBy: [],
              reactions: [],
            },
          ]
        })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to send message'
        console.error('[ChatWindow] AI Assistant error:', err)
        toast.error(errorMsg)
        setAiMessages(prev => prev.filter(m => m.id !== tempId))
      } finally {
        setAiIsTyping(false)
      }
      return
    }

    const tempId = `temp_${Date.now()}`
    const optimistic: Message = {
      id: tempId, content, image, fileName, fileType, replyToId,
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId, name: session?.user?.name || null, email: session?.user?.email || '', image: session?.user?.image || null },
      seenBy: [], reactions: [],
    }
    addOptimistic(optimistic)

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, image, fileName, fileType, replyToId }),
      })
      if (!res.ok) throw new Error('Failed to send')
      const saved: Message = await res.json()
      replaceOptimistic(tempId, saved)

      // Broadcast via Socket.IO
      socket?.emit('message:send', { conversationId, message: saved })
    } catch {
      removeOptimistic(tempId)
      toast.error('Failed to send message')
    }
  }, [conversationId, currentUserId, session, isAiAssistant, addOptimistic, replaceOptimistic, removeOptimistic, socket])

  /* ── Edit message ─────────────────────────────────────── */
  const handleSaveEdit = useCallback(async (messageId: string, content: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error()
      socket?.emit('message:edit', { conversationId, messageId, content })
    } catch {
      toast.error('Could not edit message')
    }
  }, [conversationId, socket])

  /* ── Delete message ───────────────────────────────────── */
  const handleDelete = useCallback(async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}`, { method: 'DELETE' })
      socket?.emit('message:delete', { conversationId, messageId })
    } catch {
      toast.error('Could not delete message')
    }
  }, [conversationId, socket])

  /* ── React to message ─────────────────────────────────── */
  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      })
      socket?.emit('reaction:add', { conversationId, messageId, userId: currentUserId, emoji })
    } catch {
      toast.error('Could not add reaction')
    }
  }, [conversationId, currentUserId, socket])

  /* ── Initiate call ────────────────────────────────────── */
  const handleCall = useCallback((isVideo: boolean) => {
    if (!otherUser) return
    
    console.log('[ChatWindow] Initiating call:', { recipientId: otherUser.id, isVideo })
    
    // Save call to database and get the database ID
    fetch('/api/video-calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: otherUser.id, isVideo }),
    })
      .then(r => {
        if (!r.ok) {
          return r.json().then(data => {
            const errorMsg = data?.details || data?.error || `Failed to initiate call: ${r.status}`
            console.error('[ChatWindow] API Error:', { data, status: r.status })
            throw new Error(errorMsg)
          })
        }
        return r.json()
      })
      .then((dbCall) => {
        console.log('[ChatWindow] Call saved to DB:', dbCall)
        
        // Use the database call ID for all operations
        setCall({
          status: 'calling',
          callId: dbCall.id,      // Use database ID
          dbCallId: dbCall.id,    // Also store as dbCallId
          conversationId,
          remoteUserId: otherUser.id,
          remoteUserName: otherUser.name,
          remoteUserImage: otherUser.image,
          isVideo,
        })
        
        console.log('[ChatWindow] Emitting call:initiate to socket')
        socket?.emit('call:initiate', {
          callId: dbCall.id,
          callerId: currentUserId,
          callerName: session?.user?.name || session?.user?.email,
          callerImage: session?.user?.image,
          recipientId: otherUser.id,
          conversationId,
          isVideo,
        })
      })
      .catch(err => {
        console.error('[ChatWindow] Failed to save call:', err)
        toast.error(err.message || 'Failed to initiate call')
      })
    
    // Send call message to chat immediately (optimistically)
    const callMessage = isVideo ? 'Video call' : 'Voice call'
    const tempId = `temp_call_${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      content: callMessage,
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId, name: session?.user?.name || null, email: session?.user?.email || '', image: session?.user?.image || null },
      seenBy: [],
      reactions: [],
    }
    addOptimistic(optimistic)

    // Send to API
    fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: callMessage }),
    })
      .then((res) => res.json())
      .then((saved: Message) => {
        replaceOptimistic(tempId, saved)
        socket?.emit('message:send', { conversationId, message: saved })
      })
      .catch(() => {
        removeOptimistic(tempId)
      })
  }, [otherUser, currentUserId, session, conversationId, setCall, socket, addOptimistic, replaceOptimistic, removeOptimistic])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-3 z-10 shadow-sm"
        style={{ background: 'var(--brand-primary)', color: 'white' }}>
        {onBack && (
          <button onClick={onBack} className="mr-1 p-1 rounded-full hover:opacity-70 transition-opacity shrink-0">
            <ArrowLeft size={20} className="text-white" />
          </button>
        )}

        {/* Avatar */}
        <div className="relative shrink-0">
          {isAiAssistant ? (
            <Image src="/ai-assistant.png" alt="AI Assistant" width={40} height={40} className="rounded-full object-cover w-10 h-10" />
          ) : conv?.isGroup ? (
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Users size={20} className="text-white" />
            </div>
          ) : otherUser?.image ? (
            <Image src={otherUser.image} alt={headerName} width={40} height={40} className="rounded-full object-cover w-10 h-10" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: 'rgba(255,255,255,0.2)' }}>
              {headerName[0]?.toUpperCase()}
            </div>
          )}
          {isOnline && !conv?.isGroup && !isAiAssistant && (
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-green-600" style={{ background: 'var(--online)' }} />
          )}
        </div>

        <div className="flex-1 min-w-0 cursor-pointer">
          <p className="font-semibold text-white text-sm truncate">{headerName}</p>
          <p className="text-xs text-white/75 truncate">{headerSub}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-1">
          {!conv?.isGroup && !isAiAssistant && (
            <>
              <button onClick={() => handleCall(false)} className="p-2 rounded-full hover:bg-white/10 transition-colors shrink-0">
                <Phone size={18} className="text-white" />
              </button>
              <button onClick={() => handleCall(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors shrink-0">
                <Video size={18} className="text-white" />
              </button>
            </>
          )}
          {!isAiAssistant && (
            <>
              <button className="p-2 rounded-full hover:bg-white/10 transition-colors hidden sm:block shrink-0">
                <Search size={18} className="text-white" />
              </button>
              <button className="p-2 rounded-full hover:bg-white/10 transition-colors shrink-0">
                <MoreVertical size={18} className="text-white" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 sm:py-3 space-y-1 chat-bg">
        {/* Top sentinel for infinite scroll */}
        <div ref={topRef} className="h-1" />

        {(loading || aiLoading) && (
          <div className="flex justify-center py-4">
            <div className="flex space-x-1">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        )}

        {(isAiAssistant ? aiMessages : messages).length === 0 && !loading && !aiLoading && (
          <div className="flex flex-col items-center justify-center h-full space-y-3 py-16">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--brand-primary)' }}>
              {isAiAssistant ? (
                <Image src="/ai-assistant.png" alt="AI Assistant" width={60} height={60} className="rounded-full object-cover" />
              ) : (
                <Users size={28} className="text-white" />
              )}
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {isAiAssistant ? 'Start a conversation with your AI Assistant' : 'No messages yet'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isAiAssistant ? 'Ask me anything!' : 'Start the conversation!'}
            </p>
          </div>
        )}

        {(isAiAssistant ? aiMessages : messages).map((msg, idx) => {
          const messageList = isAiAssistant ? aiMessages : messages
          const isOwn = msg.sender.id === currentUserId || (isAiAssistant && msg.sender.id === currentUserId)
          const prevMsg = messageList[idx - 1]
          const showAvatar = !prevMsg || prevMsg.sender.id !== msg.sender.id
          const showDateSep = !prevMsg || (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000)

          return (
            <div key={msg.id}>
              {showDateSep && (
                <div className="flex justify-center my-3">
                  <span className="text-xs px-3 py-1 rounded-full shadow-sm"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {new Date(msg.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
              <MessageBubble
                message={msg}
                isOwn={isOwn}
                isGroup={conv?.isGroup || false}
                isLast={idx === messageList.length - 1}
                currentUserId={currentUserId}
                showAvatar={showAvatar}
                onReply={setReplyTo}
                onDelete={isAiAssistant ? undefined : handleDelete}
                onEdit={isAiAssistant ? undefined : setEditMsg}
                onReact={isAiAssistant ? undefined : handleReact}
              />
            </div>
          )
        })}

        {/* Typing indicator */}
        {(typingUsers.length > 0 || (isAiAssistant && aiIsTyping)) && (
          <div className="flex items-end space-x-2 pb-1">
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm shadow-msg"
              style={{ background: 'var(--bg-bubble-in)', border: '1px solid var(--border)' }}>
              <div className="flex space-x-1 items-center h-5">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            </div>
            <span className="text-xs pb-1" style={{ color: 'var(--text-muted)' }}>
              {isAiAssistant && aiIsTyping ? 'Assistant is typing…' : `${typingUsers.slice(0, 2).join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing…`}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        currentUserId={currentUserId}
        replyTo={replyTo}
        editMessage={editMsg}
        onClearReply={() => setReplyTo(null)}
        onClearEdit={() => setEditMsg(null)}
        onSend={handleSend}
        onSaveEdit={handleSaveEdit}
      />
    </div>
  )
}
