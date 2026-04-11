import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/auth-password'

export async function POST(req: Request) {
  try {
    const { token, newPassword, confirmPassword } = await req.json()

    if (!token || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'token, newPassword, and confirmPassword are required' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'newPassword and confirmPassword do not match' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'newPassword must be at least 8 characters' },
        { status: 400 }
      )
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    if (record.usedAt) {
      return NextResponse.json(
        { success: false, error: 'This reset link has already been used' },
        { status: 400 }
      )
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This reset link has expired' },
        { status: 400 }
      )
    }

    const user = record.user
    if (user.passwordHash) {
      const sameAsOld = await verifyPassword(newPassword, user.passwordHash)
      if (sameAsOld) {
        return NextResponse.json(
          { success: false, error: 'newPassword must differ from the current password' },
          { status: 400 }
        )
      }
    }

    const newHash = await hashPassword(newPassword)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { message: 'Password has been reset successfully. You can now sign in.' },
    })
  } catch (err) {
    console.error('[api/auth/reset-password]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
