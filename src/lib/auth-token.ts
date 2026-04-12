import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const COOKIE_NAME = 'ef-session'
const MAX_AGE_REMEMBER = 30 * 24 * 60 * 60 // 30 days in seconds
const MAX_AGE_SESSION = 24 * 60 * 60        //  1 day  in seconds

export interface TokenPayload {
  userId: string
  email: string
  purpose?: 'pre-2fa'
}

export function createToken(payload: TokenPayload, remember = false): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: remember ? MAX_AGE_REMEMBER : MAX_AGE_SESSION,
  })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string, remember = false) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    ...(remember ? { maxAge: MAX_AGE_REMEMBER } : {}),
    path: '/',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value || null
}