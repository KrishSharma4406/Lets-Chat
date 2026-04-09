'use client'
/**
 * MessageBubble — renders a single chat message with:
 * - Sender avatar + name (for groups / incoming)
 * - Reply-to quote
 * - Text, image, file, or video content
 * - Emoji reactions
 * - Timestamp + read-receipt ticks
 * - Context menu (reply, copy, edit, delete, react)
 */
import { useState, useRef } from 'react'
import { format } from 'date-fns'
import Image from 'next/image'
import {CheckCheck, Reply, Copy, Edit2, Trash2, MoreHorizontal, Smile } from 'lucide-react'
import type { Message } from '@/hooks/useMessages'
import toast from 'react-hot-toast'

interface Props {
    message: Message
    isOwn: boolean
    isGroup: boolean
    isLast: boolean
    currentUserId: string
    onReply?: (msg: Message) => void
    onDelete?: (id: string) => void
    onEdit?: (msg: Message) => void
    onReact?: (messageId: string, emoji: string) => void
    showAvatar?: boolean
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

function TickIcon({ seenBy, senderId, currentUserId }: { seenBy?: Array<{ userId: string }>; senderId: string; currentUserId: string }) {
    if (senderId !== currentUserId) return null
    const readByOther = seenBy?.some((s) => s.userId !== currentUserId)
    return readByOther
        ? <CheckCheck size={15} className="tick-read shrink-0" />
        : <CheckCheck size={15} className="tick-delivered shrink-0" />
}

export default function MessageBubble({
    message, isOwn, isGroup, currentUserId,
    onReply, onDelete, onEdit, onReact, showAvatar,
}: Props) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [emojiOpen, setEmojiOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    const isDeleted = message.isDeleted

    // Group reactions by emoji
    const reactionGroups: Record<string, { count: number; hasMe: boolean }> = {}
    for (const r of message.reactions || []) {
        if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = { count: 0, hasMe: false }
        reactionGroups[r.emoji].count++
        if (r.userId === currentUserId) reactionGroups[r.emoji].hasMe = true
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content).then(() => toast.success('Copied to clipboard'))
        setMenuOpen(false)
    }

