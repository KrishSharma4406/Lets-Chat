import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/users/block
 * Block a user
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { blockedUserId } = await request.json()

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!blockedUserId) {
      return new NextResponse("User ID is required", { status: 400 })
    }

    if (blockedUserId === session.user.id) {
      return new NextResponse("Cannot block yourself", { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: blockedUserId }
    })

    if (!user) {
      return new NextResponse("User not found", { status: 404 })
    }

    // Check if already blocked
    const existing = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: blockedUserId
        }
      }
    })

    if (existing) {
      return new NextResponse("User already blocked", { status: 400 })
    }

    const blocked = await prisma.blockedUser.create({
      data: {
        blockerId: session.user.id,
        blockedId: blockedUserId
      }
    })

    return NextResponse.json({ message: "User blocked successfully", blocked }, { status: 201 })
  } catch (error) {
    console.log(error, 'BLOCK_USER_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}

/**
 * GET /api/users/blocked
 * Get list of blocked users
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const blockedUsers = await prisma.blockedUser.findMany({
      where: { blockerId: session.user.id },
      include: {
        blocked: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true
          }
        }
      }
    })

    return NextResponse.json(blockedUsers)
  } catch (error) {
    console.log(error, 'GET_BLOCKED_USERS_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}
