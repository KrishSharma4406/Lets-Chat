import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { allUsers } from '@/lib/userStore'

// PATCH /api/users/profile — update current user's display name or image
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })

    try {
        const { name, image } = await req.json()
        
        if (!name?.trim() && !image) {
            return new NextResponse('Nothing to update', { status: 400 })
        }

        // Try updating in memory store first (since you are using userStore.ts for auth)
        const memoryUser = allUsers.find(u => u.email === session.user?.email)
        if (memoryUser) {
            if (name?.trim()) memoryUser.name = name.trim()
            if (image) memoryUser.image = image
        }

        try {
            // Check if we can reach the database
            const dbUser = await prisma.user.findUnique({
                where: { email: session.user.email }
            })

            // If user exists in DB, update them
            if (dbUser) {
                const dataToUpdate: any = {}
                if (name?.trim()) dataToUpdate.name = name.trim()
                if (image) dataToUpdate.image = image

                const updated = await prisma.user.update({
                    where: { email: session.user.email },
                    data: dataToUpdate,
                    select: { id: true, name: true, email: true, image: true },
                })
                return NextResponse.json(updated)
            }
            
            // If user not in DB (demo account) but in memory store, return success
            if (memoryUser) {
                return NextResponse.json(memoryUser)
            }
            
            return new NextResponse('User not found', { status: 404 })
        } catch (dbError) {
            console.warn('DB update failed, using memory store:', dbError)
            // If DB fails (like if Mongo is completely offline) but we have a memory user, return success
            if (memoryUser) {
                return NextResponse.json(memoryUser)
            }
            throw dbError
        }
    } catch (e) {
        console.error('Profile update error:', e)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
