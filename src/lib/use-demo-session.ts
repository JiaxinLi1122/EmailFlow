'use client'

import { useSession } from 'next-auth/react'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const demoSession = {
  data: {
    user: {
      id: 'demo',
      name: 'Demo User',
      email: 'demo@emailflow.ai',
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  status: 'authenticated' as const,
}

export function useDemoSession() {
  const session = useSession()

  if (DEMO_MODE) {
    return demoSession
  }

  return session
}
