'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { isSessionFailureCode, readApiClientError } from '@/lib/api-client'

/**
 * Periodically rotates the session token in the background.
 *
 * Call this hook inside any authenticated layout component.
 * It calls POST /api/auth/refresh every ROTATION_INTERVAL_MS while
 * the page is visible, so the rotation happens silently without interrupting UX.
 *
 * If the server revokes the session (e.g., due to suspicious activity) the next
 * API call by the app will return 401 and the auth layer will redirect to sign-in.
 */
const ROTATION_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

export function useSessionRotation(enabled = true) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!enabled) return

    async function rotate() {
      try {
        const response = await fetch('/api/auth/refresh', { method: 'POST' })
        if (!response.ok) {
          const error = await readApiClientError(response)
          if (isSessionFailureCode(error.code)) {
            queryClient.clear()
            router.replace(`/auth/signin?reason=${encodeURIComponent(error.code || 'SESSION_EXPIRED')}`)
          }
        }
      } catch {
        // Network error — will retry on next interval
      }
    }

    timerRef.current = setInterval(rotate, ROTATION_INTERVAL_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [enabled, queryClient, router])
}
