import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-session'
import { createUserSession } from '@/lib/auth-sessions'
import { setSessionCookie } from '@/lib/auth-token'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(req: NextRequest) {
  try {
    const [user, searchParams] = [await getCurrentUser(), req.nextUrl.searchParams]
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // On early errors, redirect authenticated users to dashboard and others to signup
    const errorBase = user ? '/dashboard' : '/auth/signup'

    if (error) {
      return NextResponse.redirect(
        new URL(`${errorBase}?gmail_error=${encodeURIComponent(error)}`, APP_URL)
      )
    }

    if (!code) {
      return NextResponse.redirect(new URL(`${errorBase}?gmail_error=missing_code`, APP_URL))
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      return NextResponse.redirect(new URL(`${errorBase}?gmail_error=missing_google_env`, APP_URL))
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
      return NextResponse.redirect(new URL(`${errorBase}?gmail_error=token_exchange_failed`, APP_URL))
    }

    const accessToken = tokenData.access_token as string | undefined
    const refreshToken = tokenData.refresh_token as string | undefined
    const expiresIn = tokenData.expires_in as number | undefined

    if (!accessToken) {
      return NextResponse.redirect(new URL(`${errorBase}?gmail_error=missing_access_token`, APP_URL))
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const profileData = await profileRes.json()

    if (!profileRes.ok) {
      console.error('[google callback] failed to fetch user info:', profileData)
      return NextResponse.redirect(new URL(`${errorBase}?gmail_error=userinfo_failed`, APP_URL))
    }

    const gmailEmail = profileData.email as string | undefined
    const expiryDate = typeof expiresIn === 'number' ? new Date(Date.now() + expiresIn * 1000) : null

    const gmailFields = {
      gmailAccessToken: accessToken,
      gmailConnected: true,
      syncEnabled: true,
      gmailTokenExpiry: expiryDate,
      emailProviderReauthRequired: false,
      emailProviderReauthReason: null,
      emailProviderReauthAt: null,
      emailProviderReauthProvider: 'gmail' as const,
      ...(gmailEmail ? { gmailEmail } : {}),
      ...(refreshToken ? { gmailRefreshToken: refreshToken } : {}),
    }

    if (user) {
      // Already logged in: connect Gmail to the existing account
      await prisma.user.update({ where: { id: user.id }, data: gmailFields })
      return NextResponse.redirect(new URL('/dashboard?gmail_connected=1', APP_URL))
    }

    // Not logged in: sign up or sign in via Google
    if (!gmailEmail) {
      return NextResponse.redirect(new URL('/auth/signup?gmail_error=no_email', APP_URL))
    }

    // Find existing account by connected Gmail address or by matching email
    let targetUser = await prisma.user.findFirst({
      where: { OR: [{ gmailEmail }, { email: gmailEmail }] },
      select: { id: true },
    })

    if (!targetUser) {
      targetUser = await prisma.user.create({
        data: {
          email: gmailEmail,
          name: (profileData.name as string | undefined) || gmailEmail.split('@')[0],
          ...gmailFields,
        },
        select: { id: true },
      })
    } else {
      await prisma.user.update({ where: { id: targetUser.id }, data: gmailFields })
    }

    const { rawToken } = await createUserSession({
      userId: targetUser.id,
      request: req,
      sendNewDeviceAlert: false,
    })
    await setSessionCookie(rawToken)

    return NextResponse.redirect(new URL('/dashboard?gmail_connected=1', APP_URL))
  } catch (err) {
    console.error('[google callback]', err)
    return NextResponse.redirect(new URL('/auth/signup?gmail_error=server_error', APP_URL))
  }
}
