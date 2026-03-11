'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function Home() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    
    if (session) {
      router.push('/chat')
    } else {
      router.push('/auth')
    }
  }, [session, status, router])

  return (
    <div className="h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Let&apos;s Chat</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
