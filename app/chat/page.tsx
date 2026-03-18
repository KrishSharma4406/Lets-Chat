'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
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

const VideoCallWindow = dynamic(() => import('@/components/VideoCall/VideoCallWindow'), { ssr: false })

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [showUserList, setShowUserList] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true)

  // Global socket connection
  useSocket()

  // Listen for incoming calls
  const { socket } = useSocketStore()
  const { setCall, status: callStatus } = useCallStore()

  useEffect(() => {
    if (!socket) return
    const onIncoming = (data: {
      callId: string; callerId: string; callerName: string; callerImage: string; isVideo: boolean
    }) => {
      setCall({
        status: 'incoming',
        callId: data.callId,
        remoteUserId: data.callerId,
        remoteUserName: data.callerName,
        remoteUserImage: data.callerImage,
        isVideo: data.isVideo,
      })
    }
    socket.on('call:incoming', onIncoming)
    return () => { socket.off('call:incoming', onIncoming) }
  }, [socket, setCall])

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

  if (!session) return null

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id)
    setMobileSidebarOpen(false) // mobile: hide sidebar
  }

  return (
    <div className="h-screen flex overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar — hidden on mobile when chat is selected */}
      <div
        className={`w-full md:w-[380px] lg:w-[420px] flex-shrink-0 flex flex-col h-full border-r transition-all duration-300 ${!mobileSidebarOpen && selectedConversation ? 'hidden md:flex' : 'flex'
          }`}
        style={{ borderColor: 'var(--border)' }}
      >
        <ConversationList
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
          onNewChat={() => setShowUserList(true)}
          currentUserId={session.user.id}
        />
      </div>

      {/* Main chat area */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileSidebarOpen && !selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <ChatWindow
            conversationId={selectedConversation}
            onBack={() => { setMobileSidebarOpen(true); setSelectedConversation(null) }}
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
              🔒 End-to-end encrypted
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
