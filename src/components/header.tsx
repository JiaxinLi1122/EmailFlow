'use client'

import { useAuth } from '@/lib/use-auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RefreshCw, User, LogOut } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export function Header() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Sync failed')
      }

      return data
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stats'] })
      await queryClient.refetchQueries({ queryKey: ['stats'] })
    },

    onError: (err) => {
      console.error('Sync failed:', err)
      alert('Sync failed')
    },
  })

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6">
      <div />
      <div className="flex items-center gap-3">
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          title={syncMutation.isPending ? 'Syncing…' : 'Sync emails'}
          className={cn(
            'rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-40',
          )}
        >
          <RefreshCw className={cn('h-4 w-4', syncMutation.isPending && 'animate-spin')} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-gray-100">
            <User className="h-4 w-4" />
            <span>{user?.name || 'User'}</span>
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
  )
}