import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-helpers'
import { sendPasswordResetEmail } from '@/lib/mailer'
import { hashResetToken, getTokenTtlMs, RATE_LIMIT_SECONDS } from '@/lib/password-reset'

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

    // Rate limit: reject if a token was issued within the last RATE_LIMIT_SECONDS
    const latest = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    if (latest) {
      const secondsSince = (Date.now() - latest.createdAt.getTime()) / 1000
      if (secondsSince < RATE_LIMIT_SECONDS) {
        const retryAfter = Math.ceil(RATE_LIMIT_SECONDS - secondsSince)
        return NextResponse.json(
          { success: false, error: `Please wait ${retryAfter} second(s) before requesting another reset email` },
          { status: 429 }
        )
      }
    }

    // Invalidate all active (unused, not yet expired) tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    })

    const plainToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashResetToken(plainToken)
    const expiresAt = new Date(Date.now() + getTokenTtlMs())

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    })

    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const resetLink = `${appUrl}/reset-password?token=${plainToken}`

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
