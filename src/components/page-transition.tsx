'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef, type ReactNode } from 'react'

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter')
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      // Exit phase
      setPhase('exit')
      const timeout = setTimeout(() => {
        setDisplayChildren(children)
        setPhase('enter')
      }, 150)
      return () => clearTimeout(timeout)
    } else {
      // Same pathname, just update children
      setDisplayChildren(children)
    }
  }, [pathname, children])

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
