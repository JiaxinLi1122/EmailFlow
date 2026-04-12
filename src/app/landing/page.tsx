'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckSquare,
  Clock3,
  FolderOpen,
  Mail,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'

const workflow = [
  {
    title: 'Read the signal, not the noise',
    description: 'EmailFlow AI separates work that needs action from updates that can wait.',
  },
  {
    title: 'Keep context attached',
    description: 'Tasks, emails, projects, and matter history stay connected instead of splitting into separate tools.',
  },
  {
    title: 'Work from a calmer queue',
    description: 'Your dashboard shows what to review now, what is moving, and what is already closed.',
  },
]

const pillars = [
  {
    icon: CheckSquare,
    title: 'Tasks extracted automatically',
    copy: 'Deadlines, follow-ups, approvals, and next steps are pulled out of email threads for you.',
  },
  {
    icon: FolderOpen,
    title: 'Grouped by project',
    copy: 'Related emails and tasks cluster into one working context instead of scattering across your inbox.',
  },
  {
    icon: Clock3,
    title: 'Daily digest at the right time',
    copy: 'A clean summary keeps the day moving without reopening every thread.',
  },
]

const trustPoints = [
  'Read-only Gmail access',
  'Disconnect any time',
  'Built for people handling multiple projects at once',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f8fc] text-slate-950">
      <div className="relative isolate">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.10),transparent_24%),linear-gradient(180deg,#edf4fb_0%,#f7fbff_30%,#ffffff_60%,#f4f8fc_100%)]" />
        <div className="absolute left-[-12rem] top-24 -z-10 h-[26rem] w-[26rem] rounded-full bg-blue-200/16 blur-3xl" />
        <div className="absolute right-[-8rem] top-10 -z-10 h-[22rem] w-[22rem] rounded-full bg-sky-200/18 blur-3xl" />

        <header className="sticky top-0 z-20 border-b border-white/60 bg-white/72 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/landing" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-[0_12px_30px_rgba(29,78,216,0.24)]">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-[0.16em] text-slate-900 uppercase">EmailFlow AI</p>
                <p className="text-xs text-slate-500">Inbox to action system</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/auth/signin"
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-950"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(29,78,216,0.28)] transition-all hover:-translate-y-0.5 hover:bg-blue-800"
              >
                Start free
              </Link>
            </div>
          </div>
        </header>

        <main>
          <section className="mx-auto grid min-h-[calc(100svh-73px)] max-w-7xl items-center gap-14 px-6 py-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(22rem,0.98fr)] lg:py-10">
            <div className="max-w-2xl">
              <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/78 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-800 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Inbox workflow, without inbox chaos
              </div>

              <div className="animate-fade-in-up stagger-1 mt-6">
                <p className="text-sm font-semibold tracking-[0.18em] text-slate-500 uppercase">EmailFlow AI</p>
                <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-[0.96] tracking-[-0.05em] text-slate-950 sm:text-6xl lg:text-7xl">
                  Email becomes
                  <br />
                  a clean queue.
                </h1>
                <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                  Turn threads into clear tasks, keep work grouped by project, and review priorities from one quieter workspace.
                </p>
              </div>

              <div className="animate-fade-in-up stagger-2 mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(29,78,216,0.28)] transition-all hover:-translate-y-0.5 hover:bg-blue-800"
                >
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/86 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-800"
                >
                  Open dashboard
                </Link>
              </div>

              <div className="animate-fade-in-up stagger-3 mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
                {trustPoints.map((point) => (
                  <span key={point} className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    {point}
                  </span>
                ))}
              </div>
            </div>

            <div className="animate-scale-in relative lg:justify-self-end">
              <div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-blue-200/40 blur-3xl" />
              <div className="absolute -right-6 bottom-6 h-36 w-36 rounded-full bg-cyan-200/45 blur-3xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(241,247,255,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(37,99,235,0.10)]">
                <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/92 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Today</p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">4 tasks need review</p>
                    </div>
                    <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      Last sync 8:12 AM
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/75 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Work</p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">Q2 Launch Prep</p>
                          <p className="mt-1 text-sm text-slate-600">Finalize stakeholder notes and confirm asset delivery.</p>
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                          2 active
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Next action</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">Reply to design sign-off thread</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Due today • linked to project context</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Digest</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">Waiting on 3 replies</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">One client thread, one approval, one invoice follow-up</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-900/10 bg-[linear-gradient(135deg,rgba(29,78,216,1)_0%,rgba(30,64,175,1)_100%)] px-4 py-3 text-white">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">Read-only access</p>
                          <p className="mt-1 text-sm text-blue-50/90">We read mail to organize it. We do not send, delete, or modify anything.</p>
                        </div>
                        <Shield className="h-5 w-5 shrink-0 text-blue-100" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 py-20">
            <div className="grid gap-14 border-t border-slate-200/70 pt-14 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Workflow</p>
                <h2 className="mt-4 max-w-md text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                  Built for people who manage work across multiple threads.
                </h2>
              </div>

              <div className="space-y-8">
                {workflow.map((item, index) => (
                  <div
                    key={item.title}
                    className="animate-fade-in-up border-b border-slate-200/70 pb-8 last:border-b-0 last:pb-0"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <span className="mt-1 text-sm font-semibold text-blue-700">0{index + 1}</span>
                      <div>
                        <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{item.title}</h3>
                        <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 py-6">
            <div className="grid gap-10 border-t border-slate-200/70 pt-14 lg:grid-cols-3">
              {pillars.map((pillar, index) => (
                <div
                  key={pillar.title}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 110}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                      <pillar.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{pillar.title}</h3>
                  </div>
                  <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">{pillar.copy}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 py-20">
            <div className="overflow-hidden rounded-[2.25rem] bg-[linear-gradient(135deg,rgba(29,78,216,1)_0%,rgba(30,64,175,1)_55%,rgba(15,23,42,0.96)_100%)] px-7 py-10 text-white shadow-[0_32px_100px_rgba(29,78,216,0.24)] sm:px-10 sm:py-12">
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Start small</p>
                  <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                    Connect Gmail, review the first queue, and let the system organize the rest.
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                    You do not need a new workflow. EmailFlow AI is here to make the one you already have easier to run.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-900 transition-transform hover:-translate-y-0.5"
                  >
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-white/30 hover:text-white"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/60">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-700 text-white">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">EmailFlow AI</p>
                <p className="text-xs text-slate-400">© {new Date().getFullYear()} EmailFlow AI</p>
              </div>
            </div>

            <div className="flex gap-5 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
              <Link href="/auth/signin" className="transition-colors hover:text-slate-900">
                Sign in
              </Link>
              <Link href="/auth/signup" className="transition-colors hover:text-slate-900">
                Sign up
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
