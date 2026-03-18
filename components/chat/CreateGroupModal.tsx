'use client'
/**
 * CreateGroupModal — create a named group chat with selected participants
 */
import { useState, useEffect } from 'react'
import { X, Search, Users, Check } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

interface User {
    id: string; name: string | null; email: string; image: string | null
}

interface Props {
    currentUserId: string
    onClose: () => void
    onCreated: (id: string) => void
}

export default function CreateGroupModal({ currentUserId, onClose, onCreated }: Props) {
    const [step, setStep] = useState<'select' | 'name'>('select')
    const [users, setUsers] = useState<User[]>([])
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<User[]>([])
    const [groupName, setGroupName] = useState('')
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        fetch('/api/users')
            .then((r) => r.json())
            .then((data: User[]) => setUsers(data.filter((u) => u.id !== currentUserId)))
            .catch(() => { })
    }, [currentUserId])

    const filtered = users.filter((u) =>
        (u.name || u.email).toLowerCase().includes(search.toLowerCase())
    )

    const toggle = (u: User) => {
        setSelected((prev) =>
            prev.find((x) => x.id === u.id) ? prev.filter((x) => x.id !== u.id) : [...prev, u]
        )
    }

    const handleCreate = async () => {
        if (!groupName.trim()) { toast.error('Enter a group name'); return }
        if (selected.length < 1) { toast.error('Select at least 1 member'); return }
        setCreating(true)
        try {
            const res = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isGroup: true, name: groupName.trim(), members: selected.map((u) => u.id) }),
            })
            if (!res.ok) throw new Error()
            const conv = await res.json()
            toast.success('Group created!')
            onCreated(conv.id)
        } catch {
            toast.error('Failed to create group')
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl animate-slide-up"
                style={{ background: 'var(--bg-surface)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--brand-primary)' }}>
                    <div className="flex items-center space-x-3">
                        <Users size={20} className="text-white" />
                        <div>
                            <p className="font-semibold text-white text-sm">
                                {step === 'select' ? 'Add group members' : 'Group name'}
                            </p>
                            {step === 'select' && selected.length > 0 && (
                                <p className="text-xs text-white/75">{selected.length} selected</p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                        <X size={18} className="text-white" />
                    </button>
                </div>

                {step === 'select' ? (
                    <>
                        {/* Selected chips */}
                        {selected.length > 0 && (
                            <div className="flex flex-wrap gap-2 px-4 pt-3">
                                {selected.map((u) => (
                                    <div key={u.id} className="flex items-center space-x-1 rounded-full px-2 py-1"
                                        style={{ background: 'var(--brand-accent)', color: 'white' }}>
                                        <span className="text-xs font-medium">{u.name || u.email}</span>
                                        <button onClick={() => toggle(u)} className="opacity-75 hover:opacity-100"><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Search */}
                        <div className="px-4 py-3">
                            <div className="flex items-center space-x-2 rounded-xl px-3 py-2" style={{ background: 'var(--bg-input)' }}>
                                <Search size={16} style={{ color: 'var(--text-muted)' }} />
                                <input
                                    type="text" placeholder="Search users…" value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="flex-1 text-sm bg-transparent outline-none"
                                    style={{ color: 'var(--text-primary)' }}
                                />
                            </div>
                        </div>

                        {/* User list */}
                        <div className="max-h-60 overflow-y-auto">
                            {filtered.length === 0 ? (
                                <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No users found</p>
                            ) : filtered.map((u) => {
                                const isSelected = selected.some((x) => x.id === u.id)
                                return (
                                    <div key={u.id} onClick={() => toggle(u)}
                                        className="flex items-center space-x-3 px-4 py-3 cursor-pointer transition-colors border-b"
                                        style={{ borderColor: 'var(--border-subtle)', background: isSelected ? 'rgba(37,211,102,0.08)' : 'transparent' }}
                                        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-input)' }}
                                        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
                                        <div className="relative">
                                            {u.image ? (
                                                <Image src={u.image} alt={u.name || ''} width={40} height={40} className="rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                                                    style={{ background: 'var(--brand-secondary)' }}>
                                                    {(u.name || u.email)[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{u.name || u.email}</p>
                                            {u.name && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>}
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0`}
                                            style={{
                                                background: isSelected ? 'var(--brand-accent)' : 'transparent',
                                                borderColor: isSelected ? 'var(--brand-accent)' : 'var(--border)',
                                            }}>
                                            {isSelected && <Check size={12} className="text-white" />}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
                            <button
                                onClick={() => { if (selected.length < 1) { toast.error('Select at least 1 member'); return } setStep('name') }}
                                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all"
                                style={{ background: selected.length > 0 ? 'var(--brand-accent)' : 'var(--border)', color: selected.length > 0 ? 'white' : 'var(--text-muted)' }}>
                                Next →
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="p-5 space-y-4">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {selected.length + 1} participants including you
                        </p>
                        <input
                            type="text"
                            placeholder="Group name (e.g. Team Alpha)"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                            autoFocus
                            className="w-full px-4 py-3 rounded-xl text-sm outline-none input-glow border"
                            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                        />
                        <div className="flex space-x-3">
                            <button onClick={() => setStep('select')} className="flex-1 py-3 rounded-xl font-medium text-sm border"
                                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                Back
                            </button>
                            <button onClick={handleCreate} disabled={creating || !groupName.trim()}
                                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-60"
                                style={{ background: 'var(--brand-accent)' }}>
                                {creating ? 'Creating…' : 'Create group'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
