import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/stories — fetch all active stories of contacts
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })

  try {
    const now = new Date()

    // Get IDs of people the user is connected with
    const participations = await prisma.conversationParticipant.findMany({
      where: { userId: session.user.id },
      select: { conversationId: true },
    })
    const convIds = participations.map((p) => p.conversationId)

    const contactIds = await prisma.conversationParticipant.findMany({
      where: {
        conversationId: { in: convIds },
        userId: { not: session.user.id },
      },
      select: { userId: true },
      distinct: ['userId'],
    })

    const contactUserIds = [
      session.user.id,
      ...contactIds.map((c) => c.userId),
    ]

    const statuses = await prisma.status.findMany({
      where: {
        userId: { in: contactUserIds },
        expiresAt: { gt: now },
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(statuses)
  } catch (e) {
    console.error('Stories GET error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

// POST /api/stories — create a new story (expires in 24h)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })

  try {
    const { content, mediaUrl, mediaType, caption } = await req.json()

    if (!content && !mediaUrl) {
      return new NextResponse('content or mediaUrl required', { status: 400 })
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const status = await prisma.status.create({
      data: {
        userId: session.user.id,
        content,
        mediaUrl,
        mediaType: mediaType || 'text',
        caption,
        expiresAt,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    })

    return NextResponse.json(status)
  } catch (e) {
    console.error('Stories POST error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
