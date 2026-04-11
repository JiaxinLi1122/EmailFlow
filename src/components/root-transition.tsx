'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'
import { SectionFade } from '@/components/page-transition'

export function RootTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // Only fade when the top-level route segment changes (e.g. /auth → /dashboard).
  // Within-section transitions are handled by the sub-layouts themselves.
  const section = pathname.split('/')[1] ?? ''

  return <SectionFade watchKey={section}>{children}</SectionFade>
}
