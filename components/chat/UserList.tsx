'use client'
/**
 * UserList — modal for starting a new 1-on-1 chat
 * Updated to pass conversationId back to parent
 */
import { useEffect, useState } from 'react'
import { X, Search, MessageCircle } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

interface User {
  id: string; name: string | null; email: string; image: string | null; isOnline?: boolean
}

interface Props {
  onClose: () => void
  onSelectUser: (conversationId?: string) => void
}

export default function UserList({ onClose, onSelectUser }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((data: User[]) => setUsers(data))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter((u) =>
    (u.name || u.email).toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = async (userId: string) => {
    setCreating(userId)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error()
      const conv = await res.json()
      onSelectUser(conv.id)
    } catch {
      toast.error('Failed to open chat')
    } finally {
      setCreating(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl animate-slide-up"
        style={{ background: 'var(--bg-surface)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border)', background: 'var(--brand-primary)' }}>
          <div className="flex items-center space-x-3">
            <MessageCircle size={20} className="text-white" />
            <p className="font-semibold text-white">New chat</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center space-x-2 rounded-xl px-3 py-2" style={{ background: 'var(--bg-input)' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text" placeholder="Search…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col space-y-1 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center space-x-3 p-2 animate-pulse">
                  <div className="w-10 h-10 rounded-full" style={{ background: 'var(--border)' }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 rounded w-1/2" style={{ background: 'var(--border)' }} />
                    <div className="h-2.5 rounded w-1/3" style={{ background: 'var(--border)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
              {search ? 'No users found' : 'No other users registered yet'}
            </p>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelect(u.id)}
                disabled={!!creating}
                className="flex items-center space-x-3 w-full px-4 py-3 text-left transition-colors border-b disabled:opacity-70"
                style={{ borderColor: 'var(--border-subtle)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="relative shrink-0">
                  {u.image ? (
                    <Image src={u.image} alt={u.name || ''} width={42} height={42} className="rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ background: 'var(--brand-secondary)' }}>
                      {(u.name || u.email)[0].toUpperCase()}
                    </div>
                  )}
                  {u.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                      style={{ background: 'var(--online)', borderColor: 'var(--bg-surface)' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.name || u.email}</p>
                  {u.name && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>}
                </div>
                {creating === u.id && (
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin-slow"
                    style={{ borderColor: 'var(--brand-accent)' }} />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
