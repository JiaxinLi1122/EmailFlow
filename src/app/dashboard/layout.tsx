'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/use-auth'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { SectionFade } from '@/components/page-transition'
import { StatePanel } from '@/components/state-panel'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="mx-auto flex h-screen w-full max-w-xl items-center px-6">
        <StatePanel
          loading
          title="Loading your workspace"
          description="Checking your session and preparing your dashboard."
          className="w-full"
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(255,255,255,1)_240px)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="min-h-[calc(100vh-3.5rem)] flex-1 px-6 pb-10 pt-6">
          <SectionFade>{children}</SectionFade>
        </main>
      </div>
    </div>
  )
}
