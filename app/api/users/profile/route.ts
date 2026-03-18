import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/users/profile — update current user's display name
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const { name } = await req.json()
        if (!name?.trim()) return new NextResponse('Name required', { status: 400 })

        const updated = await prisma.user.update({
            where: { id: session.user.id },
            data: { name: name.trim() },
            select: { id: true, name: true, email: true, image: true },
        })
        return NextResponse.json(updated)
    } catch (e) {
        console.error('Profile update error:', e)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
