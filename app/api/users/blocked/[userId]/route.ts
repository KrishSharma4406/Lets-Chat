import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * DELETE /api/users/blocked/[userId]
 * Unblock a user
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const blocked = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: userId
        }
      }
    })

    if (!blocked) {
      return new NextResponse("User not blocked", { status: 404 })
    }

    await prisma.blockedUser.delete({
      where: { id: blocked.id }
    })

    return new NextResponse("User unblocked successfully")
  } catch (error) {
    console.log(error, 'UNBLOCK_USER_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}
