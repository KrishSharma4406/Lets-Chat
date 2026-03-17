import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, password } = body

    console.log('[REGISTER] Received:', { email, name, passwordLength: password?.length })

    if (!email || !name || !password) {
      console.log('[REGISTER] Missing fields')
      return new NextResponse("Missing info", { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log('[REGISTER] Email already exists:', email)
      return new NextResponse("Email already exists", { status: 400 })
    }

    console.log('[REGISTER] Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 12)

    console.log('[REGISTER] Creating user in database...')
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword
      }
    })

    console.log('[REGISTER] User created successfully:', { id: user.id, email: user.email })
    return NextResponse.json(user)
  } catch (error) {
    console.error('[REGISTER] Error:', error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
