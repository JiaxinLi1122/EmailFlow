import { prisma } from '@/lib/prisma'
import { getSessionToken, verifyToken } from '@/lib/auth-token'

export interface SessionUser {
  id: string
  email: string
  name: string
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const token = await getSessionToken()
    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true },
    })

    if (!user) return null
    return { id: user.id, email: user.email, name: user.name || 'User' }
  } catch {
    return null
  }
}
