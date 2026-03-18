'use client'
/**
 * EmojiReactionPicker — quick 6-emoji row + optional toggle for full picker.
 * Displayed when hovering/right-clicking a message.
 */
import { useState } from 'react'
import { Smile } from 'lucide-react'
import dynamic from 'next/dynamic'

const EmojiMart = dynamic(() => import('@emoji-mart/react'), { ssr: false })

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

interface Props {
  onReact: (emoji: string) => void
  onClose: () => void
}

export default function EmojiReactionPicker({ onReact, onClose }: Props) {
  const [showFull, setShowFull] = useState(false)

  const handleQuick = (emoji: string) => {
    onReact(emoji)
    onClose()
  }

  const handleFull = (emoji: { native: string }) => {
    onReact(emoji.native)
    onClose()
  }

  return (
    <div className="relative animate-slide-up z-50">
      {/* Quick row */}
      <div
        className="flex items-center space-x-1 px-2 py-1.5 rounded-full shadow-lg"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => handleQuick(e)}
            className="text-base w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-125 active:scale-95"
          >
            {e}
          </button>
        ))}
        <button
          onClick={() => setShowFull(!showFull)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          <Smile size={16} />
        </button>
      </div>

      {/* Full picker */}
      {showFull && (
        <div className="absolute bottom-full mb-2 right-0 z-50">
          <EmojiMart
            data={async () => (await import('@emoji-mart/data')).default}
            onEmojiSelect={handleFull}
            theme="auto"
            perLine={7}
            maxFrequentRows={1}
            previewPosition="none"
            skinTonePosition="none"
          />
        </div>
      )}
    </div>
  )
}
