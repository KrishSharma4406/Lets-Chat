import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params { params: Promise<{ conversationId: string }> }

// GET paginated messages
export async function GET(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })
  const { conversationId } = await params

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || 30), 50)
  const cursor = url.searchParams.get('cursor') || undefined

  try {
    const messages = await prisma.message.findMany({
      where: { conversationId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        sender: { select: { id: true, name: true, email: true, image: true } },
        seenBy: { select: { userId: true, seenAt: true } },
        reactions: {
          include: { user: { select: { id: true, name: true, image: true } } }
        },
      },
    })
    return NextResponse.json(messages)
  } catch (e) {
    console.error('GET messages error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

// POST new message
export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })
  const { conversationId } = await params

  try {
    const body = await req.json()
    const { message, image, fileName, fileType, replyToId } = body

    if (!message?.trim() && !image) {
      return new NextResponse('Missing content', { status: 400 })
    }

    const msg = await prisma.message.create({
      data: {
        content: message?.trim() || '',
        image: image || null,
        fileName: fileName || null,
        fileType: fileType || null,
        senderId: session.user.id,
        conversationId,
        ...(replyToId ? { replyToId } : {}),
      },
      include: {
        sender: { select: { id: true, name: true, email: true, image: true } },
        seenBy: { select: { userId: true, seenAt: true } },
        reactions: {
          include: { user: { select: { id: true, name: true, image: true } } }
        },
      },
    })

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    // Increment unreadCount for all other participants
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId: { not: session.user.id }
      },
      data: {
        unreadCount: { increment: 1 }
      }
    })

    return NextResponse.json(msg)
  } catch (e) {
    console.error('POST message error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
