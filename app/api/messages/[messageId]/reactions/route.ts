import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/messages/[messageId]/reactions
 * Add reaction to a message
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params
    const session = await getServerSession(authOptions)
    const { emoji } = await request.json()

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!emoji) {
      return new NextResponse("Emoji is required", { status: 400 })
    }

    // Validate message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    })

    if (!message) {
      return new NextResponse("Message not found", { status: 404 })
    }

    // Check if user is part of conversation
    if (message.conversation.participants.length === 0) {
      return new NextResponse("Not a participant in this conversation", { status: 403 })
    }

    // Check if user is blocked
    const isBlocked = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: message.senderId,
          blockedId: session.user.id
        }
      }
    })

    if (isBlocked) {
      return new NextResponse("You are blocked by the sender", { status: 403 })
    }

    // Create or update reaction
    const reaction = await prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId: messageId,
          userId: session.user.id,
          emoji
        }
      },
      update: {
        createdAt: new Date()
      },
      create: {
        messageId: messageId,
        userId: session.user.id,
        emoji
      }
    })

    return NextResponse.json(reaction, { status: 201 })
  } catch (error) {
    console.log(error, 'ADD_REACTION_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}

/**
 * GET /api/messages/[messageId]/reactions
 * Get all reactions for a message
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const reactions = await prisma.messageReaction.findMany({
      where: { messageId: messageId },
      include: {
        user: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return NextResponse.json(reactions)
  } catch (error) {
    console.log(error, 'GET_REACTIONS_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}

/**
 * DELETE /api/messages/[messageId]/reactions/[emoji]
 * Remove reaction from message
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params
    const { emoji } = await request.json()
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const reaction = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId: messageId,
          userId: session.user.id,
          emoji: emoji
        }
      }
    })

    if (!reaction) {
      return new NextResponse("Reaction not found", { status: 404 })
    }

    await prisma.messageReaction.delete({
      where: { id: reaction.id }
    })

    return new NextResponse("Reaction removed")
  } catch (error) {
    console.log(error, 'REMOVE_REACTION_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}
