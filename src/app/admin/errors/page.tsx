'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/use-auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ErrorLog {
  id: string
  userId: string | null
  action: string
  error: string
  stack: string | null
  createdAt: string
}

export default function AdminErrorsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [fetching, setFetching] = useState(false)
  const [selected, setSelected] = useState<ErrorLog | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!user) { router.replace('/auth/signin'); return }
    if (!user.isAdmin) { router.replace('/dashboard'); return }

    async function loadErrors() {
      setFetching(true)
      try {
        const res = await fetch('/api/admin/errors')
        const json = await res.json()
        setLogs(json.data ?? [])
      } finally {
        setFetching(false)
      }
    }

    loadErrors()
  }, [isLoading, user, router])

  if (isLoading || !user) return null

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Error Logs</h1>

      {fetching ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No errors recorded.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setSelected(log)}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {log.userId ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 font-medium">{log.action}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-destructive">
                    {log.error}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.action}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1 font-medium text-muted-foreground">Error</p>
              <p className="text-destructive">{selected?.error}</p>
            </div>
            {selected?.stack && (
              <div>
                <p className="mb-1 font-medium text-muted-foreground">Stack</p>
                <pre className="overflow-x-auto rounded bg-muted p-3 text-xs leading-relaxed">
                  {selected.stack}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
