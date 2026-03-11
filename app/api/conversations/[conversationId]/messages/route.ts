import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const params = await context.params
    const conversationId = params.conversationId

    console.log('Fetching messages for conversation:', conversationId)

    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversationId
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
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('MESSAGES_GET_ERROR:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ 
      error: 'Internal Error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const params = await context.params
    const conversationId = params.conversationId

    const body = await request.json()
    const { message, image } = body

    console.log('Creating message:', { 
      conversationId: conversationId, 
      senderId: session.user.id,
      messageContent: message 
    })

    const newMessage = await prisma.message.create({
      data: {
        content: message,
        image: image,
        conversationId: conversationId,
        senderId: session.user.id,
        seenBy: {
          create: {
            userId: session.user.id
          }
        }
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
        }
      }
    })

    await prisma.conversation.update({
      where: {
        id: conversationId
      },
      data: {
        updatedAt: new Date()
      }
    })

    console.log('Message created successfully:', newMessage.id)

    return NextResponse.json(newMessage)
  } catch (error) {
    console.error('MESSAGES_POST_ERROR:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json({ 
      error: 'Internal Error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
