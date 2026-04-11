import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params { params: Promise<{ conversationId: string }> }

// GET paginated messages
export async function GET(req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      console.warn('[GET /messages] No session found')
      console.warn('[GET /messages] Cookies:', req.headers.get('cookie')?.substring(0, 100))
      return NextResponse.json({ error: 'Session not found' }, { status: 401 })
    }
    
    if (!session?.user?.id) {
      console.warn('[GET /messages] Unauthorized - no user id in session')
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 })
    }
    
    const { conversationId } = await params
    console.log('[GET /messages] Fetching for conversation:', conversationId, 'user:', session.user.id)

    const url = new URL(req.url)
    const limit = Math.min(Number(url.searchParams.get('limit') || 30), 50)
    const cursor = url.searchParams.get('cursor') || undefined

    const messages = await prisma.message.findMany({
      where: { conversationId, isDeleted: false },
      orderBy: { createdAt: 'asc' },
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
    console.log('[GET /messages] Returning', messages.length, 'messages')
    return NextResponse.json(messages)
  } catch (e) {
    console.error('[GET /messages] Error:', e instanceof Error ? e.message : String(e))
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
