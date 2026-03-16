'use client'

import React from 'react'

interface TypingIndicatorProps {
  userNames: string[]
}

export function TypingIndicator({ userNames }: TypingIndicatorProps) {
  if (userNames.length === 0) return null

  const displayText = userNames.length > 2 
    ? `${userNames.slice(0, 2).join(', ')} and ${userNames.length - 2} more are typing`
    : userNames.length === 2
    ? `${userNames[0]} and ${userNames[1]} are typing`
    : `${userNames[0]} is typing`

  return (
    <div className="flex items-center gap-2 text-gray-500 text-sm px-4 py-2">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{displayText}</span>
    </div>
  )
}

export default TypingIndicator
