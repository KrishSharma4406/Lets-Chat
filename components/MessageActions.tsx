'use client'

import React, { useState, useRef, useEffect } from 'react'

interface MessageActionsProps {
  messageId: string
  isOwnMessage: boolean
  onEdit?: (content: string) => void
  onDelete?: () => void
  onReaction?: (emoji: string) => void
  currentReactions?: Array<{ emoji: string; count: number; userReacted: boolean }>
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '👏']

export function MessageActions({
  messageId,
  isOwnMessage,
  onEdit,
  onDelete,
  onReaction,
  currentReactions = []
}: MessageActionsProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showMenu || showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu, showEmojiPicker])

  const handleEdit = async () => {
    if (!editContent.trim()) return

    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: editContent, action: 'edit' })
      })

      if (!response.ok) {
        throw new Error('Failed to edit message')
      }

      onEdit?.(editContent)
      setEditMode(false)
      setEditContent('')
      setShowMenu(false)
    } catch (error) {
      console.error('Failed to edit message:', error)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete' })
      })

      if (!response.ok) {
        throw new Error('Failed to delete message')
      }

      onDelete?.()
      setShowMenu(false)
    } catch (error) {
      console.error('Failed to delete message:', error)
    }
  }

  const handleReaction = async (emoji: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emoji })
      })

      if (!response.ok) {
        throw new Error('Failed to add reaction')
      }

      onReaction?.(emoji)
      setShowEmojiPicker(false)
    } catch (error) {
      console.error('Failed to add reaction:', error)
    }
  }

  return (
    <div className="flex items-center gap-1 relative">
      {/* Reaction button */}
      <div ref={emojiPickerRef} className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Add reaction"
        >
          😊
        </button>

        {showEmojiPicker && (
          <div className="absolute bottom-10 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 flex gap-2 flex-wrap w-48">
            {EMOJI_REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="text-xl hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* More actions menu */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="More actions"
        >
          ⋯
        </button>

        {showMenu && (
          <div className="absolute top-8 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 w-40">
            {isOwnMessage && (
              <>
                <button
                  onClick={() => {
                    setEditMode(true)
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  ✏️ Edit
                </button>
                <hr className="my-1" />
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition-colors"
                >
                  🗑️ Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Edit mode */}
      {editMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-4 max-w-md w-full">
            <h3 className="font-semibold text-gray-800 mb-3">Edit Message</h3>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Edit your message..."
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageActions
