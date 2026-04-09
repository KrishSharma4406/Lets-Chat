'use client'
/**
 * MessageInput — rich text input with:
 * - Emoji picker
 * - File/media attachment (type menu)
 * - Reply-to preview strip
 * - Edit mode
 * - Socket.IO typing indicator emission
 */
import { useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Send, Paperclip, Smile, X, Image as Img, FileText, Video, Music, Archive } from 'lucide-react'
import { useSocketStore } from '@/lib/stores/socketStore'
import type { Message } from '@/hooks/useMessages'

// Lazy load emoji picker to reduce initial bundle
const EmojiPicker = dynamic(() => import('@emoji-mart/react'), { ssr: false })

interface Props {
    conversationId: string
    currentUserId: string
    replyTo?: Message | null
    editMessage?: Message | null
    onClearReply: () => void
    onClearEdit: () => void
    onSend: (content: string, image?: string, fileName?: string, fileType?: string, replyToId?: string) => Promise<void>
    onSaveEdit: (messageId: string, newContent: string) => Promise<void>
    disabled?: boolean
}

const FILE_TYPES = [
    { label: 'Images', icon: <Img size={16} />, accept: 'image/*' },
    { label: 'Videos', icon: <Video size={16} />, accept: 'video/*' },
    { label: 'Documents', icon: <FileText size={16} />, accept: 'application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv' },
    { label: 'Audio', icon: <Music size={16} />, accept: 'audio/*' },
    { label: 'Archives', icon: <Archive size={16} />, accept: '.zip,.rar,.7z,.tar,.gz' },
]

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

export default function MessageInput({
    conversationId, currentUserId, replyTo, editMessage,
    onClearReply, onClearEdit, onSend, onSaveEdit, disabled,
}: Props) {
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const [showEmoji, setShowEmoji] = useState(false)
    const [showFileMenu, setShowFileMenu] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [filePreview, setFilePreview] = useState<string | null>(null)
    const [fileAccept, setFileAccept] = useState('image/*')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const fileMenuRef = useRef<HTMLDivElement>(null)
    const { socket } = useSocketStore()
    const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Pre-fill text when editing
    useState(() => {
        if (editMessage) setText(editMessage.content)
    })

    const emitTyping = useCallback(() => {
        if (!socket) return
        socket.emit('typing:start', { conversationId, userId: currentUserId, userName: '' })
        if (typingRef.current) clearTimeout(typingRef.current)
        typingRef.current = setTimeout(() => {
            socket.emit('typing:stop', { conversationId, userId: currentUserId })
        }, 2500)
    }, [socket, conversationId, currentUserId])

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setText(e.target.value)
        emitTyping()
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > MAX_FILE_BYTES) {
            alert('File must be under 5 MB')
            return
        }
        setSelectedFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setFilePreview(reader.result as string)
        reader.readAsDataURL(file)
        e.target.value = ''
        setShowFileMenu(false)
    }

    const clearFile = () => { setSelectedFile(null); setFilePreview(null) }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if ((!text.trim() && !selectedFile) || sending || disabled) return

        setSending(true)
        try {
            if (editMessage) {
                await onSaveEdit(editMessage.id, text.trim())
                onClearEdit()
            } else {
                await onSend(
                    text.trim(),
                    filePreview || undefined,
                    selectedFile?.name,
                    selectedFile?.type,
                    replyTo?.id
                )
                onClearReply()
            }
            setText('')
            clearFile()
        } finally {
            setSending(false)
            if (socket) socket.emit('typing:stop', { conversationId, userId: currentUserId })
        }
    }

    const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e as unknown as React.FormEvent)
        }
    }

    const onEmojiSelect = (emoji: { native: string }) => {
        setText((t) => t + emoji.native)
        setShowEmoji(false)
    }

    const isEdit = !!editMessage
    const canSend = (text.trim().length > 0 || selectedFile) && !sending && !disabled

    return (
        <div style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
            {/* Reply/Edit strip */}
            {(replyTo || editMessage) && (
                <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
                    <div className="flex items-start space-x-2 min-w-0">
                        <div className="w-0.5 h-10 rounded flex-shrink-0" style={{ background: 'var(--brand-accent)' }} />
                        <div className="min-w-0">
                            <p className="text-xs font-semibold" style={{ color: 'var(--brand-secondary)' }}>
                                {isEdit ? 'Edit message' : `Reply to ${replyTo?.sender.name || replyTo?.sender.email}`}
                            </p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                {isEdit ? editMessage?.content : replyTo?.content || '📎 Attachment'}
                            </p>
                        </div>
                    </div>
                    <button onClick={isEdit ? onClearEdit : onClearReply} className="p-1 rounded-full ml-2 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* File preview */}
            {selectedFile && filePreview && (
                <div className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    {selectedFile.type.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={filePreview} alt="preview" className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-input)' }}>
                            <FileText size={20} style={{ color: 'var(--brand-secondary)' }} />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm truncate font-medium" style={{ color: 'var(--text-primary)' }}>{selectedFile.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={clearFile} className="p-1.5 rounded-full flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Emoji picker */}
            {showEmoji && (
                <div className="absolute bottom-20 left-2 z-50">
                    <EmojiPicker onEmojiSelect={onEmojiSelect} theme="auto" />
                </div>
            )}

            {/* File type menu */}
            {showFileMenu && (
                <div ref={fileMenuRef} className="absolute bottom-20 left-12 z-50 rounded-xl shadow-lg py-1 animate-slide-up" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    {FILE_TYPES.map((ft) => (
                        <button key={ft.label}
                            onClick={() => { setFileAccept(ft.accept); setShowFileMenu(false); fileInputRef.current?.click() }}
                            className="flex items-center space-x-3 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm w-full text-left hover:opacity-70 transition-opacity"
                            style={{ color: 'var(--text-primary)' }}>
                            <span style={{ color: 'var(--brand-secondary)' }}>{ft.icon}</span>
                            <span>{ft.label}</span>
                        </button>
                    ))}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 sm:py-3">
                <input ref={fileInputRef} type="file" accept={fileAccept} className="hidden" onChange={handleFileSelect} />

                {/* Emoji button */}
                <button type="button" onClick={() => { setShowEmoji(!showEmoji); setShowFileMenu(false) }}
                    className="p-2 rounded-full flex-shrink-0 transition-colors hover:opacity-70"
                    style={{ color: showEmoji ? 'var(--brand-accent)' : 'var(--text-muted)' }}>
                    <Smile size={18} />
                </button>

                {/* Attachment button */}
                <button type="button" onClick={() => { setShowFileMenu(!showFileMenu); setShowEmoji(false) }}
                    className="p-2 rounded-full flex-shrink-0 transition-colors hover:opacity-70"
                    style={{ color: showFileMenu ? 'var(--brand-accent)' : 'var(--text-muted)' }}>
                    <Paperclip size={18} />
                </button>

                {/* Text input */}
                <input
                    type="text"
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={handleKey}
                    placeholder={disabled ? 'Offline…' : 'Message'}
                    disabled={sending || disabled}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm outline-none transition-all"
                    style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: 'none' }}
                />

                {/* Send button */}
                <button
                    type="submit"
                    disabled={!canSend}
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all"
                    style={{
                        background: canSend ? 'var(--brand-accent)' : 'var(--border)',
                        color: canSend ? 'white' : 'var(--text-muted)',
                        transform: canSend ? 'scale(1)' : 'scale(0.9)',
                    }}>
                    <Send size={18} />
                </button>
            </form>
        </div>
    )
}
