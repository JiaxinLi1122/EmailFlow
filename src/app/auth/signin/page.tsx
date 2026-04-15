import { Suspense } from 'react'

import { StatePanel } from '@/components/state-panel'

import { SignInContent } from './sign-in-content'

export const dynamic = 'force-dynamic'

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <StatePanel loading title="Loading sign in" description="Preparing your account access." />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  )
}
