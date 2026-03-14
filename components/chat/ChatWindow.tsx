'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { format, formatDistanceToNow } from 'date-fns'
import Image from 'next/image'

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  isOnline?: boolean
  lastSeen?: string
}

interface Message {
  id: string
  content: string
  image?: string | null
  fileName?: string | null
  fileType?: string | null
  createdAt: string
  sender: User
}

interface ChatWindowProps {
  conversationId: string
}

export default function ChatWindow({ conversationId }: ChatWindowProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [otherUser, setOtherUser] = useState<User | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [showFileMenu, setShowFileMenu] = useState(false)
  const [fileAccept, setFileAccept] = useState('image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.zip')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Close file menu on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setShowFileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (conversationId) {
      fetchMessages()
      fetchConversationDetails()
      const interval = setInterval(fetchMessages, 2000)
      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const fetchConversationDetails = async () => {
    try {
      const response = await fetch('/api/conversations')
      if (response.ok) {
        const conversations = await response.json()
            const conversation = conversations.find((c: { id: string }) => c.id === conversationId)
        if (conversation) {
          const other = conversation.participants.find(
            (p: { user: { id: string } }) => p.user.id !== session?.user?.id
          )
          if (other) {
            setOtherUser(other.user)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching conversation details:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    setIsTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1000)
  }

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      alert('File size must be under 3 MB.')
      e.target.value = ''
      return
    }
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setFilePreview(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  const clearFile = useCallback(() => {
    setSelectedFile(null)
    setFilePreview(null)
  }, [])

  const handleFileTypeSelect = (accept: string) => {
    setFileAccept(accept)
    setShowFileMenu(false)
    fileInputRef.current?.click()
  }

  const fileTypeOptions = [
    {
      label: 'All Files',
      accept: 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.zip,.mp4,.mov,.webm,.mp3,.wav,.m4a'
    },
    {
      label: 'Documents',
      accept: 'application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx'
    },
    {
      label: 'Images',
      accept: 'image/*'
    },
    {
      label: 'Videos',
      accept: 'video/*,.mp4,.mov,.webm,.mkv,.avi'
    },
    {
      label: 'Audio',
      accept: 'audio/*,.mp3,.wav,.m4a,.flac,.aac'
    },
    {
      label: 'Archives',
      accept: '.zip,.rar,.7z,.tar,.gz'
    }
  ]

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !selectedFile) || sending || !isOnline) return

    setSending(true)
    setIsTyping(false)
    try {
      const payload: Record<string, string> = { message: newMessage }
      if (filePreview && selectedFile) {
        payload.image = filePreview
        payload.fileName = selectedFile.name
        payload.fileType = selectedFile.type
      }
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setNewMessage('')
        clearFile()
        await fetchMessages()
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const getOnlineStatus = () => {
    if (!otherUser) return null
    if (otherUser.isOnline) return <span className="text-green-500">Online</span>
    if (otherUser.lastSeen) {
      return (
        <span className="text-gray-500 dark:text-gray-400">
          Last seen {formatDistanceToNow(new Date(otherUser.lastSeen), { addSuffix: true })}
        </span>
      )
    }
    return <span className="text-gray-500 dark:text-gray-400">Offline</span>
  }

  const renderAttachment = (message: Message, isOwn: boolean) => {
    if (!message.image) return null
    const isImage =
      message.fileType?.startsWith('image/') ||
      (!message.fileType && message.image.startsWith('data:image'))
    if (isImage) {
      return (
        <Image
          src={message.image}
          alt={message.fileName || 'image'}
          className="max-w-xs rounded-lg mt-2 cursor-pointer"
          onClick={() => window.open(message.image!, '_blank')}
        />
      )
    }
    return (
      <a
        href={message.image}
        download={message.fileName || 'file'}
        className={`flex items-center space-x-2 mt-2 px-3 py-2 rounded-lg border ${
          isOwn
            ? 'border-indigo-300 bg-indigo-700 hover:bg-indigo-800'
            : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
        } transition-colors`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
        <span className="text-sm truncate max-w-40">{message.fileName || 'Download file'}</span>
      </a>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-yellow-500 text-white text-sm text-center py-1.5 font-medium">
          You are offline — messages cannot be sent until reconnected.
        </div>
      )}

      {/* Chat Header */}
      {otherUser && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {otherUser.name?.[0]?.toUpperCase() || otherUser.email[0].toUpperCase()}
              </div>
              {otherUser.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {otherUser.name || otherUser.email}
              </h2>
              <p className="text-xs">{getOnlineStatus()}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.sender.id === session?.user?.id
            const showTimestamp = 
              index === 0 || 
              new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 5 * 60 * 1000
            
            return (
              <div key={message.id}>
                {showTimestamp && (
                  <div className="flex justify-center my-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full">
                      {format(new Date(message.createdAt), 'MMM d, HH:mm')}
                    </span>
                  </div>
                )}
                <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl px-4 py-2 rounded-2xl ${
                      isOwnMessage
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-sm'
                    }`}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                        {message.sender.name || message.sender.email}
                      </p>
                    )}
                    {message.content && <p className="wrap-break-word">{message.content}</p>}
                    {renderAttachment(message, isOwnMessage)}
                    <div className="flex items-center justify-end space-x-1 mt-1">
                      <p className={`text-xs ${isOwnMessage ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
                        {format(new Date(message.createdAt), 'HH:mm')}
                      </p>
                      {isOwnMessage && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="w-4 h-4 text-indigo-200"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        {/* File preview */}
        {selectedFile && filePreview && (
          <div className="mb-3 flex items-center space-x-3 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {selectedFile.type.startsWith('image/') ? (
              <Image src={filePreview} alt="preview" className="h-14 w-14 object-cover rounded" />
            ) : (
              <div className="h-14 w-14 bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center rounded">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-indigo-600 dark:text-indigo-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate text-gray-700 dark:text-gray-300">{selectedFile.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              aria-label="Remove attachment"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={fileAccept}
            className="hidden"
            aria-label="Attach a file"
            title="Attach a file"
            onChange={handleFileSelect}
          />
          
          {/* File menu button with dropdown */}
          <div ref={fileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowFileMenu(!showFileMenu)}
              disabled={!isOnline}
              className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors p-1 font-bold text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center"
              aria-label="Attach file"
              title="Attach files (documents, images, videos, audio, etc.)"
            >
              +
            </button>

            {/* Dropdown menu */}
            {showFileMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 w-48">
                <div className="py-1">
                  {fileTypeOptions.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleFileTypeSelect(option.accept)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center space-x-3"
                    >
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder={isOnline ? 'Type a message...' : 'You are offline...'}
            disabled={sending || !isOnline}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || (!newMessage.trim() && !selectedFile) || !isOnline}
            className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
