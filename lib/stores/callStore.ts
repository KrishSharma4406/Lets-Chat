/**
 * Zustand store: Active call state
 */
import { create } from 'zustand'

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'active' | 'ended'

interface CallState {
    status: CallStatus
    callId: string | null
    dbCallId: string | null  // Actual database call ID for DB updates
    conversationId: string | null
    remoteUserId: string | null
    remoteUserName: string | null
    remoteUserImage: string | null
    isVideo: boolean
    isAudioMuted: boolean
    isVideoOff: boolean
    startedAt: Date | null

    setCall: (data: Partial<CallState>) => void
    resetCall: () => void
    toggleMute: () => void
    toggleVideo: () => void
}

export const useCallStore = create<CallState>((set) => ({
    status: 'idle',
    callId: null,
    dbCallId: null,
    conversationId: null,
    remoteUserId: null,
    remoteUserName: null,
    remoteUserImage: null,
    isVideo: true,
    isAudioMuted: false,
    isVideoOff: false,
    startedAt: null,

    setCall: (data) => set((s) => ({ ...s, ...data })),

    resetCall: () =>
        set({
            status: 'idle',
            callId: null,
            dbCallId: null,
            conversationId: null,
            remoteUserId: null,
            remoteUserName: null,
            remoteUserImage: null,
            isVideo: true,
            isAudioMuted: false,
            isVideoOff: false,
            startedAt: null,
        }),

    toggleMute: () => set((s) => ({ isAudioMuted: !s.isAudioMuted })),
    toggleVideo: () => set((s) => ({ isVideoOff: !s.isVideoOff })),
}))
