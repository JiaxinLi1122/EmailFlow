import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-helpers'
import { sendPasswordResetEmail } from '@/lib/mailer'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function POST() {
  try {
    const sessionUser = await getAuthUser()
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'This account uses OAuth sign-in and has no local password' },
        { status: 400 }
      )
    }

    // Invalidate any existing unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    })

    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const resetLink = `${appUrl}/reset-password?token=${token}`

    await sendPasswordResetEmail(user.email, resetLink)

    return NextResponse.json({
      success: true,
      data: { message: 'Password reset email sent. Check your inbox.' },
    })
  } catch (err) {
    console.error('[api/auth/request-password-reset]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to send reset email' },
      { status: 500 }
    )
  }
}
