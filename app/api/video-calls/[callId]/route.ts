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
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!status) {
      return new NextResponse("Status is required", { status: 400 })
    }

    const call = await prisma.videoCall.findUnique({
      where: { id: callId }
    })

    if (!call) {
      return new NextResponse("Call not found", { status: 404 })
    }

    // Only recipient can accept, only participants can end
    if (status === "accepted" && call.recipientId !== session.user.id) {
      return new NextResponse("Only recipient can accept call", { status: 403 })
    }

    if (status === "rejected" && call.recipientId !== session.user.id) {
      return new NextResponse("Only recipient can reject call", { status: 403 })
    }

    const updateData: { status: string; startedAt?: Date; endedAt?: Date; duration?: number } = { status }

    if (status === "accepted") {
      updateData.startedAt = new Date()
    } else if (status === "ended" || status === "rejected") {
      updateData.endedAt = new Date()
      if (duration) {
        updateData.duration = duration
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
    console.log(error, 'VIDEO_CALL_UPDATE_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
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
      return new NextResponse("Unauthorized", { status: 401 })
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
      return new NextResponse("Call not found", { status: 404 })
    }

    // Check authorization
    if (
      call.callerId !== session.user.id &&
      call.recipientId !== session.user.id
    ) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    return NextResponse.json(call)
  } catch (error) {
    console.log(error, 'VIDEO_CALL_GET_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}
