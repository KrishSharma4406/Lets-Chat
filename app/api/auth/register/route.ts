import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { allUsers, addUser, findUserByEmail } from '@/lib/userStore'

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
    if (findUserByEmail(email)) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      passwordHash,
      image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      createdAt: new Date(),
    }

    addUser(newUser)

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
  } catch (error) {
    console.error('[Register] Error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