    const renderContent = () => {
        if (isDeleted) {
            return <p className="text-sm italic" style={{ color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>This message was deleted</p>
        }

        const hasImage = message.image && (message.fileType?.startsWith('image/') || message.image.startsWith('data:image'))
        const hasVideo = message.image && message.fileType?.startsWith('video/')
        const hasFile = message.image && !hasImage && !hasVideo

        return (
            <>
                {/* Reply quote */}
                {message.replyTo && (
                    <div className="mb-2 pl-2 border-l-2 rounded" style={{ borderColor: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--brand-accent)' }}>
                        <p className="text-xs font-semibold" style={{ color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--brand-secondary)' }}>
                            {message.replyTo.sender.name || message.replyTo.sender.email}
                        </p>
                        <p className="text-xs line-clamp-2" style={{ color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>
                            {message.replyTo.content}
                        </p>
                    </div>
                )}

                {/* Image */}
                {hasImage && (
                    <div className="mb-1">
                        <Image
                            src={message.image!}
                            alt={message.fileName || 'image'}
                            width={260}
                            height={200}
                            className="rounded-lg object-cover cursor-pointer w-full max-w-xs"
                            style={{ maxWidth: 'min(280px, 100vw - 80px)' }}
                            onClick={() => window.open(message.image!, '_blank')}
                        />
                    </div>
                )}

                {/* Video */}
                {hasVideo && (
                    <video controls className="rounded-lg w-full max-w-xs mb-1" style={{ maxHeight: 200, maxWidth: 'min(280px, 100vw - 80px)' }}>
                        <source src={message.image!} type={message.fileType || 'video/mp4'} />
                    </video>
                )}

                {/* File */}
                {hasFile && (
                    <a href={message.image!} download={message.fileName || 'file'}
                        className="flex items-center space-x-2 px-2 sm:px-3 py-2 rounded-lg mb-1 transition-opacity hover:opacity-80 w-full max-w-xs"
                        style={{ background: isOwn ? 'rgba(255,255,255,0.15)' : 'var(--bg-input)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: isOwn ? 'rgba(255,255,255,0.2)' : 'var(--brand-accent)' }}>
                            <span className="text-xs font-bold text-white">{(message.fileName?.split('.').pop() || 'FILE').toUpperCase().slice(0, 3)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium truncate" style={{ color: isOwn ? 'white' : 'var(--text-primary)' }}>{message.fileName}</p>
                            <p className="text-xs" style={{ color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>Tap to download</p>
                        </div>
                    </a>
                )}

                {/* Text */}
                {message.content && (
                    <p className="text-xs sm:text-sm wrap-break-word leading-relaxed" style={{ color: isOwn ? 'white' : 'var(--text-primary)' }}>
                        {message.content}
                    </p>
                )}

                {/* Footer row: time + edited + read ticks */}
                <div className="flex items-center justify-end space-x-1 mt-0.5">
                    {message.isEdited && (
                        <span className="text-xs" style={{ color: isOwn ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)' }}>edited</span>
                    )}
                    <span className="text-xs shrink-0" style={{ color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>
                        {format(new Date(message.createdAt), 'HH:mm')}
                    </span>
                    <TickIcon seenBy={message.seenBy} senderId={message.sender.id} currentUserId={currentUserId} />
                </div>
            </>
        )
    }

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-0.5`}>
            {/* Incoming avatar (groups) */}
            {!isOwn && isGroup && showAvatar && (
                <div className="w-7 h-7 rounded-full shrink-0 mt-1 mr-1 flex items-center justify-center text-xs text-white font-semibold"
                    style={{ background: 'var(--brand-secondary)' }}>
                    {(message.sender.name || message.sender.email)?.[0]?.toUpperCase()}
                </div>
            )}
            {!isOwn && isGroup && !showAvatar && <div className="w-8 shrink-0" />}

            <div className={`relative flex flex-col ${isOwn ? 'items-end' : 'items-start'}`} style={{ maxWidth: 'min(75%, 100vw - 80px)' }}>
                {/* Sender name for groups */}
                {!isOwn && isGroup && showAvatar && (
                    <p className="text-xs font-semibold mb-1 ml-1" style={{ color: 'var(--brand-secondary)' }}>
                        {message.sender.name || message.sender.email}
                    </p>
                )}

                <div className="relative">
                    {/* Bubble */}
                    <div
                        className={`relative px-2 sm:px-3 py-2 rounded-xl shadow-msg ${isOwn ? 'bubble-out' : 'bubble-in'}`}
                        style={{
                            background: isOwn ? 'var(--bg-bubble-out)' : 'var(--bg-bubble-in)',
                            borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            border: isOwn ? 'none' : '1px solid var(--border)',
                        }}
                    >
                        {renderContent()}
                    </div>

                    {/* Hover action bar */}
                    {!isDeleted && (
                        <div
                            className={`absolute top-0 hidden sm:flex items-center bg-opacity-90 rounded-full shadow px-1 py-0.5 space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isOwn ? '-left-28' : '-right-28'}`}
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', transform: isOwn ? 'translateY(-50%)' : 'translateY(-50%)' }}
                        >
                            <button onClick={() => setEmojiOpen(!emojiOpen)} className="p-1.5 rounded-full transition-colors hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
                                <Smile size={14} />
                            </button>
                            <button onClick={() => onReply?.(message)} className="p-1.5 rounded-full transition-colors hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
                                <Reply size={14} />
                            </button>
                            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-full transition-colors hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
                                <MoreHorizontal size={14} />
                            </button>
                        </div>
                    )}

                    {/* Quick emoji picker */}
                    {emojiOpen && (
                        <div className={`absolute z-20 flex items-center space-x-1 p-2 rounded-2xl shadow-lg ${isOwn ? 'right-0' : 'left-0'}`}
                            style={{ bottom: '110%', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            {QUICK_EMOJIS.map((e) => (
                                <button key={e} className="text-xl hover:scale-125 transition-transform"
                                    onClick={() => { onReact?.(message.id, e); setEmojiOpen(false) }}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Context menu */}
                    {menuOpen && (
                        <div ref={menuRef}
                            className={`absolute z-20 rounded-xl shadow-lg py-1 min-w-36 animate-fade-in ${isOwn ? 'right-0' : 'left-0'}`}
                            style={{ bottom: '110%', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            <button onClick={() => { onReply?.(message); setMenuOpen(false) }}
                                className="flex items-center space-x-2 px-4 py-2 text-sm w-full text-left hover:opacity-70" style={{ color: 'var(--text-primary)' }}>
                                <Reply size={14} /><span>Reply</span>
                            </button>
                            <button onClick={handleCopy}
                                className="flex items-center space-x-2 px-4 py-2 text-sm w-full text-left hover:opacity-70" style={{ color: 'var(--text-primary)' }}>
                                <Copy size={14} /><span>Copy</span>
                            </button>
                            {isOwn && (
                                <button onClick={() => { onEdit?.(message); setMenuOpen(false) }}
                                    className="flex items-center space-x-2 px-4 py-2 text-sm w-full text-left hover:opacity-70" style={{ color: 'var(--text-primary)' }}>
                                    <Edit2 size={14} /><span>Edit</span>
                                </button>
                            )}
                            {isOwn && (
                                <button onClick={() => { onDelete?.(message.id); setMenuOpen(false) }}
                                    className="flex items-center space-x-2 px-4 py-2 text-sm w-full text-left hover:opacity-70" style={{ color: '#EF4444' }}>
                                    <Trash2 size={14} /><span>Delete</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Reactions */}
                {Object.keys(reactionGroups).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(reactionGroups).map(([emoji, { count, hasMe }]) => (
                            <button key={emoji} onClick={() => onReact?.(message.id, emoji)}
                                className="reaction-bubble"
                                style={{
                                    background: hasMe ? 'rgba(37,211,102,0.15)' : 'var(--bg-surface)',
                                    borderColor: hasMe ? 'var(--brand-accent)' : 'var(--border)',
                                }}>
                                <span>{emoji}</span>
                                {count > 1 && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{count}</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
