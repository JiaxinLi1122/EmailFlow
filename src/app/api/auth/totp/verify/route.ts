import { NextResponse } from 'next/server'
import { verify } from 'otplib'

export async function POST(req: Request) {
  try {
    const { token, secret } = await req.json()

    if (!token || !secret) {
      return NextResponse.json(
        { success: false, error: 'Token and secret are required' },
        { status: 400 }
      )
    }

    const result = await verify({
      token,
      secret,
    })

    return NextResponse.json({
      success: true,
      data: {
        isValid: result.valid,
      },
    })
  } catch (err) {
    console.error('[api/auth/totp/verify]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to verify code' },
      { status: 500 }
    )
  }
}