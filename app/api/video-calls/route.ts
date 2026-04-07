import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/video-calls
 * Initiate a video call
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { recipientId, isVideo } = await request.json()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!recipientId) {
      return NextResponse.json({ error: "Recipient ID is required" }, { status: 400 })
    }

    if (recipientId === session.user.id) {
      return NextResponse.json({ error: "Cannot call yourself" }, { status: 400 })
    }

    // Check if recipient is blocked
    const isBlocked = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: recipientId,
          blockedId: session.user.id
        }
      }
    })

    if (isBlocked) {
      return NextResponse.json({ error: "You are blocked by this user" }, { status: 403 })
    }

    // Check if user is blocking recipient
    const isBlocking = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: recipientId
        }
      }
    })

    if (isBlocking) {
      return NextResponse.json({ error: "You have blocked this user" }, { status: 403 })
    }

    // Create video call record
    const call = await prisma.videoCall.create({
      data: {
        callerId: session.user.id,
        recipientId,
        isVideo,
        status: "pending"
      },
      include: {
        caller: {
          select: { id: true, name: true, image: true, email: true }
        },
        recipient: {
          select: { id: true, name: true, image: true, email: true }
        }
      }
    })

    return NextResponse.json(call)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/video-calls] VIDEO_CALL_CREATE_ERROR:', errorMessage, error)
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 })
  }
}

/**
 * GET /api/video-calls
 * Get user's video call history
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const calls = await prisma.videoCall.findMany({
      where: {
        OR: [
          { callerId: session.user.id },
          { recipientId: session.user.id }
        ]
      },
      include: {
        caller: {
          select: { id: true, name: true, image: true, email: true }
        },
        recipient: {
          select: { id: true, name: true, image: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json(calls)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[GET /api/video-calls] VIDEO_CALL_LIST_ERROR:', errorMessage, error)
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 })
  }
}
