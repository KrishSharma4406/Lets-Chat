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
    const { recipientId } = await request.json()

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!recipientId) {
      return new NextResponse("Recipient ID is required", { status: 400 })
    }

    if (recipientId === session.user.id) {
      return new NextResponse("Cannot call yourself", { status: 400 })
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
      return new NextResponse("You are blocked by this user", { status: 403 })
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
      return new NextResponse("You have blocked this user", { status: 403 })
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
    console.log(error, 'VIDEO_CALL_CREATE_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
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
      return new NextResponse("Unauthorized", { status: 401 })
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
    console.log(error, 'VIDEO_CALL_LIST_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}
