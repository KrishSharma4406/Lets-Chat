'use client'
/**
 * Settings page — profile, privacy, theme, notifications, E2EE info
 */
import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Bell, Shield, Moon, Sun, LogOut, Key, Info, Camera } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function SettingsPage() {
    const { data: session, status, update } = useSession()
    const router = useRouter()
    const [isDark, setIsDark] = useState(false)
    const [name, setName] = useState('')
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy' | 'about'>('profile')

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/chat')
        if (session?.user?.name) setName(session.user.name)
        setIsDark(document.documentElement.classList.contains('dark'))
    }, [status, session, router])

    const toggleTheme = () => {
        const next = !isDark
        setIsDark(next)
        document.documentElement.classList.toggle('dark', next)
        localStorage.setItem('theme', next ? 'dark' : 'light')
    }

    const handleSaveProfile = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/users/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            })
            if (!res.ok) throw new Error()
            await update({ name })
            toast.success('Profile updated!')
        } catch {
            toast.error('Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file')
            return
        }

        const loadingToast = toast.loading('Uploading image...')
        
        try {
            // Convert file to Base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = error => reject(error);
            });

            // First upload the image
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base64: base64,
                    mimeType: file.type,
                    fileName: file.name
                })
            })
            
            if (!uploadRes.ok) throw new Error('Upload failed')
            
            const { url } = await uploadRes.json()

            // Then update the profile
            const profileRes = await fetch('/api/users/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: url }),
            })

            if (!profileRes.ok) throw new Error('Profile update failed')

            await update({ image: url })
            toast.success('Profile picture updated!', { id: loadingToast })
        } catch (error) {
            console.error('Image upload error:', error)
            toast.error('Failed to update picture', { id: loadingToast })
        }
    }

    const tabs = [
        { id: 'profile', icon: <User size={18} />, label: 'Profile' },
        { id: 'notifications', icon: <Bell size={18} />, label: 'Notifications' },
        { id: 'privacy', icon: <Shield size={18} />, label: 'Privacy' },
        { id: 'about', icon: <Info size={18} />, label: 'About' },
    ] as const

    if (status === 'loading') return null

    return (
        <div className="h-screen flex overflow-hidden" style={{ background: 'var(--bg-base)' }}>
            {/* Settings sidebar */}
            <div className="w-full md:w-96 shrink-0 flex flex-col h-full border-r"
                style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}>
                {/* Header */}
                <div className="flex items-center space-x-3 px-4 py-4"
                    style={{ background: 'var(--brand-primary)', color: 'white' }}>
                    <button onClick={() => router.push('/chat')} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                        <ArrowLeft size={20} className="text-white" />
                    </button>
                    <h1 className="text-lg font-semibold text-white">Settings</h1>
                </div>

                {/* Profile preview */}
                <div className="flex items-center space-x-4 px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="relative group cursor-pointer">
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            title="Change profile picture"
                        />
                        {session?.user?.image ? (
                            <Image src={session.user.image} alt="avatar" width={64} height={64} className="rounded-full object-cover w-16 h-16 group-hover:opacity-80 transition-opacity" />
                        ) : (
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white group-hover:opacity-80 transition-opacity"
                                style={{ background: 'var(--brand-secondary)' }}>
                                {(session?.user?.name || 'U')[0].toUpperCase()}
                            </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center z-0"
                            style={{ background: 'var(--brand-accent)' }}>
                            <Camera size={12} className="text-white" />
                        </div>
                    </div>
                    <div>
                        <p className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{session?.user?.name || 'User'}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{session?.user?.email}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--brand-accent)' }}>🟢 Online</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex-1 overflow-y-auto py-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="flex items-center space-x-4 w-full px-6 py-4 text-left transition-colors"
                            style={{
                                background: activeTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
                                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                borderLeft: activeTab === tab.id ? `3px solid var(--brand-accent)` : '3px solid transparent',
                            }}
                        >
                            <span style={{ color: activeTab === tab.id ? 'var(--brand-accent)' : 'var(--text-muted)' }}>{tab.icon}</span>
                            <span className="font-medium text-sm">{tab.label}</span>
                        </button>
                    ))}

                    <hr style={{ borderColor: 'var(--border)', margin: '8px 0' }} />

                    {/* Theme toggle */}
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center space-x-4">
                            <span style={{ color: 'var(--text-muted)' }}>{isDark ? <Moon size={18} /> : <Sun size={18} />}</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                {isDark ? 'Dark mode' : 'Light mode'}
                            </span>
                        </div>
                        <button onClick={toggleTheme}
                            className="w-12 h-6 rounded-full relative transition-all shrink-0"
                            style={{ background: isDark ? 'var(--brand-accent)' : 'var(--border)' }}>
                            <div className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                                style={{ left: isDark ? '26px' : '4px' }} />
                        </button>
                    </div>

                    <hr style={{ borderColor: 'var(--border)', margin: '8px 0' }} />

                    {/* Logout */}
                    <button onClick={() => signOut({ callbackUrl: '/chat' })}
                        className="flex items-center space-x-4 w-full px-6 py-4 text-left transition-colors hover:opacity-80">
                        <LogOut size={18} style={{ color: '#EF4444' }} />
                        <span className="text-sm font-medium" style={{ color: '#EF4444' }}>Log out</span>
                    </button>
                </div>
            </div>

            {/* Settings content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8" style={{ background: 'var(--bg-base)' }}>
                {activeTab === 'profile' && (
                    <div className="max-w-xl space-y-6">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Profile</h2>

                        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>Display Name</label>
                                <input value={name} onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl text-sm outline-none input-glow"
                                    style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>Email</label>
                                <input value={session?.user?.email || ''} disabled
                                    className="w-full px-4 py-3 rounded-xl text-sm opacity-60"
                                    style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                                />
                            </div>
                            <button onClick={handleSaveProfile} disabled={saving}
                                className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                                style={{ background: 'var(--brand-accent)' }}>
                                {saving ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'privacy' && (
                    <div className="max-w-xl space-y-6">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Privacy</h2>
                        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            {[
                                { label: 'Last seen', value: 'Everyone' },
                                { label: 'Profile photo', value: 'Everyone' },
                                { label: 'Read receipts', value: 'On' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'about' && (
                    <div className="max-w-xl space-y-6">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>About</h2>
                        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            <div className="flex items-center space-x-3">
                                <Key size={20} style={{ color: 'var(--brand-accent)' }} />
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>End-to-end Encryption</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Messages are E2EE using TweetNaCl (XSalsa20-Poly1305)</p>
                                </div>
                            </div>
                            <hr style={{ borderColor: 'var(--border)' }} />
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                <strong>Let&apos;s Chat</strong> v1.0.0 — Built with Next.js 16, Socket.IO, WebRTC, MongoDB, NextAuth.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="max-w-xl space-y-6">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h2>
                        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            {[
                                { label: 'Message notifications', desc: 'Show notification for new messages' },
                                { label: 'Call notifications', desc: 'Notify for incoming calls' },
                                { label: 'Group notifications', desc: 'Notify for group messages' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                                    </div>
                                    <button className="w-10 h-5.5 rounded-full shrink-0"
                                        style={{ background: 'var(--brand-accent)', width: 40, height: 22, position: 'relative' }}>
                                        <div className="w-4 h-4 rounded-full bg-white absolute top-1 right-1" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
