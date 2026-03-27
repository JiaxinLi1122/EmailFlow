'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

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
    staleTime: 5 * 60 * 1000,
  })

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    queryClient.setQueryData(['auth-user'], null)
    router.push('/auth/signin')
  }, [queryClient, router])

  return {
    user: data || null,
    isLoading: status === 'pending',
    isAuthenticated: !!data,
    logout,
  }
}
