import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Store and retrieve WebRTC signaling data (offers, answers, ICE candidates)
 * Used as a fallback for Socket.IO on Vercel (serverless)
 */

interface SignalData {
  type: 'offer' | 'answer' | 'candidate'
  data: any
  fromUserId: string
  timestamp: number
}

// Temporary in-memory store for signaling data (per-call)
// In production with multiple instances, use Redis or database
const signalStore = new Map<string, SignalData[]>()

// Clean up old signals (older than 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [callId, signals] of signalStore.entries()) {
    const filtered = signals.filter(s => now - s.timestamp < 5 * 60 * 1000)
    if (filtered.length === 0) {
      signalStore.delete(callId)
    } else {
      signalStore.set(callId, filtered)
    }
  }
}, 30000)

export async function POST(request: NextRequest, { params }: { params: { callId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { callId } = params
    const { type, data } = await request.json()

    // Get call to verify user is participant
    const videoCall = await prisma.videoCall.findUnique({
      where: { id: callId },
    })

    if (!videoCall) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    const isParticipant = videoCall.callerId === session.user.id || videoCall.recipientId === session.user.id
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Store signal
    if (!signalStore.has(callId)) {
      signalStore.set(callId, [])
    }

    const signals = signalStore.get(callId)!
    signals.push({
      type: type as 'offer' | 'answer' | 'candidate',
      data,
      fromUserId: session.user.id,
      timestamp: Date.now(),
    })

    // Keep only last 100 signals per call
    if (signals.length > 100) {
      signals.shift()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Signal POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { callId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { callId } = params

    // Get call to verify user is participant
    const videoCall = await prisma.videoCall.findUnique({
      where: { id: callId },
    })

    if (!videoCall) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    const isParticipant = videoCall.callerId === session.user.id || videoCall.recipientId === session.user.id
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get signals from remote user
    const allSignals = signalStore.get(callId) || []
    const remoteUserId = videoCall.callerId === session.user.id ? videoCall.recipientId : videoCall.callerId

    const remoteSignals = allSignals.filter(s => s.fromUserId === remoteUserId)

    return NextResponse.json(remoteSignals)
  } catch (error) {
    console.error('Signal GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
