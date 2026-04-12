'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { CACHE_TIME } from '@/lib/query-cache'

interface User {
  id: string
  email: string
  name: string
}

export function useAuth() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, status } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async (): Promise<User | null> => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) return null
      const json = await res.json()
      return json.user || null
    },
    retry: false,
    staleTime: CACHE_TIME.auth,
  })

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    // Remove the cached user immediately so any mounted layout/page that checks
    // isAuthenticated sees null right away, rather than keeping the old user
    // object around as stale data.
    queryClient.removeQueries({ queryKey: ['auth-user'] })
    router.push('/auth/signin')
  }, [queryClient, router])

  return {
    user: data || null,
    isLoading: status === 'pending',
    isAuthenticated: !!data,
    logout,
  }
}
