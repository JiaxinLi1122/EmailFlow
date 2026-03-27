import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth-password'
import { createToken, setSessionCookie } from '@/lib/auth-token'

export async function POST(req: Request) {
  try {
    const { email, password, totpCode } = await req.json()

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
    // 2FA
    if (user.totpEnabled) {
      if (!totpCode) {
        return NextResponse.json(
          { success: false, error: 'Authenticator code required' },
          { status: 401 }
        )
      }

      const OTPAuth = await import('otplib')

      const result = await OTPAuth.verify({
        token: totpCode,
        secret: user.totpSecret!,
      })

      if (!result.valid) {
        return NextResponse.json(
          { success: false, error: 'Invalid authenticator code' },
          { status: 401 }
        )
      }
    }

    const token = createToken({ userId: user.id, email: user.email })
    await setSessionCookie(token)

    return NextResponse.json({
      success: true,
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
