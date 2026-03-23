'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import ConversationList from '@/components/chat/ConversationList'
import ChatWindow from '@/components/chat/ChatWindow'
import UserList from '@/components/chat/UserList'
import IncomingCallNotification from '@/components/VideoCall/IncomingCallNotification'
import { useSocket } from '@/hooks/useSocket'
import { useCallStore } from '@/lib/stores/callStore'
import { useSocketStore } from '@/lib/stores/socketStore'
import { MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const VideoCallWindow = dynamic(() => import('@/components/VideoCall/VideoCallWindow'), { ssr: false })

function DemoLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('password')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDemoForm, setShowDemoForm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const result = await signIn('credentials', {
        email: email || 'demo@example.com',
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.ok) {
        // Session will be updated automatically
      }
    } catch (err) {
      setError('Login failed. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* OAuth Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => signIn('google')}
          className="w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition hover:opacity-90"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          <span>🔵</span> Sign in with Google
        </button>
        <button
          onClick={() => signIn('github')}
          className="w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition hover:opacity-90"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          <span>⚫</span> Sign in with GitHub
        </button>
      </div>

      {/* Divider */}
      <div className="relative flex items-center">
        <div className="grow" style={{ borderTop: '1px solid var(--border)' }} />
        <span className="px-3 text-sm" style={{ color: 'var(--text-muted)', background: 'var(--bg-base)' }}>or</span>
        <div className="grow" style={{ borderTop: '1px solid var(--border)' }} />
      </div>

      {/* Demo Login Toggle */}
      <button
        type="button"
        onClick={() => setShowDemoForm(!showDemoForm)}
        className="w-full py-3 px-4 rounded-lg font-medium text-sm transition hover:opacity-90"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
      >
        {showDemoForm ? 'Hide Demo Login' : 'Demo Login (for testing)'}
      </button>

      {/* Demo Form */}
      {showDemoForm && (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
          <div className="space-y-2">
            <label className="block text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="demo@example.com"
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded font-medium text-white transition disabled:opacity-50 text-sm"
            style={{ background: 'var(--brand-primary)' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [showUserList, setShowUserList] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Global socket connection
  useSocket()

  // Listen for incoming calls
  const { socket } = useSocketStore()
  const { setCall, status: callStatus } = useCallStore()

  useEffect(() => {
    if (!socket) return
    const onIncoming = (data: {
      callId: string; callerId: string; callerName: string; callerImage: string; isVideo: boolean; conversationId?: string
    }) => {
      console.log('[chat/page] call:incoming received:', data)
      setCall({
        status: 'incoming',
        callId: data.callId,
        conversationId: data.conversationId || null,
        remoteUserId: data.callerId,
        remoteUserName: data.callerName,
        remoteUserImage: data.callerImage,
        isVideo: data.isVideo,
      })
    }

    const onCallAccepted = (data: { callId: string; callerId: string; conversationId?: string }) => {
      console.log('[chat/page] call:accepted received:', data)
      // Post acceptance message to chat
      if (data.conversationId) {
        const acceptanceMessage = 'Answered the call'
        fetch(`/api/conversations/${data.conversationId}/messages`, {
          method: 'POST',
          body: JSON.stringify({ message: acceptanceMessage }),
        })
          .then(r => r.json())
          .then((saved) => {
            socket?.emit('message:send', { conversationId: data.conversationId, message: saved })
          })
          .catch(err => console.error('Failed to post acceptance message:', err))
      }
      setCall({ status: 'active', startedAt: new Date() })
    }

    const onCallRejected = () => {
      console.log('[chat/page] call:rejected received')
      toast.error('Call was rejected')
      setCall({ status: 'idle' })
    }

    socket.on('call:incoming', onIncoming)
    socket.on('call:accepted', onCallAccepted)
    socket.on('call:rejected', onCallRejected)
    return () => {
      socket.off('call:incoming', onIncoming)
      socket.off('call:accepted', onCallAccepted)
      socket.off('call:rejected', onCallRejected)
    }
  }, [socket, setCall])

  /* ── Poll for pending video calls (Vercel fallback) ──── */
  useEffect(() => {
    if (!session?.user?.id) return

    const pollCalls = async () => {
      try {
        const res = await fetch('/api/video-calls/pending')
        if (!res.ok) return
        const pendingCalls = await res.json()

        // Check for new incoming call
        if (pendingCalls.length > 0) {
          const call = pendingCalls[0]
          
          // Only set if not already received via Socket.IO
          if (callStatus === 'idle') {
            console.log('[chat/page] Incoming call:', call.caller.name)
            setCall({
              status: 'incoming',
              callId: call.id,        // Use database call ID directly
              dbCallId: call.id,
              conversationId: null,
              remoteUserId: call.caller.id,
              remoteUserName: call.caller.name,
              remoteUserImage: call.caller.image,
              isVideo: call.isVideo,
            })
          }
        }
      } catch (err) {
        // Silently fail - this is just polling
      }
    }

    // Poll every 3 seconds for incoming calls (reduced from 1s)
    const callPollInterval = setInterval(pollCalls, 3000)

    return () => clearInterval(callPollInterval)
  }, [session?.user?.id, setCall, callStatus])

  /* ── Silent auto-refresh every 2 seconds ──── */
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1)
    }, 2000)

    return () => clearInterval(refreshInterval)
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'var(--brand-primary)' }}>
            <MessageCircle size={32} className="text-white" />
          </div>
          <div className="flex space-x-1">
            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id)
    setMobileSidebarOpen(false) // mobile: hide sidebar
  }

  return (
    <div className="h-screen flex overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar — hidden on mobile when chat is selected */}
      <div
        className={`w-full md:w-95 lg:w-105 shrink-0 flex flex-col h-full border-r transition-all duration-300 ${!mobileSidebarOpen && selectedConversation ? 'hidden md:flex' : 'flex'
          }`}
        style={{ borderColor: 'var(--border)' }}
      >
        <ConversationList
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
          onNewChat={() => setShowUserList(true)}
          currentUserId={session.user.id}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Main chat area */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileSidebarOpen && !selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <ChatWindow
            conversationId={selectedConversation}
            onBack={() => { setMobileSidebarOpen(true); setSelectedConversation(null) }}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          /* Empty state */
          <div className="hidden md:flex flex-col items-center justify-center h-full space-y-5 select-none"
            style={{ background: 'var(--bg-chat)' }}>
            <div className="relative">
              <div className="w-32 h-32 rounded-full flex items-center justify-center shadow-xl"
                style={{ background: 'var(--brand-primary)' }}>
                <MessageCircle size={52} className="text-white" />
              </div>
            </div>
            <div className="text-center max-w-xs space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Let&apos;s Chat</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Select a conversation from the sidebar or start a new chat.
                Messages are end-to-end encrypted.
              </p>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full text-xs"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              End-to-end encrypted
            </div>
          </div>
        )}
      </div>

      {/* User list modal */}
      {showUserList && (
        <UserList
          onClose={() => setShowUserList(false)}
          onSelectUser={(convId?: string) => {
            setShowUserList(false)
            if (convId) handleSelectConversation(convId)
          }}
        />
      )}

      {/* Incoming call overlay */}
      <IncomingCallNotification />

      {/* Active/calling video window */}
      {(callStatus === 'calling' || callStatus === 'active') && <VideoCallWindow />}
    </div>
  )
}
