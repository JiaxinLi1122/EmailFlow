'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/use-auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RefreshCw, User, LogOut, ChevronRight } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { BatchClassificationReviewDialog } from '@/components/batch-classification-review-dialog'
import type { BatchClassificationReviewPayload } from '@/services/email-sync-service'
import { isWorkspaceQueryKey } from '@/lib/query-cache'

export function Header() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const router = useRouter()
  const [reviewPayload, setReviewPayload] = useState<BatchClassificationReviewPayload | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  const segments = pathname.split('/').filter(Boolean)
  const currentSection = segments[1] ? segments[1].replace(/-/g, ' ') : 'dashboard'
  const sectionLabel = currentSection.charAt(0).toUpperCase() + currentSection.slice(1)

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Sync failed')
      }

      return data
    },

    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        predicate: (query) => isWorkspaceQueryKey(query.queryKey),
      })
      await queryClient.refetchQueries({
        predicate: (query) => isWorkspaceQueryKey(query.queryKey),
        type: 'active',
      })
      router.refresh()
      const syncData = data?.data as {
        syncedCount: number
        skippedCount: number
        failedCount: number
        retriedSuccessCount: number
        retriedFailedCount: number
        pendingFailedCount: number
        review?: BatchClassificationReviewPayload | null
      } | undefined
      const review = (syncData?.review ?? null) as BatchClassificationReviewPayload | null

      if (review && review.items.length > 0) {
        setReviewPayload(review)
        setReviewOpen(true)
      }

      const synced = syncData?.syncedCount ?? 0
      const skipped = syncData?.skippedCount ?? 0
      const failed = syncData?.failedCount ?? 0
      const retriedSuccess = syncData?.retriedSuccessCount ?? 0
      const retriedFailed = syncData?.retriedFailedCount ?? 0
      const pendingFailed = syncData?.pendingFailedCount ?? 0

      // Build the primary line
      const primaryParts = [`Synced ${synced} emails`]
      if (skipped > 0) primaryParts.push(`${skipped} skipped`)
      if (failed > 0) primaryParts.push(`${failed} failed`)
      const primaryMessage = primaryParts.join(', ')

      // Build optional retry context lines
      const retryLines: string[] = []
      if (retriedSuccess > 0) retryLines.push(`Recovered ${retriedSuccess} previously failed email${retriedSuccess === 1 ? '' : 's'}`)
      if (pendingFailed > 0) retryLines.push(`${pendingFailed} failed email${pendingFailed === 1 ? '' : 's'} still pending retry`)
      if (retriedFailed > 0 && pendingFailed === 0) retryLines.push(`${retriedFailed} email${retriedFailed === 1 ? '' : 's'} could not be recovered`)

      const fullMessage = [primaryMessage, ...retryLines].join(' · ')

      if (review && review.items.length > 0) {
        toast.success(`${fullMessage} · review new project guesses`)
      } else {
        toast.success(fullMessage)
      }
    },

    onError: (err) => {
      console.error('Sync failed:', err)
      toast.error('Sync failed')
      // Refetch stats even on failure — lastSyncAt may have been written before
      // the error occurred, so the UI should reflect the current DB state.
      queryClient.invalidateQueries({
        predicate: (query) => isWorkspaceQueryKey(query.queryKey),
      })
      queryClient.refetchQueries({
        predicate: (query) => isWorkspaceQueryKey(query.queryKey),
        type: 'active',
      })
    },
  })

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200/80 bg-white/85 px-6 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-900">Workspace</span>
          <ChevronRight className="h-4 w-4 text-gray-300" />
          <span className="truncate">{sectionLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            title={syncMutation.isPending ? 'Syncing...' : 'Sync emails'}
            className={cn(
              'rounded-full border border-transparent p-2 text-gray-400 transition-colors hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40'
            )}
          >
            <RefreshCw className={cn('h-4 w-4', syncMutation.isPending && 'animate-spin')} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-gray-50">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <User className="h-4 w-4" />
              </div>
              <span className="max-w-28 truncate">{user?.name || 'User'}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <BatchClassificationReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        payload={reviewPayload}
        onConfirmed={async () => {
          await queryClient.invalidateQueries({
            predicate: (query) => isWorkspaceQueryKey(query.queryKey),
          })
          await queryClient.refetchQueries({
            predicate: (query) => isWorkspaceQueryKey(query.queryKey),
            type: 'active',
          })
          router.refresh()
          setReviewPayload(null)
        }}
      />
    </>
  )
}
