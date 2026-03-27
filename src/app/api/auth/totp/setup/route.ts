import { NextResponse } from 'next/server'
import * as OTPAuth from 'otplib'
import QRCode from 'qrcode'

export async function POST() {
  try {
    const secret = OTPAuth.authenticator.generateSecret()

    const otpauth = OTPAuth.authenticator.keyuri(
      'demo@emailflow.ai',
      'EmailFlow AI',
      secret
    )

    const qrCodeDataUrl = await QRCode.toDataURL(otpauth)

    return NextResponse.json({
      success: true,
      data: {
        secret,
        qrCodeDataUrl,
      },
    })
  } catch (err) {
    console.error('[api/auth/totp/setup]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to generate QR code' },
      { status: 500 }
    )
  }
}