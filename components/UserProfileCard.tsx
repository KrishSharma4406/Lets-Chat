'use client'
/**
 * UserProfileCard — clickable user avatar that shows profile info
 * Allows quick access to profile picture upload and settings
 */
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Settings, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ProfilePictureUploader from './ProfilePictureUploader'
import toast from 'react-hot-toast'

interface Props {
  /**
   * Hide the profile card if not authenticated
   * @default false
   */
  hideIfUnauthenticated?: boolean
}

export default function UserProfileCard({ hideIfUnauthenticated = false }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const [showCard, setShowCard] = useState(false)

  if (!session?.user && hideIfUnauthenticated) return null

  if (!session?.user) {
    return (
      <button
        onClick={() => router.push('/auth')}
        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        style={{ background: 'var(--brand-primary)', color: 'white' }}
      >
        Sign In
      </button>
    )
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setShowCard(!showCard)}
        className="p-1.5 rounded-full hover:opacity-70 transition-opacity"
        aria-label="Open user profile"
      >
        <ProfilePictureUploader
          currentImage={session.user.image}
          userName={session.user.name}
          size={40}
          showCameraIcon={false}
          ariaLabel="User profile picture"
        />
      </button>

      {/* Profile card dropdown */}
      {showCard && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg z-50 overflow-hidden"
          style={{ background: 'var(--bg-surface)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Profile info */}
          <div className="p-4 flex items-center space-x-3" style={{ background: 'var(--bg-elevated)' }}>
            <ProfilePictureUploader
              currentImage={session.user.image}
              userName={session.user.name}
              size={50}
              onUploadComplete={() => setShowCard(false)}
              ariaLabel="Update profile picture from card"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {session.user.name || 'User'}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {session.user.email}
              </p>
            </div>
          </div>

          {/* Divider */}
          <hr style={{ borderColor: 'var(--border)', margin: 0 }} />

          {/* Menu items */}
          <div className="p-2">
            <button
              onClick={() => {
                router.push('/settings')
                setShowCard(false)
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors hover:opacity-70"
              style={{ color: 'var(--text-primary)' }}
            >
              <Settings size={18} />
              <span className="text-sm font-medium">Settings</span>
            </button>

            <button
              onClick={() => {
                setShowCard(false)
                toast.success('Logged out')
                // Logout will be handled by the caller or in settings
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors hover:opacity-70"
              style={{ color: '#EF4444' }}
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {showCard && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowCard(false)}
        />
      )}
    </div>
  )
}
