import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/video-calls/pending
 * Fetch pending/active calls for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const pendingCalls = await prisma.videoCall.findMany({
      where: {
        recipientId: session.user.id,
        status: { in: ['pending', 'ringing'] },
      },
      include: {
        caller: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json(pendingCalls)
  } catch (e) {
    console.error('[GET /api/video-calls/pending] Error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
