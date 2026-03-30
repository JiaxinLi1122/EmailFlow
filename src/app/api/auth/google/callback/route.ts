import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-session'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.redirect(new URL('/auth/signin', APP_URL))
    }

    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard?gmail_error=${encodeURIComponent(error)}`, APP_URL)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard?gmail_error=missing_code', APP_URL)
      )
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      return NextResponse.redirect(
        new URL('/dashboard?gmail_error=missing_google_env', APP_URL)
      )
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok) {
      console.error('[google callback] token exchange failed:', tokenData)
      return NextResponse.redirect(
        new URL('/dashboard?gmail_error=token_exchange_failed', APP_URL)
      )
    }

    const accessToken = tokenData.access_token as string | undefined
    const refreshToken = tokenData.refresh_token as string | undefined
    const expiresIn = tokenData.expires_in as number | undefined

    if (!accessToken) {
      return NextResponse.redirect(
        new URL('/dashboard?gmail_error=missing_access_token', APP_URL)
      )
    }

    const expiryDate =
      typeof expiresIn === 'number'
        ? new Date(Date.now() + expiresIn * 1000)
        : null

    const updateData: {
      gmailAccessToken: string
      gmailConnected: boolean
      gmailTokenExpiry?: Date | null
      gmailRefreshToken?: string
    } = {
      gmailAccessToken: accessToken,
      gmailConnected: true,
      gmailTokenExpiry: expiryDate,
    }

    if (refreshToken) {
      updateData.gmailRefreshToken = refreshToken
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    })

    return NextResponse.redirect(
      new URL('/dashboard?gmail_connected=1', APP_URL)
    )
  } catch (err) {
    console.error('[google callback]', err)
    return NextResponse.redirect(
      new URL('/dashboard?gmail_error=server_error', APP_URL)
    )
  }
}