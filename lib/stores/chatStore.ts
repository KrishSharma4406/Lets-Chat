/**
 * Zustand store: Chat conversations, selected conversation, unread counts
 */
import { create } from 'zustand'

export interface ConversationSummary {
    id: string
    name: string | null
    isGroup: boolean
    groupImage?: string | null
    updatedAt: string
    unreadCount?: number
    participants: Array<{
        user: {
            id: string
            name: string | null
            email: string
            image: string | null
            isOnline?: boolean
            lastSeen?: string | null
        }
    }>
    messages: Array<{
        id: string
        content: string
        image?: string | null
        createdAt: string
        sender: { id: string; name: string | null; email: string }
    }>
}

interface ChatState {
    conversations: ConversationSummary[]
    selectedConversationId: string | null
    typingMap: Record<string, string[]>              // conversationId -> [userId, ...]
    onlineUsers: Set<string>
    setConversations: (c: ConversationSummary[]) => void
    setSelected: (id: string | null) => void
    setTyping: (conversationId: string, userIds: string[]) => void
    setUserOnline: (userId: string, online: boolean) => void
    markRead: (conversationId: string) => void
    upsertConversationMessage: (conversationId: string, msg: ConversationSummary['messages'][0]) => void
}

export const useChatStore = create<ChatState>((set) => ({
    conversations: [],
    selectedConversationId: null,
    typingMap: {},
    onlineUsers: new Set(),

    setConversations: (c) => set({ conversations: c }),
    setSelected: (id) => set({ selectedConversationId: id }),

    setTyping: (conversationId, userIds) =>
        set((s) => ({ typingMap: { ...s.typingMap, [conversationId]: userIds } })),

    setUserOnline: (userId, online) =>
        set((s) => {
            const next = new Set(s.onlineUsers)
            online ? next.add(userId) : next.delete(userId)
            return { onlineUsers: next }
        }),

    markRead: (conversationId) =>
        set((s) => ({
            conversations: s.conversations.map((c) =>
                c.id === conversationId ? { ...c, unreadCount: 0 } : c
            ),
        })),

    upsertConversationMessage: (conversationId, msg) =>
        set((s) => ({
            conversations: s.conversations.map((c) =>
                c.id === conversationId
                    ? { ...c, messages: [msg], updatedAt: msg.createdAt }
                    : c
            ),
        })),
}))
