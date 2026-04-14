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
import { RefreshCw, User, LogOut, ChevronRight, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { BatchClassificationReviewDialog } from '@/components/batch-classification-review-dialog'
import type { BatchClassificationReviewPayload } from '@/services/email-sync-service'
import { isWorkspaceQueryKey } from '@/lib/query-cache'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface SyncResultData {
  ok: boolean
  syncedCount: number
  skippedCount: number
  failedCount: number
  retriedSuccessCount: number
  retriedFailedCount: number
  pendingFailedCount: number
  errorMessage?: string
}

export function Header() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const router = useRouter()
  const [reviewPayload, setReviewPayload] = useState<BatchClassificationReviewPayload | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResultData | null>(null)
  const [syncResultOpen, setSyncResultOpen] = useState(false)

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

      setSyncResult({
        ok: true,
        syncedCount: syncData?.syncedCount ?? 0,
        skippedCount: syncData?.skippedCount ?? 0,
        failedCount: syncData?.failedCount ?? 0,
        retriedSuccessCount: syncData?.retriedSuccessCount ?? 0,
        retriedFailedCount: syncData?.retriedFailedCount ?? 0,
        pendingFailedCount: syncData?.pendingFailedCount ?? 0,
      })
      setSyncResultOpen(true)
    },

    onError: (err) => {
      console.error('Sync failed:', err)
      // Refetch stats even on failure — lastSyncAt may have been written before
      // the error occurred, so the UI should reflect the current DB state.
      queryClient.invalidateQueries({
        predicate: (query) => isWorkspaceQueryKey(query.queryKey),
      })
      queryClient.refetchQueries({
        predicate: (query) => isWorkspaceQueryKey(query.queryKey),
        type: 'active',
      })
      setSyncResult({
        ok: false,
        syncedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        retriedSuccessCount: 0,
        retriedFailedCount: 0,
        pendingFailedCount: 0,
        errorMessage: err instanceof Error ? err.message : 'Sync failed',
      })
      setSyncResultOpen(true)
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

      <SyncResultDialog
        open={syncResultOpen}
        onClose={() => setSyncResultOpen(false)}
        result={syncResult}
      />
    </>
  )
}

// ============================================================
// Sync Result Dialog
// Displayed after every sync attempt. Does not auto-close.
// ============================================================

interface SyncResultDialogProps {
  open: boolean
  onClose: () => void
  result: SyncResultData | null
}

function SyncResultDialog({ open, onClose, result }: SyncResultDialogProps) {
  if (!result) return null

  const { ok, syncedCount, skippedCount, failedCount, retriedSuccessCount, retriedFailedCount, pendingFailedCount, errorMessage } = result

  const isPartial = ok && (failedCount > 0 || pendingFailedCount > 0)
  const isPerfect = ok && failedCount === 0 && pendingFailedCount === 0

  const statusIcon = !ok
    ? <AlertCircle className="h-5 w-5 text-red-500" />
    : isPartial
    ? <AlertTriangle className="h-5 w-5 text-amber-500" />
    : <CheckCircle2 className="h-5 w-5 text-green-500" />

  const statusLabel = !ok ? 'Sync failed' : isPartial ? 'Partial success' : 'Success'
  const statusColor = !ok ? 'text-red-600' : isPartial ? 'text-amber-600' : 'text-green-600'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Sync Result</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5">
          {statusIcon}
          <span className={cn('text-sm font-medium', statusColor)}>{statusLabel}</span>
        </div>

        {ok ? (
          <ul className="space-y-1.5 text-sm text-gray-700">
            <SyncLine label={`Synced ${syncedCount} email${syncedCount === 1 ? '' : 's'}`} />
            {skippedCount > 0 && (
              <SyncLine label={`${skippedCount} skipped (already stored)`} muted />
            )}
            {failedCount > 0 && (
              <SyncLine label={`${failedCount} failed to store`} warn />
            )}
            {retriedSuccessCount > 0 && (
              <SyncLine label={`Recovered ${retriedSuccessCount} previously failed email${retriedSuccessCount === 1 ? '' : 's'}`} success />
            )}
            {pendingFailedCount > 0 && (
              <SyncLine label={`${pendingFailedCount} failed email${pendingFailedCount === 1 ? '' : 's'} still pending retry`} warn />
            )}
            {retriedFailedCount > 0 && pendingFailedCount === 0 && (
              <SyncLine label={`${retriedFailedCount} email${retriedFailedCount === 1 ? '' : 's'} could not be recovered`} warn />
            )}
            {isPerfect && syncedCount === 0 && skippedCount === 0 && (
              <SyncLine label="No new emails" muted />
            )}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">{errorMessage}</p>
        )}

        <DialogFooter showCloseButton={false}>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SyncLine({ label, muted, warn, success }: { label: string; muted?: boolean; warn?: boolean; success?: boolean }) {
  return (
    <li className={cn(
      'flex items-center gap-2',
      muted && 'text-gray-400',
      warn && 'text-amber-600',
      success && 'text-green-600',
    )}>
      <span className="h-1 w-1 rounded-full bg-current opacity-60 shrink-0" />
      {label}
    </li>
  )
}
