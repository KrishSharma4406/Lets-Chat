import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    console.log('[Conversations GET]', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    })

    if (!session?.user?.id) {
      console.log('[Conversations GET] No user ID in session')
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const userId = session.user.id
    console.log('[Conversations GET] Fetching for userId:', userId)

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                isOnline: true,
                lastSeen: true,
              }
            }
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
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
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    console.log('[Conversations GET] Found conversations:', conversations.length)
    return NextResponse.json(conversations)
  } catch (error) {
    console.error('[Conversations GET Error]', error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const { userId, isGroup, members, name } = body

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (isGroup && (!members || members.length < 2 || !name)) {
      return new NextResponse("Invalid data", { status: 400 })
    }

    if (isGroup) {
      const newConversation = await prisma.conversation.create({
        data: {
          name,
          isGroup,
          participants: {
            create: [
              ...members.map((memberId: string) => ({
                userId: memberId
              })),
              {
                userId: session.user.id
              }
            ]
          }
        },
        include: {
          participants: {
            include: {
              user: true
            }
          }
        }
      })

      return NextResponse.json(newConversation)
    }

    const existingConversations = await prisma.conversation.findFirst({
      where: {
        AND: [
          { isGroup: false },
          {
            participants: {
              some: {
                userId: session.user.id
              }
            }
          },
          {
            participants: {
              some: {
                userId: userId
              }
            }
          }
        ]
      }
    })

    if (existingConversations) {
      return NextResponse.json(existingConversations)
    }

    const newConversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            {
              userId: session.user.id
            },
            {
              userId: userId
            }
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: true
          }
        }
      }
    })

    return NextResponse.json(newConversation)
  } catch (error) {
    console.log(error, 'CREATE_CONVERSATION_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}
