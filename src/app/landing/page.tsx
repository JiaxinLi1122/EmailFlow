'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckSquare,
  Clock,
  FolderOpen,
  Mail,
  Shield,
  Zap,
} from 'lucide-react'

const features = [
  {
    icon: CheckSquare,
    title: 'Tasks from emails',
    desc: 'Action items, deadlines, and follow-ups are automatically extracted from your threads.',
  },
  {
    icon: FolderOpen,
    title: 'Grouped by project',
    desc: 'Related emails and tasks are clustered together so you can see everything about a project in one place.',
  },
  {
    icon: Mail,
    title: 'Priority at a glance',
    desc: 'Emails are scored by urgency and impact. You see what needs attention first, not just what arrived last.',
  },
  {
    icon: Clock,
    title: 'Daily digest',
    desc: 'A clear morning summary of open tasks, upcoming deadlines, and threads waiting for your reply.',
  },
  {
    icon: Shield,
    title: 'Read-only access',
    desc: 'We only read your emails. We cannot send, delete, or modify anything. Disconnect at any time.',
  },
  {
    icon: Zap,
    title: 'Stays out of the way',
    desc: 'No complicated setup. Connect Gmail, and EmailFlow AI starts working in the background.',
  },
]

const steps = [
  {
    n: '1',
    title: 'Create your account',
    desc: 'Sign up with email or continue with Google.',
  },
  {
    n: '2',
    title: 'Connect your Gmail',
    desc: 'One-click OAuth. Read-only access means your inbox stays untouched.',
  },
  {
    n: '3',
    title: 'See your tasks and priorities',
    desc: 'EmailFlow AI processes your inbox and surfaces what actually needs doing.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(219,234,254,0.75),transparent_38%),linear-gradient(180deg,#f8fbff_0%,#ffffff_42%,#f8fbff_100%)] text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
        <nav className="sticky top-0 z-20 -mx-6 border-b border-white/70 bg-white/80 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Link href="/landing" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-700 shadow-sm">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-[0.16em] text-blue-700 uppercase">EmailFlow AI</p>
                <p className="text-xs text-gray-400">Inbox to action system</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/auth/signin"
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-800"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-800"
              >
                Get started free
              </Link>
            </div>
          </div>
        </nav>

        <main className="flex-1">
          <section className="relative overflow-hidden py-20 sm:py-24">
            <div className="absolute inset-x-0 top-8 -z-10 mx-auto h-56 max-w-4xl rounded-full bg-blue-200/30 blur-3xl" />
            <div className="mx-auto max-w-4xl text-center">
              <div className="animate-in fade-in zoom-in-95 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/85 px-4 py-1.5 text-xs font-medium text-blue-800 shadow-sm duration-300">
                <span className="h-2 w-2 rounded-full bg-blue-700" />
                Built for busy inboxes and real task follow-through
              </div>

              <h1 className="animate-in fade-in slide-in-from-bottom-2 mt-6 text-4xl font-semibold leading-tight tracking-tight text-gray-950 duration-500 sm:text-5xl md:text-6xl">
                Turn incoming email
                <br />
                into a calmer work queue
              </h1>

              <p className="animate-in fade-in slide-in-from-bottom-3 mx-auto mt-6 max-w-2xl text-base leading-7 text-gray-600 duration-500 sm:text-lg">
                EmailFlow AI reads your inbox, extracts the next actions, groups related threads,
                and keeps your priorities visible without making your workspace feel noisy.
              </p>

              <div className="animate-in fade-in slide-in-from-bottom-4 mt-8 flex flex-col items-center justify-center gap-3 duration-500 sm:flex-row">
                <Link
                  href="/auth/signup"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-md sm:w-auto"
                >
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/auth/signin"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white/90 px-6 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 sm:w-auto"
                >
                  Sign in
                </Link>
              </div>

              <p className="mt-4 text-xs text-gray-400">
                Free to start · No credit card required · Works with Gmail
              </p>

              <div className="animate-in fade-in slide-in-from-bottom-5 mt-12 grid gap-4 rounded-[28px] border border-white/80 bg-white/85 p-4 text-left shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur duration-500 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Signal first</p>
                  <p className="mt-2 text-sm text-gray-600">Actionable threads stay visible while low-signal mail fades into the background.</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Linked context</p>
                  <p className="mt-2 text-sm text-gray-600">Tasks, emails, and matter groupings stay connected so nothing gets lost.</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Daily rhythm</p>
                  <p className="mt-2 text-sm text-gray-600">Digest views and task states keep review work small and predictable.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16">
            <div className="mx-auto max-w-5xl">
              <div className="mb-10 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Core workflow</p>
                <h2 className="mt-3 text-2xl font-semibold text-gray-950 sm:text-3xl">
                  Built for people who live inside email
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature, index) => (
                  <div
                    key={feature.title}
                    className={`animate-in fade-in slide-in-from-bottom-2 rounded-3xl border border-white/80 p-6 shadow-sm backdrop-blur duration-500 ${
                      index === 0
                        ? 'bg-[linear-gradient(180deg,rgba(239,246,255,0.95)_0%,rgba(255,255,255,0.95)_100%)]'
                        : 'bg-white/90'
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-800">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-gray-900">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16">
            <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">How it works</p>
                <h2 className="mt-3 text-2xl font-semibold text-gray-950 sm:text-3xl">
                  Up and running in just a few minutes
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-gray-600">
                  No heavy setup and no training loop. Connect your inbox, let the pipeline sort the signal,
                  then work from one calmer dashboard.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
                <ol className="space-y-5">
                  {steps.map((step) => (
                    <li key={step.n} className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white px-4 py-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-semibold text-white">
                        {step.n}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900">{step.title}</p>
                        <p className="mt-1 text-sm leading-6 text-gray-600">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="mt-6 border-t border-gray-100 pt-6">
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-md"
                  >
                    Get started free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/70 py-8">
          <div className="flex flex-col gap-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-700 shadow-sm">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">EmailFlow AI</p>
                <p className="text-xs text-gray-400">© {new Date().getFullYear()} EmailFlow AI</p>
              </div>
            </div>

            <div className="flex gap-4 text-xs font-medium text-gray-400">
              <Link href="/auth/signin" className="transition-colors hover:text-blue-800">
                Sign in
              </Link>
              <Link href="/auth/signup" className="transition-colors hover:text-blue-800">
                Sign up
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
