import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params { params: Promise<{ statusId: string }> }

// POST /api/stories/[statusId]/view — record that current user viewed a story
export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })

  const { statusId } = await params

  try {
    const status = await prisma.status.findUnique({ where: { id: statusId } })
    if (!status) return new NextResponse('Not found', { status: 404 })

    // Don't record the author viewing their own story
    if (status.userId === session.user.id) {
      return NextResponse.json({ success: true })
    }

    // Only add if not already in viewedBy
    if (!status.viewedBy.includes(session.user.id)) {
      await prisma.status.update({
        where: { id: statusId },
        data: { viewedBy: { push: session.user.id } },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Story view error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
