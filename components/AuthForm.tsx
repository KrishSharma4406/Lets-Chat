'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, MessageCircle, Lock, Mail, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AuthForm() {
  const router = useRouter()
  const { status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })

  useEffect(() => {
    if (status === 'authenticated') router.push('/chat')
  }, [status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (isRegister) {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) {
          const msg = await res.text()
          throw new Error(msg || 'Registration failed')
        }
        toast.success('Account created! Signing you in…')
      }

      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) throw new Error(result.error)
      router.push('/chat')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  const handleSocial = async (provider: 'google' | 'github') => {
    setIsLoading(true)
    try {
      await signIn(provider, { callbackUrl: '/chat', redirect: true })
    } catch {
      toast.error(`Failed to sign in with ${provider}`)
      setIsLoading(false)
    }
  }

  const passwordStrength = (pw: string): { label: string; color: string; width: string } => {
    if (!pw) return { label: '', color: 'bg-transparent', width: '0%' }
    let score = 0
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/\d/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '25%' }
    if (score === 2) return { label: 'Fair', color: 'bg-yellow-500', width: '50%' }
    if (score === 3) return { label: 'Good', color: 'bg-blue-500', width: '75%' }
    return { label: 'Strong', color: 'bg-green-500', width: '100%' }
  }

  const strength = isRegister ? passwordStrength(formData.password) : null

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Left panel — brand visual */}
      <div
        className="hidden lg:flex flex-col items-center justify-center flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #075E54 0%, #128C7E 50%, #25D366 100%)' }}
      >
        {/* Bubbles decoration */}
        {[120, 200, 280, 180, 160].map((size, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10"
            style={{
              width: size, height: size,
              background: 'white',
              top: `${[10, 60, 30, 80, 45][i]}%`,
              left: `${[20, 70, 50, 15, 80][i]}%`,
              transform: 'translate(-50%,-50%)',
            }}
          />
        ))}

        <div className="relative z-10 text-center text-white px-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
              <MessageCircle size={40} className="text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4">Let&apos;s Chat</h1>
          <p className="text-lg text-white/80 max-w-xs leading-relaxed">
            Real-time messaging with end-to-end encryption, voice &amp; video calls.
          </p>

          <div className="mt-12 space-y-4 text-left">
            {[
              { icon: '🔒', label: 'End-to-end encrypted' },
              { icon: '📞', label: 'Voice & Video calls' },
              { icon: '👥', label: 'Group chats' },
              { icon: '📎', label: 'Media sharing' },
            ].map((f) => (
              <div key={f.label} className="flex items-center space-x-3 text-white/90">
                <span className="text-xl">{f.icon}</span>
                <span className="font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 lg:max-w-md flex flex-col items-center justify-center p-8" style={{ background: 'var(--bg-surface)' }}>
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-primary)' }}>
            <MessageCircle size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Let&apos;s Chat</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {isRegister ? 'Create account' : 'Welcome back'}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {isRegister ? 'Join Let\'s Chat today' : 'Sign in to continue'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required={isRegister}
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all input-glow"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                />
              </div>
            )}

            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all input-glow"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={isLoading}
                className="w-full pl-10 pr-10 py-3 rounded-xl border text-sm transition-all input-glow"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password strength indicator */}
            {strength && strength.label && (
              <div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Password strength: {strength.label}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 text-sm disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  <span className="animate-spin-slow inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  <span>Please wait…</span>
                </span>
              ) : isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 text-xs" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSocial('google')}
              disabled={isLoading}
              className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Google</span>
            </button>
            <button
              onClick={() => handleSocial('github')}
              disabled={isLoading}
              className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </button>
          </div>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              disabled={isLoading}
              className="text-sm font-medium"
              style={{ color: 'var(--brand-secondary)' }}
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
