import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId, secret } = await req.json()

    if (!userId || !secret) {
      return NextResponse.json(
        { success: false, error: 'Missing data' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabled: true,
        totpSecret: secret,
      },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (err) {
    console.error('[api/auth/totp/enable]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to enable 2FA' },
      { status: 500 }
    )
  }
}