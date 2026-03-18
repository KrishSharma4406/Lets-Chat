import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params { params: Promise<{ messageId: string }> }

// PATCH — edit message content
export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })
  const { messageId } = await params

  try {
    const { content } = await req.json()
    if (!content?.trim()) return new NextResponse('Missing content', { status: 400 })

    const msg = await prisma.message.findUnique({ where: { id: messageId } })
    if (!msg) return new NextResponse('Not found', { status: 404 })
    if (msg.senderId !== session.user.id) return new NextResponse('Forbidden', { status: 403 })

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content: content.trim(), isEdited: true, editedAt: new Date() },
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('Edit message error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

// DELETE — soft-delete message
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })
  const { messageId } = await params

  try {
    const msg = await prisma.message.findUnique({ where: { id: messageId } })
    if (!msg) return new NextResponse('Not found', { status: 404 })
    if (msg.senderId !== session.user.id) return new NextResponse('Forbidden', { status: 403 })

    await prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, deletedAt: new Date(), content: 'This message was deleted' },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Delete message error:', e)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
