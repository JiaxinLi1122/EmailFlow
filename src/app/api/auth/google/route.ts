import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-session'
import { getGoogleOAuthUrl } from '@/lib/google-oauth'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/signin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
  }

  const url = getGoogleOAuthUrl()
  return NextResponse.redirect(url)
}