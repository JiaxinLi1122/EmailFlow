'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { CACHE_TIME } from '@/lib/query-cache'
import { SessionExpiredWatcher, SESSION_401_EVENT } from '@/components/session-expired-watcher'
import { ErrorDialogWatcher } from '@/components/error-dialog'

// Install a global fetch interceptor once (browser only).
// Any /api/ route returning 401 dispatches SESSION_401_EVENT so the
// SessionExpiredWatcher can surface a toast — even for queryFns that
// don't throw on non-ok responses.
if (typeof window !== 'undefined' && !(window as Window & { __sessionInterceptorInstalled?: boolean }).__sessionInterceptorInstalled) {
  ;(window as Window & { __sessionInterceptorInstalled?: boolean }).__sessionInterceptorInstalled = true

  const _origFetch = window.fetch
  window.fetch = async function (...args) {
    const response = await _origFetch(...args)

    if (response.status === 401) {
      const input = args[0]
      let pathname = ''
      if (typeof input === 'string') {
        pathname = input.startsWith('http') ? new URL(input).pathname : input.split('?')[0]
      } else if (input instanceof URL) {
        pathname = input.pathname
      } else if (input instanceof Request) {
        pathname = new URL(input.url, window.location.origin).pathname
      }
      if (pathname.startsWith('/api/')) {
        window.dispatchEvent(new CustomEvent(SESSION_401_EVENT))
      }
    }

    return response
  }
}

export function QueryProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: CACHE_TIME.list,
            gcTime: 15 * 60 * 1000,
            retry: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SessionExpiredWatcher />
      <ErrorDialogWatcher />
      {children}
    </QueryClientProvider>
  )
}
