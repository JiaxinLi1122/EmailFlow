'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef, type ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  /**
   * Optional key to watch instead of the full pathname.
   * Useful at root layout level to only animate on section changes
   * (e.g. pass pathname.split('/')[1] to trigger only when moving
   * between /auth/*, /dashboard/*, /landing, etc.)
   */
  watchKey?: string
}

export function PageTransition({ children, watchKey }: PageTransitionProps) {
  const pathname = usePathname()
  const key = watchKey ?? pathname
  const [displayChildren, setDisplayChildren] = useState(children)
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter')
  const prevKey = useRef(key)

  useEffect(() => {
    if (key !== prevKey.current) {
      prevKey.current = key
      const frame = requestAnimationFrame(() => setPhase('exit'))
      const timeout = setTimeout(() => {
        setDisplayChildren(children)
        setPhase('enter')
      }, 150)
      return () => {
        cancelAnimationFrame(frame)
        clearTimeout(timeout)
      }
    }
  }, [key, children])

  return (
    <div
      className={`transition-all duration-200 ease-out ${
        phase === 'exit'
          ? 'translate-y-2 opacity-0 scale-[0.99]'
          : 'translate-y-0 opacity-100 scale-100'
      }`}
    >
      {displayChildren}
    </div>
  )
}

/**
 * Lightweight opacity-only fade used at root layout level.
 * Avoids CSS transform so it never creates a new containing block
 * that would break fixed/sticky children inside layouts.
 */
export function SectionFade({ children, watchKey }: PageTransitionProps) {
  const pathname = usePathname()
  const key = watchKey ?? pathname
  const [displayChildren, setDisplayChildren] = useState(children)
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter')
  const prevKey = useRef(key)

  useEffect(() => {
    if (key !== prevKey.current) {
      prevKey.current = key
      const frame = requestAnimationFrame(() => setPhase('exit'))
      const timeout = setTimeout(() => {
        setDisplayChildren(children)
        setPhase('enter')
      }, 120)
      return () => {
        cancelAnimationFrame(frame)
        clearTimeout(timeout)
      }
    }
  }, [key, children])

  return (
    <div
      className={`transition-opacity duration-150 ease-out ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {displayChildren}
    </div>
  )
}
