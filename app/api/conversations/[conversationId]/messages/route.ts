import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: params.conversationId
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
    console.log(error, 'MESSAGES_GET_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const { message, image } = body

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const newMessage = await prisma.message.create({
      data: {
        content: message,
        image: image,
        conversationId: params.conversationId,
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
        id: params.conversationId
      },
      data: {
        updatedAt: new Date()
      }
    })

    return NextResponse.json(newMessage)
  } catch (error) {
    console.log(error, 'MESSAGES_POST_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}
