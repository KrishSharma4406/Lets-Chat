'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { formatDistanceToNow } from 'date-fns'
import {
  MessageCircle, Search, MoreVertical, Moon, Sun, Plus,
  Users, Settings, Archive, LogOut, CheckCheck, Image as ImageIcon
} from 'lucide-react'
import Image from 'next/image'
import { useChatStore, ConversationSummary } from '@/lib/stores/chatStore'
import { useSocketStore } from '@/lib/stores/socketStore'
import CreateGroupModal from './CreateGroupModal'

interface Props {
  selectedConversation: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  currentUserId: string
  refreshTrigger?: number
}

export default function ConversationList({
  selectedConversation,
  onSelectConversation,
  onNewChat,
  currentUserId,
  refreshTrigger = 0,
}: Props) {
  const { data: session } = useSession()
  const { conversations, setConversations } = useChatStore()
  const { socket } = useSocketStore()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isDark, setIsDark] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [setConversations])

  useEffect(() => {
    fetchConversations()
    const iv = setInterval(fetchConversations, 8000) // less-aggressive polling as fallback
    return () => clearInterval(iv)
  }, [fetchConversations])

  /* ── Listen for unread count updates via Socket.IO ──── */
  useEffect(() => {
    if (!socket) return
    
    const handleUnreadUpdate = () => {
      fetchConversations()
    }

    socket.on('unread:update', handleUnreadUpdate)
    socket.on('unread:reset', handleUnreadUpdate)
    
    return () => {
      socket.off('unread:update', handleUnreadUpdate)
      socket.off('unread:reset', handleUnreadUpdate)
    }
  }, [socket, fetchConversations])

  /* ── Silent auto-refresh from parent trigger ──── */
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchConversations()
    }
  }, [refreshTrigger, fetchConversations])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const getName = (conv: ConversationSummary) => {
    if (conv.isGroup) return conv.name || 'Group Chat'
    const other = conv.participants.find((p) => p.user.id !== currentUserId)
    return other?.user.name || other?.user.email || 'Unknown'
  }

  const getAvatar = (conv: ConversationSummary) => {
    if (conv.isGroup) return conv.groupImage || null
    const other = conv.participants.find((p) => p.user.id !== currentUserId)
    return other?.user.image || null
  }

  const isOtherOnline = (conv: ConversationSummary): boolean => {
    if (conv.isGroup) return false
    const other = conv.participants.find((p) => p.user.id !== currentUserId)
    return other?.user.isOnline || false
  }

  const getLastMessage = (conv: ConversationSummary) => {
    const msg = conv.messages?.[0]
    if (!msg) return 'No messages yet'
    const prefix = msg.sender.id === currentUserId ? 'You: ' : (conv.isGroup ? `${msg.sender.name?.split(' ')[0] || 'Someone'}: ` : '')
    return `${prefix}${msg.content || '📎 Attachment'}`
  }

  const getLastTime = (conv: ConversationSummary) => {
    const ts = conv.messages?.[0]?.createdAt || conv.updatedAt
    return formatDistanceToNow(new Date(ts), { addSuffix: false }).replace('about ', '').replace(' minutes', 'm').replace(' hours', 'h').replace(' days', 'd')
  }

  const filtered = conversations.filter((c) => {
    if (!search) return true
    return getName(c).toLowerCase().includes(search.toLowerCase())
  })

  const unreadTotal = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-sidebar)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center space-x-3">
          <div className="relative cursor-pointer" onClick={() => window.location.href = '/settings'}>
            {session?.user?.image ? (
              <Image src={session.user.image} alt="avatar" width={40} height={40} className="rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                style={{ background: 'var(--brand-secondary)' }}>
                {(session?.user?.name || session?.user?.email || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--text-primary)' }}>
              {session?.user?.name || 'Me'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* Unread badge */}
          {unreadTotal > 0 && (
            <span className="text-xs text-white px-1.5 py-0.5 rounded-full font-bold mr-1"
              style={{ background: 'var(--brand-accent)' }}>
              {unreadTotal}
            </span>
          )}
          <button onClick={toggleTheme} className="p-2 rounded-full transition-colors hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={onNewChat} className="p-2 rounded-full transition-colors hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
            <MessageCircle size={20} />
          </button>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full transition-colors hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
              <MoreVertical size={20} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 z-50 rounded-xl shadow-lg py-1 min-w-48 animate-fade-in"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                {[
                  { icon: <Users size={16} />, label: 'New group', action: () => { setShowGroupModal(true); setShowMenu(false) } },
                  { icon: <Archive size={16} />, label: 'Archived chats', action: () => setShowMenu(false) },
                  { icon: <Settings size={16} />, label: 'Settings', action: () => { window.location.href = '/settings'; setShowMenu(false) } },
                  { icon: <LogOut size={16} />, label: 'Log out', action: () => signOut({ callbackUrl: '/chat' }), danger: true },
                ].map((item) => (
                  <button key={item.label} onClick={item.action}
                    className="flex items-center space-x-3 w-full px-4 py-2.5 text-sm transition-colors hover:opacity-80"
                    style={{ color: item.danger ? '#EF4444' : 'var(--text-primary)' }}>
                    <span style={{ color: item.danger ? '#EF4444' : 'var(--text-secondary)' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-sidebar)' }}>
        <div className="flex items-center rounded-xl px-3 py-2 space-x-2" style={{ background: 'var(--bg-input)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* New group quick button */}
      <button
        onClick={() => setShowGroupModal(true)}
        className="flex items-center space-x-3 px-4 py-3 border-b transition-colors hover:opacity-90"
        style={{ borderColor: 'var(--border)', background: 'var(--brand-primary)' }}
      >
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Plus size={20} className="text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-white">New group</p>
          <p className="text-xs text-white/70">Create a group chat</p>
        </div>
        <Users size={16} className="text-white/70" />
      </button>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col space-y-px mt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center space-x-3 px-4 py-3 animate-pulse">
                <div className="w-12 h-12 rounded-full shrink-0" style={{ background: 'var(--border)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 rounded w-3/4" style={{ background: 'var(--border)' }} />
                  <div className="h-3 rounded w-1/2" style={{ background: 'var(--border)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-3">
            <MessageCircle size={36} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {search ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!search && (
              <button onClick={onNewChat} className="text-sm font-medium" style={{ color: 'var(--brand-secondary)' }}>
                Start a new chat
              </button>
            )}
          </div>
        ) : (
          filtered.map((conv) => {
            const online = isOtherOnline(conv)
            const avatar = getAvatar(conv)
            const name = getName(conv)
            const initials = name[0]?.toUpperCase() || '?'
            const unread = conv.unreadCount || 0
            const isSelected = selectedConversation === conv.id
            const lastMsg = getLastMessage(conv)
            const lastTime = getLastTime(conv)

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className="flex items-center space-x-3 px-4 py-3 cursor-pointer transition-colors border-b"
                style={{
                  borderColor: 'var(--border-subtle)',
                  background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-input)' }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {avatar ? (
                    <Image src={avatar} alt={name} width={48} height={48} className="rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ background: conv.isGroup ? 'var(--brand-primary)' : 'var(--brand-secondary)' }}>
                      {conv.isGroup ? <Users size={20} /> : initials}
                    </div>
                  )}
                  {online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2"
                      style={{ background: 'var(--online)', borderColor: 'var(--bg-sidebar)' }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</h3>
                    <span className="text-xs shrink-0 ml-1" style={{ color: unread > 0 ? 'var(--brand-accent)' : 'var(--text-muted)' }}>
                      {lastTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs truncate flex items-center space-x-1 flex-1" style={{ color: 'var(--text-secondary)' }}>
                      {conv.messages?.[0]?.sender?.id === currentUserId && (
                        <CheckCheck size={13} className="shrink-0" style={{ color: 'var(--brand-accent)' }} />
                      )}
                      {conv.messages?.[0]?.image && !conv.messages[0].content ? (
                        <span className="flex items-center space-x-1">
                          <ImageIcon size={12} />
                          <span>Photo</span>
                        </span>
                      ) : (
                        <span className="truncate">{lastMsg}</span>
                      )}
                    </p>
                    {unread > 0 && (
                      <span className="text-xs text-white rounded-full px-1.5 py-0.5 font-semibold ml-1 shrink-0"
                        style={{ background: 'var(--brand-accent)', minWidth: 20, textAlign: 'center' }}>
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {showGroupModal && (
        <CreateGroupModal
          onClose={() => setShowGroupModal(false)}
          currentUserId={currentUserId}
          onCreated={(id) => {
            setShowGroupModal(false)
            fetchConversations()
            onSelectConversation(id)
          }}
        />
      )}
    </div>
  )
}
