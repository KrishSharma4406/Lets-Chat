import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/conversations/[conversationId]/typing
 * Update typing indicator
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params
    const session = await getServerSession(authOptions)
    const { isTyping } = await request.json()

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: session.user.id,
          conversationId: conversationId
        }
      }
    })

    if (!participant) {
      return new NextResponse("Not a participant in this conversation", { status: 403 })
    }

    if (isTyping) {
      // Create or update typing indicator
      const typing = await prisma.typingIndicator.upsert({
        where: {
          userId_conversationId: {
            userId: session.user.id,
            conversationId: conversationId
          }
        },
        update: {
          startedAt: new Date()
        },
        create: {
          userId: session.user.id,
          conversationId: conversationId
        }
      })

      return NextResponse.json(typing)
    } else {
      // Remove typing indicator
      await prisma.typingIndicator.deleteMany({
        where: {
          userId: session.user.id,
          conversationId: conversationId
        }
      })

      return NextResponse.json({ success: true, message: "Typing stopped" })
    }
  } catch (error) {
    console.log(error, 'TYPING_INDICATOR_ERROR')
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * GET /api/conversations/[conversationId]/typing
 * Get users currently typing
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: session.user.id,
          conversationId: conversationId
        }
      }
    })

    if (!participant) {
      return new NextResponse("Not a participant in this conversation", { status: 403 })
    }

    // Get users typing in the last 3 seconds
    const threeSecondsAgo = new Date(Date.now() - 3000)
    const typingUsers = await prisma.typingIndicator.findMany({
      where: {
        conversationId: conversationId,
        startedAt: {
          gte: threeSecondsAgo
        }
      },
      include: {
        user: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return NextResponse.json(typingUsers)
  } catch (error) {
    console.log(error, 'GET_TYPING_USERS_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}
