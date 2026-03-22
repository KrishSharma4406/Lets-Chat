'use client'
/**
 * ProfilePictureUploader — reusable component for uploading profile pictures
 * Used in: settings, chat header, profile modals
 * Click to upload, shows loading state and success/error toast
 */
import { useState, useRef } from 'react'
import { Camera, Loader } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { useSession } from 'next-auth/react'

interface Props {
  /**
   * Current image URL or null
   */
  currentImage: string | null | undefined
  /**
   * User's display name for fallback avatar
   */
  userName: string | null | undefined
  /**
   * Avatar size in pixels (width and height)
   * @default 64
   */
  size?: number
  /**
   * Show camera icon overlay
   * @default true
   */
  showCameraIcon?: boolean
  /**
   * Callback when upload completes successfully
   */
  onUploadComplete?: (imageUrl: string) => void
  /**
   * Optional CSS class for styling the container
   */
  className?: string
  /**
   * Optional aria-label for accessibility
   */
  ariaLabel?: string
}

export default function ProfilePictureUploader({
  currentImage,
  userName,
  size = 64,
  showCameraIcon = true,
  onUploadComplete,
  className = '',
  ariaLabel = 'Change profile picture',
}: Props) {
  const { update: updateSession } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = ''

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (10 MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('Image must be smaller than 10 MB')
      return
    }

    setIsUploading(true)
    const loadingToastId = toast.loading('Uploading profile picture...')

    try {
      // Convert file to Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => {
          const result = reader.result as string
          // Extract base64 part after comma
          const base64String = result.split(',')[1]
          resolve(base64String)
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
      })

      // Upload to server
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          mimeType: file.type,
          fileName: file.name,
        }),
      })

      if (!uploadResponse.ok) {
        throw new Error('Upload failed')
      }

      const { url } = await uploadResponse.json()

      // Update user profile with new image
      const profileResponse = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: url }),
      })

      if (!profileResponse.ok) {
        throw new Error('Failed to update profile')
      }

      // Update session
      await updateSession({ image: url })

      // Call callback
      onUploadComplete?.(url)

      toast.success('Profile picture updated!', { id: loadingToastId })
    } catch (error) {
      console.error('Profile picture upload error:', error)
      toast.error('Failed to update profile picture', { id: loadingToastId })
    } finally {
      setIsUploading(false)
    }
  }

  const initials = ((userName || 'U').charAt(0) || 'U').toUpperCase()

  return (
    <div
      className={`relative group cursor-pointer inline-block ${className}`}
      onClick={() => !isUploading && fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isUploading) {
          fileInputRef.current?.click()
        }
      }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
        aria-label="Upload profile picture"
      />

      {/* Avatar display */}
      <div
        className="relative overflow-hidden rounded-full flex items-center justify-center font-bold text-white transition-all duration-200"
        style={{
          width: size,
          height: size,
          background: !currentImage ? 'var(--brand-secondary)' : undefined,
          opacity: isUploading ? 0.7 : 1,
        }}
      >
        {currentImage ? (
          <Image
            src={currentImage}
            alt="Profile picture"
            width={size}
            height={size}
            className="object-cover w-full h-full group-hover:opacity-80 transition-opacity"
            priority={false}
          />
        ) : (
          <span
            style={{
              fontSize: `${size * 0.4}px`,
            }}
          >
            {initials}
          </span>
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(0, 0, 0, 0.4)' }}
          >
            <Loader size={size * 0.4} className="text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Camera icon overlay */}
      {showCameraIcon && !isUploading && (
        <div
          className="absolute bottom-0 right-0 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            background: 'var(--brand-accent)',
          }}
        >
          <Camera size={size * 0.14} className="text-white" />
        </div>
      )}
    </div>
  )
}
