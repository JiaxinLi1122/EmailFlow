'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    // When pathname changes, trigger exit then enter
    setTransitioning(true)
    const timeout = setTimeout(() => {
      setDisplayChildren(children)
      setTransitioning(false)
    }, 150) // match CSS duration
    return () => clearTimeout(timeout)
  }, [pathname, children])

  return (
    <div
      className={`transition-all duration-200 ease-out ${
        transitioning
          ? 'translate-y-1 opacity-0'
          : 'translate-y-0 opacity-100'
      }`}
    >
      {displayChildren}
    </div>
  )
}
