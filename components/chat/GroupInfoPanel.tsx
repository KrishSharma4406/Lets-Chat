'use client'
/**
 * GroupInfoPanel — slide-in right panel for group info.
 * Shows group name, description, member list, and admin controls.
 */
import { useState, useEffect } from 'react'
import { X, Users, Crown, UserMinus, LogOut } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

interface Member {
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    isOnline?: boolean
  }
  role: string
}

interface Props {
  conversationId: string
  groupName: string
  groupImage?: string | null
  currentUserId: string
  currentUserRole: string
  onClose: () => void
}

export default function GroupInfoPanel({
  conversationId,
  groupName,
  groupImage,
  currentUserId,
  currentUserRole,
  onClose,
}: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/conversations')
      .then((r) => r.json())
      .then((list: Array<{ id: string; participants: Member[] }>) => {
        const conv = list.find((c) => c.id === conversationId)
        if (conv) setMembers(conv.participants)
      })
      .catch(() => toast.error('Could not load members'))
      .finally(() => setLoading(false))
  }, [conversationId])

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return
    try {
      await fetch(`/api/conversations/${conversationId}/leave`, { method: 'POST' })
      toast.success('Left the group')
      onClose()
      // Reload page to update conversation list
      window.location.reload()
    } catch {
      toast.error('Could not leave group')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm h-full flex flex-col shadow-2xl animate-slide-right overflow-hidden"
        style={{ background: 'var(--bg-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center space-x-3 px-4 py-3 border-b"
          style={{ background: 'var(--brand-primary)', borderColor: 'transparent' }}>
          <button onClick={onClose} className="p-1 hover:opacity-70 text-white">
            <X size={20} />
          </button>
          <h2 className="text-white font-semibold">Group Info</h2>
        </div>

        {/* Group avatar + name */}
        <div className="flex flex-col items-center py-8 space-y-3"
          style={{ background: 'var(--bg-elevated)' }}>
          {groupImage ? (
            <Image src={groupImage} alt={groupName} width={80} height={80}
              className="rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'var(--brand-primary)' }}>
              <Users size={36} className="text-white" />
            </div>
          )}
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{groupName}</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {members.length} members
          </p>
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto">
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}>
            Members
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="flex space-x-1">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            </div>
          ) : members.map((m) => (
            <div key={m.user.id}
              className="flex items-center space-x-3 px-4 py-3 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}>
              {m.user.image ? (
                <Image src={m.user.image} alt={m.user.name || ''} width={40} height={40}
                  className="rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                  style={{ background: 'var(--brand-secondary)' }}>
                  {(m.user.name || m.user.email)[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {m.user.id === currentUserId ? 'You' : (m.user.name || m.user.email)}
                  </p>
                  {m.role === 'admin' && (
                    <Crown size={12} style={{ color: 'var(--brand-accent)' }} />
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {m.role === 'admin' ? 'Group admin' : 'Member'}
                </p>
              </div>
              {/* Admin controls: remove member */}
              {currentUserRole === 'admin' && m.user.id !== currentUserId && (
                <button
                  onClick={() => toast('Member removal coming soon', { icon: '🔧' })}
                  className="p-1.5 rounded-full hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <UserMinus size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Leave group */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleLeave}
            className="flex items-center space-x-2 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}
          >
            <LogOut size={16} />
            <span>Leave group</span>
          </button>
        </div>
      </div>
    </div>
  )
}
