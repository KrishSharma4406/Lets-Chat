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

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const firstLoadRef = useRef(true)

  // Infinite scroll sentinel at top
  const { ref: topRef, inView: topInView } = useInView({ threshold: 0 })

  /* ── Fetch conversation details ───────────────────────── */
  useEffect(() => {
    fetch('/api/conversations')
      .then((r) => r.json())
      .then((list: ConvDetails[]) => {
        const c = list.find((x) => x.id === conversationId)
        if (c) setConv(c)
      })
      .catch(() => { })
  }, [conversationId])

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

  /* ── Socket typing events ─────────────────────────────── */
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

  /* ── Header: other user info ─────────────────────────── */
  const otherUser = conv && !conv.isGroup
    ? conv.participants.find((p) => p.user.id !== currentUserId)?.user
    : null

  const isOnline = otherUser
    ? onlineUsers.has(otherUser.id) || otherUser.isOnline
    : false

  const headerName = conv?.isGroup
    ? (conv.name || 'Group Chat')
    : (otherUser?.name || otherUser?.email || '…')

  const headerSub = conv?.isGroup
    ? `${conv.participants.length} members`
    : isOnline
      ? 'Online'
      : otherUser?.lastSeen
        ? `Last seen ${formatDistanceToNow(new Date(otherUser.lastSeen), { addSuffix: true })}`
        : 'Offline'

  /* ── Send message ─────────────────────────────────────── */
  const handleSend = useCallback(async (
    content: string, image?: string, fileName?: string, fileType?: string, replyToId?: string
  ) => {
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
  }, [conversationId, currentUserId, session, addOptimistic, replaceOptimistic, removeOptimistic, socket])

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
    setCall({
      status: 'calling',
      remoteUserId: otherUser.id,
      remoteUserName: otherUser.name,
      remoteUserImage: otherUser.image,
      isVideo,
    })
    socket?.emit('call:initiate', {
      callerId: currentUserId,
      callerName: session?.user?.name || session?.user?.email,
      callerImage: session?.user?.image,
      recipientId: otherUser.id,
      isVideo,
    })
  }, [otherUser, currentUserId, session, setCall, socket])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center space-x-3 px-4 py-3 z-10 shadow-sm"
        style={{ background: 'var(--brand-primary)', color: 'white' }}>
        {onBack && (
          <button onClick={onBack} className="mr-1 p-1 rounded-full hover:opacity-70 transition-opacity">
            <ArrowLeft size={20} className="text-white" />
          </button>
        )}

        {/* Avatar */}
        <div className="relative">
          {conv?.isGroup ? (
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Users size={20} className="text-white" />
            </div>
          ) : otherUser?.image ? (
            <Image src={otherUser.image} alt={headerName} width={40} height={40} className="rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: 'rgba(255,255,255,0.2)' }}>
              {headerName[0]?.toUpperCase()}
            </div>
          )}
          {isOnline && !conv?.isGroup && (
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-green-600" style={{ background: 'var(--online)' }} />
          )}
        </div>

        <div className="flex-1 min-w-0 cursor-pointer">
          <p className="font-semibold text-white text-sm truncate">{headerName}</p>
          <p className="text-xs text-white/75 truncate">{headerSub}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-1">
          {!conv?.isGroup && (
            <>
              <button onClick={() => handleCall(false)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <Phone size={20} className="text-white" />
              </button>
              <button onClick={() => handleCall(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <Video size={20} className="text-white" />
              </button>
            </>
          )}
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <Search size={20} className="text-white" />
          </button>
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <MoreVertical size={20} className="text-white" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 chat-bg">
        {/* Top sentinel for infinite scroll */}
        <div ref={topRef} className="h-1" />

        {loading && (
          <div className="flex justify-center py-4">
            <div className="flex space-x-1">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full space-y-3 py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--brand-primary)' }}>
              <Users size={28} className="text-white" />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No messages yet</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Start the conversation! 👋</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn = msg.sender.id === currentUserId
          const prevMsg = messages[idx - 1]
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
                isLast={idx === messages.length - 1}
                currentUserId={currentUserId}
                showAvatar={showAvatar}
                onReply={setReplyTo}
                onDelete={handleDelete}
                onEdit={setEditMsg}
                onReact={handleReact}
              />
            </div>
          )
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-end space-x-2 pb-1">
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm shadow-msg"
              style={{ background: 'var(--bg-bubble-in)', border: '1px solid var(--border)' }}>
              <div className="flex space-x-1 items-center h-5">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            </div>
            <span className="text-xs pb-1" style={{ color: 'var(--text-muted)' }}>
              {typingUsers.slice(0, 2).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
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
