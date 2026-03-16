import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateKeyPair, getSharedSecret } from "@/lib/encryption"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get or generate keypair for current user
    let keyPair = await prisma.userKeyPair.findUnique({
      where: { userId: session.user.id },
      select: { publicKey: true }
    })

    if (!keyPair) {
      // Generate new keypair
      const newKeyPair = generateKeyPair()
      keyPair = await prisma.userKeyPair.create({
        data: {
          userId: session.user.id,
          publicKey: newKeyPair.publicKey,
          privateKey: newKeyPair.privateKey
        },
        select: { publicKey: true }
      })
    }

    return NextResponse.json(keyPair)
  } catch (error) {
    console.log(error, 'KEY_PAIR_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}

/**
 * GET /api/encryption/public-key/:userId
 * Get another user's public key
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { userId } = await request.json()

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 })
    }

    // Check if user is blocked
    const isBlocked = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: userId
        }
      }
    })

    if (isBlocked) {
      return new NextResponse("User is blocked", { status: 403 })
    }

    const userKeyPair = await prisma.userKeyPair.findUnique({
      where: { userId },
      select: { publicKey: true }
    })

    if (!userKeyPair) {
      return new NextResponse("Public key not found", { status: 404 })
    }

    return NextResponse.json(userKeyPair)
  } catch (error) {
    console.log(error, 'GET_PUBLIC_KEY_ERROR')
    return new NextResponse("Internal Error", { status: 500 })
  }
}
