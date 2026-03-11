import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    console.log('Current user ID:', session.user.id)
    console.log('Current user email:', session.user.email)

    // Get all users first to debug
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isOnline: true,
        lastSeen: true
      }
    })

    console.log('All users in database:', allUsers.map(u => ({ id: u.id, email: u.email })))

    // Filter out current user
    const users = allUsers.filter(user => user.id !== session.user.id)
    
    console.log('Users after filtering current user:', users.map(u => ({ id: u.id, email: u.email })))

    // Sort by name
    users.sort((a, b) => {
      const nameA = (a.name || a.email).toLowerCase()
      const nameB = (b.name || b.email).toLowerCase()
      return nameA.localeCompare(nameB)
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('USERS_ERROR:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ error: 'Internal Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
