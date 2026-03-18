'use client'
/**
 * Status / Stories page — WhatsApp-style status feed
 * Shows "My Status" card + all contacts' active stories
 * Includes story viewer modal with progress bar, tap/click to advance
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Eye } from 'lucide-react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

interface StatusItem {
  id: string
  userId: string
  content: string | null
  mediaUrl: string | null
  mediaType: string | null
  caption: string | null
  expiresAt: string
  createdAt: string
  viewedBy: string[]
  user: { id: string; name: string | null; email: string; image: string | null }
}

interface UserStatuses {
  user: StatusItem['user']
  statuses: StatusItem[]
}

export default function StatusPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [groups, setGroups] = useState<UserStatuses[]>([])
  const [myStatuses, setMyStatuses] = useState<StatusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<UserStatuses | null>(null)
  const [viewIdx, setViewIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newStatusText, setNewStatusText] = useState('')
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/auth')
  }, [authStatus, router])

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch('/api/stories')
      if (!res.ok) return
      const data: StatusItem[] = await res.json()

      const me = session?.user?.id
      const myItems = data.filter((s) => s.userId === me)
      const others = data.filter((s) => s.userId !== me)

      // Group by user
      const map = new Map<string, UserStatuses>()
      others.forEach((s) => {
        if (!map.has(s.user.id)) {
          map.set(s.user.id, { user: s.user, statuses: [] })
        }
        map.get(s.user.id)!.statuses.push(s)
      })

      setMyStatuses(myItems)
      setGroups(Array.from(map.values()))
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    fetchStatuses()
  }, [fetchStatuses])

  // Story viewer progress timer
  useEffect(() => {
    if (!viewing) {
      if (progressRef.current) clearInterval(progressRef.current)
      setProgress(0)
      return
    }
    setProgress(0)
    if (progressRef.current) clearInterval(progressRef.current)

    const duration = 5000 // 5s per story
    const step = 100 / (duration / 50)
    progressRef.current = setInterval(() => {
      setProgress((p) => {
        if (p + step >= 100) {
          // advance or close
          if (viewIdx < viewing.statuses.length - 1) {
            setViewIdx((i) => i + 1)
            return 0
          } else {
            setViewing(null)
            if (progressRef.current) clearInterval(progressRef.current)
            return 0
          }
        }
        return p + step
      })
    }, 50)

    return () => { if (progressRef.current) clearInterval(progressRef.current) }
  }, [viewing, viewIdx]) // eslint-disable-line

  const openViewer = (group: UserStatuses) => {
    setViewing(group)
    setViewIdx(0)
    // Record view
    group.statuses.forEach((s) => {
      fetch(`/api/stories/${s.id}/view`, { method: 'POST' }).catch(() => { })
    })
  }

  const handleAddStatus = async () => {
    if (!newStatusText.trim()) return
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newStatusText, mediaType: 'text' }),
      })
      if (!res.ok) throw new Error()
      toast.success('Status posted!')
      setShowAddModal(false)
      setNewStatusText('')
      fetchStatuses()
    } catch {
      toast.error('Could not post status')
    }
  }

  const currentStory = viewing ? viewing.statuses[viewIdx] : null

  const avatarEl = (user: StatusItem['user'], size = 48) =>
    user.image ? (
      <Image src={user.image} alt={user.name || ''} width={size} height={size}
        className="rounded-full object-cover" />
    ) : (
      <div className="rounded-full flex items-center justify-center text-white font-semibold"
        style={{ width: size, height: size, background: 'var(--brand-secondary)', fontSize: size * 0.4 }}>
        {(user.name || user.email)[0].toUpperCase()}
      </div>
    )

  if (authStatus === 'loading') return null

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="flex items-center space-x-3 px-4 py-4 flex-shrink-0"
        style={{ background: 'var(--brand-primary)' }}>
        <button onClick={() => router.push('/chat')} className="p-1.5 rounded-full hover:bg-white/10">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="text-lg font-semibold text-white flex-1">Status</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex space-x-1">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        ) : (
          <>
            {/* My Status card */}
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
                My Status
              </p>
              <div className="flex items-center space-x-4">
                <div className="relative cursor-pointer" onClick={() => setShowAddModal(true)}>
                  {session?.user?.image ? (
                    <Image src={session.user.image} alt="me" width={52} height={52}
                      className="rounded-full object-cover" />
                  ) : (
                    <div className="w-13 h-13 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ width: 52, height: 52, background: 'var(--brand-secondary)' }}>
                      {(session?.user?.name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2"
                    style={{ background: 'var(--brand-accent)', borderColor: 'var(--bg-base)' }}>
                    <Plus size={10} className="text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>My status</p>
                  {myStatuses.length > 0 ? (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {formatDistanceToNow(new Date(myStatuses[0].createdAt), { addSuffix: true })} · {myStatuses.length} update{myStatuses.length > 1 ? 's' : ''}
                    </p>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tap to add status update</p>
                  )}
                </div>
                {myStatuses.length > 0 && (
                  <button onClick={() => openViewer({ user: { id: session!.user.id, name: session!.user.name || null, email: session!.user.email || '', image: session!.user.image || null }, statuses: myStatuses })}
                    className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    View
                  </button>
                )}
              </div>
            </div>

            {/* Recent updates */}
            {groups.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
                  Recent updates
                </p>
                <div className="space-y-0">
                  {groups.map((g) => {
                    const allViewed = g.statuses.every((s) => s.viewedBy.includes(session?.user?.id || ''))
                    const latest = g.statuses[0]
                    return (
                      <button key={g.user.id} onClick={() => openViewer(g)}
                        className="flex items-center space-x-4 w-full py-3 border-b text-left hover:opacity-80 transition-opacity"
                        style={{ borderColor: 'var(--border-subtle)' }}>
                        <div className={allViewed ? 'story-ring-seen' : 'story-ring'}>
                          {avatarEl(g.user, 46)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {g.user.name || g.user.email}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {formatDistanceToNow(new Date(latest.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye size={12} style={{ color: 'var(--text-muted)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {g.statuses.length}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {groups.length === 0 && myStatuses.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 space-y-3">
                <div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)' }}>
                  <Eye size={32} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No status updates yet</p>
                <button onClick={() => setShowAddModal(true)}
                  className="text-sm font-medium" style={{ color: 'var(--brand-secondary)' }}>
                  Add status update
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Story Viewer Modal ─────────────────────────────────── */}
      {viewing && currentStory && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
          {/* Progress bars */}
          <div className="flex space-x-1 p-3">
            {viewing.statuses.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.3)' }}>
                <div className="h-full rounded-full transition-none"
                  style={{
                    background: 'white',
                    width: i < viewIdx ? '100%' : i === viewIdx ? `${progress}%` : '0%',
                  }} />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="flex items-center space-x-3 px-4 py-2">
            {avatarEl(viewing.user, 36)}
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">
                {viewing.user.name || viewing.user.email}
              </p>
              <p className="text-white/60 text-xs">
                {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}
              </p>
            </div>
            <button onClick={() => setViewing(null)} className="text-white/70 hover:text-white text-xl px-2">
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center relative"
            onClick={() => {
              if (viewIdx < viewing.statuses.length - 1) {
                setViewIdx((i) => i + 1)
                setProgress(0)
              } else {
                setViewing(null)
              }
            }}>
            {currentStory.mediaUrl ? (
              <Image src={currentStory.mediaUrl} alt="status" fill
                className="object-contain" />
            ) : (
              <div className="px-8 text-center">
                <p className="text-white text-2xl font-semibold leading-relaxed">
                  {currentStory.content}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Add Status Modal ───────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 space-y-4 animate-slide-up"
            style={{ background: 'var(--bg-surface)' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Add status update
            </h3>
            <textarea
              rows={3}
              placeholder="What's on your mind?"
              value={newStatusText}
              onChange={(e) => setNewStatusText(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-xl resize-none text-sm outline-none input-glow"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
            <div className="flex space-x-3">
              <button onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button onClick={handleAddStatus}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'var(--brand-accent)' }}>
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
