import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/messages
 * Creates a new message in a conversation
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    const { conversationId, content, encryptedContent, encryptedKey, nonce, messageType = "text", image, fileName, fileType } = body

    if (!conversationId || !content) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Verify user is part of the conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId: session.user.id,
        conversationId
      }
    })

    if (!participant) {
      return new NextResponse("Access denied", { status: 403 })
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        encryptedContent: encryptedContent || null,
        encryptedKey: encryptedKey || null,
        nonce: nonce || null,
        messageType,
        image: image || null,
        fileName: fileName || null,
        fileType: fileType || null,
        conversationId,
        senderId: session.user.id
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        seenBy: true,
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('[MESSAGES] POST Error:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

/**
 * GET /api/messages
 * Fetches messages from a conversation with pagination
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const url = new URL(request.url)
    const conversationId = url.searchParams.get("conversationId")
    const page = parseInt(url.searchParams.get("page") || "0")
    const limit = parseInt(url.searchParams.get("limit") || "50")

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!conversationId) {
      return new NextResponse("Missing conversationId", { status: 400 })
    }

    // Verify user is part of conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId: session.user.id,
        conversationId
      }
    })

    if (!participant) {
      return new NextResponse("Access denied", { status: 403 })
    }

    // Fetch messages with pagination
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        isDeleted: false
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        seenBy: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: page * limit,
      take: limit
    })

    const total = await prisma.message.count({
      where: {
        conversationId,
        isDeleted: false
      }
    })

    return NextResponse.json({
      messages: messages.reverse(),
      total,
      page,
      limit,
      hasMore: (page + 1) * limit < total
    })
  } catch (error) {
    console.error('[MESSAGES] GET Error:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
