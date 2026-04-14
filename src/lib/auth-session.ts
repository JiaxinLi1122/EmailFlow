import { getSessionToken } from '@/lib/auth-token'
import {
  requireSessionToken,
  type SessionContext,
  type SessionUser,
  validateSessionToken,
} from '@/lib/auth-sessions'

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const token = await getSessionToken()
    const context = await validateSessionToken(token)
    return context?.user || null
  } catch {
    return null
  }
}

export async function getCurrentSessionContext(): Promise<SessionContext | null> {
  try {
    const token = await getSessionToken()
    return await validateSessionToken(token)
  } catch {
    return null
  }
}

export async function requireCurrentSessionContext(): Promise<SessionContext> {
  const token = await getSessionToken()
  return requireSessionToken(token)
}

export async function requireCurrentUser(): Promise<SessionUser> {
  const context = await requireCurrentSessionContext()
  return context.user
}
