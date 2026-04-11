'use client'

import Link from 'next/link'
import { Zap, Mail, CheckSquare, FolderOpen, Clock, Shield, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">

      {/* ── Navbar ── */}
      <nav className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/landing" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-gray-900">EmailFlow AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/auth/signin"
            className="px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-20 text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl">
          Your inbox, turned into
          <br />
          a clear action list
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg">
          EmailFlow AI reads your emails, pulls out what needs doing,
          and keeps your tasks and projects organised — so nothing slips through.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 sm:w-auto"
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/auth/signin"
            className="w-full rounded-lg border px-6 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">Free to start · No credit card required · Works with Gmail</p>
      </section>

      {/* ── Features ── */}
      <section className="border-t bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Built for people who get a lot of email</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
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
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-6">
                <f.icon className="h-5 w-5 text-blue-600" />
                <h3 className="mt-3 font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-gray-900">Up and running in two minutes</h2>
          <p className="mt-3 text-sm text-gray-500">No configuration. No training. Just connect and go.</p>

          <ol className="mt-10 space-y-6 text-left">
            {[
              {
                n: '1',
                title: 'Create your account',
                desc: 'Sign up with email or continue with Google.',
              },
              {
                n: '2',
                title: 'Connect your Gmail',
                desc: 'One-click OAuth. Read-only — we never touch your emails.',
              },
              {
                n: '3',
                title: 'See your tasks and priorities',
                desc: 'EmailFlow AI processes your inbox and surfaces what actually needs doing.',
              },
            ].map(({ n, title, desc }) => (
              <li key={n} className="flex items-start gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {n}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{title}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t px-6 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">EmailFlow AI</span>
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} EmailFlow AI</p>
          <div className="flex gap-4 text-xs text-gray-400">
            <Link href="/auth/signin" className="hover:text-gray-700 transition-colors">Sign in</Link>
            <Link href="/auth/signup" className="hover:text-gray-700 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
