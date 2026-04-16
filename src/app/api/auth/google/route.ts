import { NextResponse } from 'next/server'
import { getGoogleOAuthUrl } from '@/lib/google-oauth'

export async function GET() {
  const url = getGoogleOAuthUrl()
  return NextResponse.redirect(url)
}