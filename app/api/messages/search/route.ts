import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/messages/search?q=hello
export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })

    const url = new URL(req.url)
    const q = url.searchParams.get('q')?.trim()
    if (!q) return NextResponse.json([])

    try {
        const messages = await prisma.message.findMany({
            where: {
                content: { contains: q, mode: 'insensitive' },
                isDeleted: false,
                conversation: {
                    participants: { some: { userId: session.user.id } },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                sender: { select: { id: true, name: true, email: true } },
                conversation: { select: { id: true, name: true, isGroup: true } },
            },
        })
        return NextResponse.json(messages)
    } catch (e) {
        console.error('Search error:', e)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
