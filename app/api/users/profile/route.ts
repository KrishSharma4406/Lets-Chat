/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/users/profile — update current user's display name or image
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const { name, image } = await req.json()
        
        if (!name?.trim() && !image) {
            return new NextResponse('Nothing to update', { status: 400 })
        }

        try {
            // Update database user directly
            const dataToUpdate: any = {}
            if (name?.trim()) dataToUpdate.name = name.trim()
            if (image) dataToUpdate.image = image

            const updated = await prisma.user.update({
                where: { email: session.user.email },
                data: dataToUpdate,
                select: { id: true, name: true, email: true, image: true },
            })
            return NextResponse.json(updated)
            
        } catch (dbError) {
            console.error('DB update failed:', dbError)
            return new NextResponse('User not found in database', { status: 404 })
        }
    } catch (e) {
        console.error('Profile update error:', e)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
