import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Store and retrieve WebRTC signaling data (offers, answers, ICE candidates)
 * Uses Prisma database for persistent storage across serverless instances
 */

export async function POST(request: NextRequest, { params }: { params: Promise<{ callId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { callId } = await params
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

    // Store signal in database
    await prisma.webRTCSignal.create({
      data: {
        callId,
        fromUserId: session.user.id,
        type: type as 'offer' | 'answer' | 'candidate',
        data: JSON.stringify(data),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/video-calls/[callId]/signal] Error:', errorMessage, error)
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ callId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { callId } = await params

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

    // Get signals from remote user (not from current user)
    const remoteUserId = videoCall.callerId === session.user.id ? videoCall.recipientId : videoCall.callerId

    const signals = await prisma.webRTCSignal.findMany({
      where: {
        callId,
        fromUserId: remoteUserId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Transform signals to match expected format
    const transformedSignals = signals.map((signal) => ({
      ...signal,
      data: JSON.parse(signal.data),
      timestamp: signal.createdAt.getTime(),
    }))

    return NextResponse.json(transformedSignals)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[GET /api/video-calls/[callId]/signal] Error:', errorMessage, error)
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 })
  }
}

/**
 * DELETE /api/video-calls/[callId]/signal
 * Clean up old signals for a call (optional cleanup endpoint)
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ callId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { callId } = await params

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

    // Delete old signals (older than 10 minutes) to prevent database bloat
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const deleted = await prisma.webRTCSignal.deleteMany({
      where: {
        callId,
        createdAt: {
          lt: tenMinutesAgo,
        },
      },
    })

    return NextResponse.json({ deleted: deleted.count })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[DELETE /api/video-calls/[callId]/signal] Error:', errorMessage, error)
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 })
  }
}
