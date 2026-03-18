/**
 * Zustand store: Socket.IO singleton + connection state
 */
import { create } from 'zustand'
import { Socket } from 'socket.io-client'

interface SocketState {
    socket: Socket | null
    isConnected: boolean
    setSocket: (s: Socket | null) => void
    setConnected: (v: boolean) => void
}

export const useSocketStore = create<SocketState>((set) => ({
    socket: null,
    isConnected: false,
    setSocket: (s) => set({ socket: s }),
    setConnected: (v) => set({ isConnected: v }),
}))
