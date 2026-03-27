import { NextResponse } from 'next/server'
import { generateSecret, generateURI } from 'otplib'
import QRCode from 'qrcode'

export async function POST() {
  try {
    const secret = generateSecret()

    const uri = generateURI({
      issuer: 'EmailFlow AI',
      label: 'demo@emailflow.ai',
      secret,
    })

    const qrCodeDataUrl = await QRCode.toDataURL(uri)

    console.log('SECRET:', secret)

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