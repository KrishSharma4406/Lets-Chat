import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * PATCH /api/video-calls/[callId]
 * Update video call status (accept, reject, end)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params
    const session = await getServerSession(authOptions)
    const { status, duration } = await request.json()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    const call = await prisma.videoCall.findUnique({
      where: { id: callId }
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    // Only recipient can accept, only participants can end
    if (status === "accepted" && call.recipientId !== session.user.id) {
      return NextResponse.json({ error: "Only recipient can accept call" }, { status: 403 })
    }

    if (status === "rejected" && call.recipientId !== session.user.id) {
      return NextResponse.json({ error: "Only recipient can reject call" }, { status: 403 })
    }

    const updateData: { status: string; startedAt?: Date; endedAt?: Date; duration?: number } = { status }

    if (status === "accepted") {
      updateData.startedAt = new Date()
    } else if (status === "ended" || status === "rejected") {
      updateData.endedAt = new Date()
      if (duration) {
        updateData.duration = duration
      }
      
      // Clean up old signals for this call to prevent database bloat
      try {
        await prisma.webRTCSignal.deleteMany({
          where: { callId }
        })
      } catch (err) {
        console.debug('Error cleaning up signals:', err)
        // Don't fail the call end if cleanup fails
      }
    }

    const updatedCall = await prisma.videoCall.update({
      where: { id: callId },
      data: updateData,
      include: {
        caller: {
          select: { id: true, name: true, image: true }
        },
        recipient: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return NextResponse.json(updatedCall)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[PATCH /api/video-calls/[callId]] VIDEO_CALL_UPDATE_ERROR:', errorMessage, error)
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 })
  }
}

/**
 * GET /api/video-calls/[callId]
 * Get video call details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const call = await prisma.videoCall.findUnique({
      where: { id: callId },
      include: {
        caller: {
          select: { id: true, name: true, image: true, email: true }
        },
        recipient: {
          select: { id: true, name: true, image: true, email: true }
        }
      }
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    // Check authorization
    if (
      call.callerId !== session.user.id &&
      call.recipientId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json(call)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[GET /api/video-calls/[callId]] VIDEO_CALL_GET_ERROR:', errorMessage, error)
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 })
  }
}
