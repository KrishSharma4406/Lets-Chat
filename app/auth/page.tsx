'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Eye, EyeOff, Loader, Check, Github } from 'lucide-react'

// Password strength calculator
const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, text: '', color: '' }
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z\d]/.test(password)) score++

  const strengths = [
    { score: 0, text: '', color: '' },
    { score: 1, text: 'Weak', color: 'var(--red-500, #ef4444)' },
    { score: 2, text: 'Fair', color: 'var(--yellow-500, #eab308)' },
    { score: 3, text: 'Good', color: 'var(--blue-500, #3b82f6)' },
    { score: 4, text: 'Strong', color: 'var(--green-500, #22c55e)' },
    { score: 5, text: 'Very Strong', color: 'var(--green-600, #16a34a)' },
  ]
  return strengths[Math.min(score, 5)]
}

export default function AuthPage() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Signup state
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  
  const passwordStrength = getPasswordStrength(signupPassword)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email: loginEmail,
        password: loginPassword,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.ok) {
        setTimeout(() => router.push('/chat'), 500)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (signupPassword !== signupConfirm) {
      setError('Passwords do not match')
      return
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      // Auto-login after signup
      const result = await signIn('credentials', {
        email: signupEmail,
        password: signupPassword,
        redirect: false,
      })

      if (result?.ok) {
        setTimeout(() => router.push('/chat'), 500)
      } else {
        setError('Signup successful! Please log in.')
        setIsSignUp(false)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-full flex flex-col items-center justify-start relative overflow-x-hidden overflow-y-auto py-12 sm:py-20" style={{ background: 'var(--bg-base)' }}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ 
            background: 'var(--brand-primary)',
            animation: 'float 20s ease-in-out infinite'
          }} 
        />
        <div 
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ 
            background: 'var(--brand-secondary)',
            animation: 'float 15s ease-in-out infinite reverse'
          }} 
        />
        <style>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(30px, -30px); }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideLeft {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes slideRight {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .form-slide {
            animation: slideIn 0.5s ease-out;
          }
        `}</style>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div 
            className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-6 transition-transform duration-300 hover:scale-105"
            style={{ 
              background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
            }}
          >
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Let&apos;s Chat
          </h1>
          <p style={{ color: 'var(--text-secondary)' }} className="text-lg">
            Real-time messaging made simple
          </p>
        </div>

        {/* Auth Card */}
        <div 
          className="rounded-2xl p-8 backdrop-blur-xl border transition-all duration-300"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderColor: 'var(--border)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Tabs with enhanced styling */}
          <div className="flex gap-3 mb-8 p-1.5 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
            <button
              onClick={() => {
                setIsSignUp(false)
                setError('')
              }}
              className="flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all duration-300 relative group"
              style={{
                background: !isSignUp ? 'var(--brand-primary)' : 'transparent',
                color: !isSignUp ? 'white' : 'var(--text-secondary)',
                transform: !isSignUp ? 'scale(1)' : 'scale(0.98)'
              }}
            >
              <span className="relative">Sign In</span>
              {!isSignUp && (
                <div 
                  className="absolute inset-0 rounded-lg opacity-30 group-hover:opacity-50 transition-opacity"
                  style={{ background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.3))' }}
                />
              )}
            </button>
            <button
              onClick={() => {
                setIsSignUp(true)
                setError('')
              }}
              className="flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all duration-300 relative group"
              style={{
                background: isSignUp ? 'var(--brand-primary)' : 'transparent',
                color: isSignUp ? 'white' : 'var(--text-secondary)',
                transform: isSignUp ? 'scale(1)' : 'scale(0.98)'
              }}
            >
              <span className="relative">Sign Up</span>
              {isSignUp && (
                <div 
                  className="absolute inset-0 rounded-lg opacity-30 group-hover:opacity-50 transition-opacity"
                  style={{ background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.3))' }}
                />
              )}
            </button>
          </div>

          {/* Login Form */}
          {!isSignUp ? (
            <form onSubmit={handleLogin} className="space-y-5 form-slide">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Email Address
                </label>
                <div 
                  className="relative group transition-all duration-300"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                >
                  <Mail className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-current transition-colors" size={20} />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      borderColor: emailFocused ? 'var(--brand-primary)' : 'var(--border)',
                      '--tw-ring-color': 'var(--brand-primary)',
                      '--tw-ring-offset-color': 'var(--bg-base)',
                    } as any}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Password
                </label>
                <div 
                  className="relative group transition-all duration-300"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                >
                  <Lock className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-current transition-colors" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      borderColor: passwordFocused ? 'var(--brand-primary)' : 'var(--border)',
                      '--tw-ring-color': 'var(--brand-primary)',
                      '--tw-ring-offset-color': 'var(--bg-base)',
                    } as any}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div 
                  className="p-4 rounded-lg border backdrop-blur-sm border-red-500/30 animate-slideIn"
                  style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                >
                  <p className="text-sm font-medium" style={{ color: '#ef4444' }}>
                    ⚠️ {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 relative group overflow-hidden"
                style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity"
                  style={{ background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.5))' }}
                />
                <span className="relative flex items-center gap-2">
                  {loading ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </span>
              </button>

            </form>
          ) : (
            /* Signup Form */
            <form onSubmit={handleSignUp} className="space-y-5 form-slide">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Full Name
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-current transition-colors" size={20} />
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border)',
                      '--tw-ring-color': 'var(--brand-primary)',
                      '--tw-ring-offset-color': 'var(--bg-base)',
                    } as any}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-current transition-colors" size={20} />
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border)',
                      '--tw-ring-color': 'var(--brand-primary)',
                      '--tw-ring-offset-color': 'var(--bg-base)',
                    } as any}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-current transition-colors" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border)',
                      '--tw-ring-color': 'var(--brand-primary)',
                      '--tw-ring-offset-color': 'var(--bg-base)',
                    } as any}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {signupPassword && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                        <div 
                          className={`h-full transition-all duration-300 ${
                            passwordStrength.score <= 2 ? 'w-1/3' : 
                            passwordStrength.score === 3 ? 'w-2/3' : 
                            'w-full'
                          }`}
                          style={{ background: passwordStrength.color }}
                        />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: passwordStrength.color }}>
                        {passwordStrength.text}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Minimum 6 characters required
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Confirm Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-current transition-colors" size={20} />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={signupConfirm}
                    onChange={(e) => setSignupConfirm(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      borderColor: signupPassword && signupConfirm && signupPassword === signupConfirm ? 'rgb(34, 197, 94)' : 'var(--border)',
                      '--tw-ring-color': 'var(--brand-primary)',
                      '--tw-ring-offset-color': 'var(--bg-base)',
                    } as any}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  {signupPassword && signupConfirm && signupPassword === signupConfirm && (
                    <Check className="absolute right-12 top-3.5 text-green-500" size={20} />
                  )}
                </div>
              </div>

              {error && (
                <div 
                  className="p-4 rounded-lg border backdrop-blur-sm border-red-500/30"
                  style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                >
                  <p className="text-sm font-medium" style={{ color: '#ef4444' }}>
                    ⚠️ {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 relative group overflow-hidden"
                style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity"
                  style={{ background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.5))' }}
                />
                <span className="relative flex items-center gap-2">
                  {loading ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </span>
              </button>
            </form>
          )}

          {/* OAuth */}
          <div className="mt-8 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px" style={{ background: 'var(--border)' }} />
              </div>
              <div className="relative flex justify-center text-xs font-medium">
                <span className="px-3" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => signIn('google')}
                className="py-2.5 px-4 rounded-lg border font-medium transition-all duration-300 hover:scale-105 active:scale-95 group flex items-center justify-center gap-2"
                style={{ 
                  background: 'var(--bg-surface)', 
                  color: 'var(--text-primary)', 
                  borderColor: 'var(--border)',
                }}
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button
                onClick={() => signIn('github')}
                className="py-2.5 px-4 rounded-lg border font-medium transition-all duration-300 hover:scale-105 active:scale-95 group flex items-center justify-center gap-2"
                style={{ 
                  background: 'var(--bg-surface)', 
                  color: 'var(--text-primary)', 
                  borderColor: 'var(--border)',
                }}
              >
                <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
                GitHub
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          🔒 Messages are end-to-end encrypted
        </p>
      </div>
    </div>
  )
}
