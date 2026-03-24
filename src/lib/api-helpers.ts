import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/types'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

export function success<T>(data: T, meta?: ApiResponse['meta']): NextResponse {
  return NextResponse.json({ success: true, data, meta })
}

export function error(code: string, message: string, status: number = 400): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

export async function getAuthUser() {
  if (DEMO_MODE) {
    // In demo mode, return the seeded demo user directly
    const user = await prisma.user.findUnique({
      where: { email: 'demo@emailflow.ai' },
    })
    if (user) return { id: user.id, email: user.email, name: user.name || 'Demo User' }
    return null
  }

  // Normal auth flow
  const { auth } = await import('@/lib/auth')
  const session = await auth()
  if (!session?.user?.id) return null
  return session.user as { id: string; email: string; name: string }
}
