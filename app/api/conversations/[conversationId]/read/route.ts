import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params { params: Promise<{ conversationId: string }> }

// POST — mark all messages in conversation as read
export async function POST(_req: Request, { params }: Params) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })
    const { conversationId } = await params

    try {
        // Find messages not yet seen by this user
        const unseenMessages = await prisma.message.findMany({
            where: {
                conversationId,
                senderId: { not: session.user.id },
                seenBy: { none: { userId: session.user.id } },
                isDeleted: false,
            },
            select: { id: true },
        })

        if (unseenMessages.length > 0) {
            await prisma.seenMessage.createMany({
                data: unseenMessages.map((m) => ({
                    messageId: m.id,
                    userId: session.user.id,
                })),
            })
        }

        // Reset unreadCount for this participant
        await prisma.conversationParticipant.updateMany({
            where: {
                conversationId,
                userId: session.user.id
            },
            data: {
                unreadCount: 0
            }
        })

        return NextResponse.json({ marked: unseenMessages.length })
    } catch (e) {
        console.error('Mark read error:', e)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
