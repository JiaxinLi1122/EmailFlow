import { AlertTriangle, FolderOpen, UserRound } from 'lucide-react'

type Props = {
  identityName: string
  projectName: string
  detail?: string
  attentionCount?: number
  compact?: boolean
}

export function ContextGroupHeader({
  identityName,
  projectName,
  detail,
  attentionCount = 0,
  compact = false,
}: Props) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] shadow-sm ${compact ? 'px-4 py-3' : 'px-5 py-4'}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          <UserRound className="h-3.5 w-3.5 text-slate-400" />
          <span>{identityName}</span>
        </div>

        {attentionCount > 0 ? (
          <div className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 ring-1 ring-red-100">
            <AlertTriangle className="h-3 w-3" />
            {attentionCount} attention
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold tracking-[-0.02em] text-slate-900`}>
              {projectName}
            </h3>
          </div>
          {detail ? (
            <p className="mt-1 pl-6 text-xs text-slate-500">
              {detail}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
