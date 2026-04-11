import type { Metadata } from 'next'
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { QueryProviders } from '@/components/providers'
import { Toaster } from '@/components/ui/sonner'
import { RootTransition } from '@/components/root-transition'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const jakarta = Plus_Jakarta_Sans({ variable: '--font-jakarta', subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const jetbrainsMono = JetBrains_Mono({ variable: '--font-jetbrains', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EmailFlow AI',
  description: 'AI-Powered Email-to-Task Orchestration',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="h-full bg-gray-50 antialiased">
        <QueryProviders>
          <RootTransition>{children}</RootTransition>
          <Toaster />
        </QueryProviders>
      </body>
    </html>
  )
}
