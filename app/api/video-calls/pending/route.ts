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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error('[GET /api/video-calls/pending] Error:', errorMessage, e)
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 })
  }
}
