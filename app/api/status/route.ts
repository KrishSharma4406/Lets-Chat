import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    const { isOnline } = body

    console.log('Updating user status:', { userId: session.user.id, isOnline })

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        isOnline,
        lastSeen: new Date(),
      },
    })

    console.log('User status updated successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('ONLINE_STATUS_ERROR:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json({ 
      error: 'Internal Error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
