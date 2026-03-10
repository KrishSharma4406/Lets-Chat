'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { format } from 'date-fns'

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface Message {
  id: string
  content: string
  createdAt: string
  sender: User
}

interface Conversation {
  id: string
  name: string | null
  isGroup: boolean
  updatedAt: string
  participants: Array<{
    user: User
  }>
  messages: Message[]
}

interface ConversationListProps {
  selectedConversation: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
}

export default function ConversationList({
  selectedConversation,
  onSelectConversation,
  onNewChat,
}: ConversationListProps) {
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(fetchConversations, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getConversationName = (conversation: Conversation) => {
    if (conversation.isGroup) {
      return conversation.name || 'Group Chat'
    }
    const otherUser = conversation.participants.find(
      (p) => p.user.id !== session?.user?.id
    )
    return otherUser?.user.name || otherUser?.user.email || 'Unknown User'
  }

  const getLastMessage = (conversation: Conversation) => {
    if (conversation.messages.length === 0) {
      return 'No messages yet'
    }
    return conversation.messages[0].content
  }

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
            {session?.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{session?.user?.name}</h2>
            <p className="text-xs text-gray-500">{session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/auth' })}
          className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-100"
        >
          Logout
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewChat}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
        >
          <span className="text-xl">+</span>
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No conversations yet
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedConversation === conversation.id ? 'bg-indigo-50' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 rounded-full bg-linear-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold shrink-0">
                  {getConversationName(conversation)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {getConversationName(conversation)}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {format(new Date(conversation.updatedAt), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {getLastMessage(conversation)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
