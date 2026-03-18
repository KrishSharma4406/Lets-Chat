'use client'
/**
 * SearchPanel — slide-in search panel for finding messages.
 */
import { useState, useCallback } from 'react'
import { X, Search, MessageCircle, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SearchResult {
  id: string
  content: string
  createdAt: string
  sender: { id: string; name: string | null; email: string }
  conversation: { id: string; name: string | null; isGroup: boolean }
}

interface Props {
  onClose: () => void
  onJumpTo: (conversationId: string, messageId: string) => void
}

export default function SearchPanel({ onClose, onJumpTo }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (!q.trim() || q.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/messages/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm h-full flex flex-col shadow-2xl animate-slide-right"
        style={{ background: 'var(--bg-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center space-x-3 px-4 py-3 border-b"
          style={{ background: 'var(--brand-primary)', borderColor: 'transparent' }}>
          <button onClick={onClose} className="p-1 hover:opacity-70 text-white">
            <X size={20} />
          </button>
          <h2 className="text-white font-semibold">Search Messages</h2>
        </div>

        {/* Search input */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center rounded-xl px-3 py-2 space-x-2"
            style={{ background: 'var(--bg-input)' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search in messages…"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="flex space-x-1">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            </div>
          ) : results.length === 0 && query.trim().length >= 2 ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-2">
              <MessageCircle size={32} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No messages found</p>
            </div>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => { onJumpTo(r.conversation.id, r.id); onClose() }}
                className="flex items-start space-x-3 w-full px-4 py-3 border-b text-left transition-colors hover:opacity-80"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: 'var(--brand-secondary)' }}>
                      {r.conversation.name || (r.conversation.isGroup ? 'Group Chat' : 'Direct Message')}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {r.sender.name || r.sender.email}
                  </p>
                  <p className="text-sm line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                    {r.content}
                  </p>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)', marginTop: 4 }} />
              </button>
            ))
          )}

          {results.length === 0 && !query && (
            <div className="flex flex-col items-center justify-center h-40 space-y-2 px-6 text-center">
              <Search size={32} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Type at least 2 characters to search messages
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
