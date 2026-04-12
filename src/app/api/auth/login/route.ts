import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth-password'
import { createToken, setSessionCookie } from '@/lib/auth-token'

export async function POST(req: Request) {
  try {
    const { email, password, rememberMe } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const valid = await verifyPassword(password, user.passwordHash)

    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (user.totpEnabled) {
      const tempToken = createToken({
        userId: user.id,
        email: user.email,
        purpose: 'pre-2fa',
      })

      return NextResponse.json({
        success: true,
        requiresTwoFactor: true,
        tempToken,
      })
    }

    const token = createToken(
      { userId: user.id, email: user.email },
      !!rememberMe,
    )

    await setSessionCookie(token, !!rememberMe)

    return NextResponse.json({
      success: true,
      requiresTwoFactor: false,
      data: { id: user.id, email: user.email, name: user.name },
    })
  } catch (err) {
    console.error('[api/auth/login]', err)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}
