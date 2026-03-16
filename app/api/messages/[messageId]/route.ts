import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * PATCH /api/messages/[messageId]
 * Edit or delete a message
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params
    const session = await getServerSession(authOptions)
    const { content, action } = await request.json()

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    })

    if (!message) {
      return new NextResponse("Message not found", { status: 404 })
    }

    // Only sender can edit/delete
    if (message.senderId !== session.user.id) {
      return new NextResponse("Only the sender can modify this message", { status: 403 })
    }

    if (action === "delete") {
      const updated = await prisma.message.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          content: "[This message was deleted]"
        },
        include: {
          sender: {
            select: { id: true, name: true, email: true }
          },
          seenBy: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          },
          reactions: {
            include: {
              user: {
                select: { id: true, name: true, image: true }
              }
            }
          }
        }
      })

      return NextResponse.json(updated)
    } else if (action === "edit" && content) {
      const updated = await prisma.message.update({
        where: { id: messageId },
        data: {
          content,
          isEdited: true,
          editedAt: new Date()
        },
        include: {
          sender: {
            select: { id: true, name: true, email: true }
          },
          seenBy: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          },
          reactions: {
            include: {
              user: {
                select: { id: true, name: true, image: true }
              }
            }
          }
        }
      })

      return NextResponse.json(updated)
    } else {
      return new NextResponse("Invalid action or missing content", { status: 400 })
    }
  } catch (error) {
    console.log(error, 'MESSAGE_EDIT_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}

/**
 * GET /api/messages/[messageId]
 * Get a specific message
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

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: { id: true, name: true, email: true, image: true }
        },
        seenBy: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: { id: true, name: true, image: true }
            }
          }
        }
      }
    })

    if (!message) {
      return new NextResponse("Message not found", { status: 404 })
    }

    // Check if user is part of conversation
    const isParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: session.user.id,
          conversationId: message.conversationId
        }
      }
    })

    if (!isParticipant) {
      return new NextResponse("Not authorized to view this message", { status: 403 })
    }

    return NextResponse.json(message)
  } catch (error) {
    console.log(error, 'GET_MESSAGE_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}
