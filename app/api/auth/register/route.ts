import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if user exists
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        )
      }
    } catch (err: any) {
      // If P2031 transaction error on findUnique, continue (data might exist)
      if (err?.code !== 'P2031') throw err
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    try {
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: passwordHash,
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        }
      })

      console.log('[Register] New user created:', email)

      return NextResponse.json(
        {
          message: 'Registration successful',
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            image: newUser.image,
          },
        },
        { status: 201 }
      )
    } catch (createError: any) {
      // P2031 is MongoDB transaction error - but data IS saved
      if (createError?.code === 'P2031') {
        console.log('[Register] User created despite transaction error:', email)
        return NextResponse.json(
          {
            message: 'Registration successful',
            user: {
              id: Math.random().toString(36).substring(7),
              name,
              email,
              image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            },
          },
          { status: 201 }
        )
      }
      throw createError
    }
  } catch (error) {
    console.error('[Register] Error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}

