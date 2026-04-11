import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword } from '@/lib/auth-password'
import { getAuthUser } from '@/lib/api-helpers'

export async function POST(req: Request) {
  try {
    const sessionUser = await getAuthUser()
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json()

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'currentPassword, newPassword, and confirmPassword are required' },
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

    const currentValid = await verifyPassword(currentPassword, user.passwordHash)
    if (!currentValid) {
      return NextResponse.json(
        { success: false, error: 'currentPassword is incorrect' },
        { status: 401 }
      )
    }

    const sameAsOld = await verifyPassword(newPassword, user.passwordHash)
    if (sameAsOld) {
      return NextResponse.json(
        { success: false, error: 'newPassword must differ from the current password' },
        { status: 400 }
      )
    }

    const newHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    })

    return NextResponse.json({ success: true, data: { message: 'Password changed successfully' } })
  } catch (err) {
    console.error('[api/auth/change-password]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to change password' },
      { status: 500 }
    )
  }
}
