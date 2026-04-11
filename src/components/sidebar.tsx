'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CheckSquare,
  Mail,
  FileText,
  Settings,
  Zap,
} from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/dashboard/emails', label: 'Emails', icon: Mail },
  { href: '/dashboard/digest', label: 'Digest', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-gray-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.98)_100%)] backdrop-blur">
      <div className="border-b border-gray-200/80 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">EmailFlow</p>
            <span className="block truncate text-lg font-bold text-gray-900">AI Workspace</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-5">
        {nav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm active:scale-[0.99]'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-white text-blue-600'
                    : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600'
                )}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <span className="flex-1">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-200/80 px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Workspace</p>
        <p className="mt-1 text-xs text-gray-500">
          Focused email triage, task extraction, and digest review.
        </p>
      </div>
    </aside>
  )
}
