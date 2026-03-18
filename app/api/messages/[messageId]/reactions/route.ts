import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params { params: Promise<{ messageId: string }> }

// POST — toggle reaction (add if not exists, remove if exists)
export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })
  const { messageId } = await params

  try {
    const { emoji } = await req.json()
    if (!emoji) return new NextResponse('Missing emoji', { status: 400 })

    const existing = await prisma.messageReaction.findFirst({
      where: { messageId, userId: session.user.id, emoji },
    })

    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } })
      return NextResponse.json({ action: 'removed', emoji })
    }

    const reaction = await prisma.messageReaction.create({
      data: { messageId, userId: session.user.id, emoji },
    })
    return NextResponse.json({ action: 'added', reaction })
  } catch (e) {
    console.error('Reaction error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

// GET — get all reactions for a message
export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })
  const { messageId } = await params

  try {
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, name: true, image: true } } },
    })
    return NextResponse.json(reactions)
  } catch (e) {
    console.error('Get reactions error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
