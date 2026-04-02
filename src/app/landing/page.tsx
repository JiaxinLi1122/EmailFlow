'use client'

import Link from 'next/link'
import { Zap, Mail, CheckSquare, BarChart3, Shield, ArrowRight, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Nav */}
      <nav className="animate-fade-in sticky top-0 z-50 flex items-center justify-between bg-white/80 backdrop-blur-sm px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">EmailFlow AI</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/auth/signin"
            className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors sm:px-4"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap sm:px-4"
          >
            Sign up free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-12 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-16">
        <div className="animate-fade-in-up stagger-1 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm text-blue-700 mb-6">
          <Sparkles className="h-4 w-4" />
          AI-Powered Email Management
        </div>
        <h1 className="animate-fade-in-up stagger-2 text-3xl font-bold text-gray-900 leading-tight sm:text-5xl">
          Turn your inbox into an
          <br />
          <span className="text-blue-600">organized task board</span>
        </h1>
        <p className="animate-fade-in-up stagger-3 mt-4 text-base text-gray-600 max-w-2xl mx-auto sm:mt-6 sm:text-lg">
          EmailFlow AI reads your emails, classifies them by importance,
          extracts actionable tasks, and generates daily summaries — so you
          never miss what matters.
        </p>
        <div className="animate-fade-in-up stagger-4 mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/auth/signup"
            className="flex w-full items-center justify-center gap-2 px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-200 hover:-translate-y-0.5 sm:w-auto"
          >
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/auth/signin"
            className="w-full px-6 py-3 text-base font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-all border hover:-translate-y-0.5 sm:w-auto"
          >
            Log in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Mail,
              title: 'Smart Classification',
              desc: 'AI categorizes emails into action, awareness, or ignore — instantly.',
            },
            {
              icon: CheckSquare,
              title: 'Task Extraction',
              desc: 'Automatically pulls out tasks, deadlines, and action items from emails.',
            },
            {
              icon: BarChart3,
              title: 'Priority Scoring',
              desc: 'Each task gets an urgency × impact score so you focus on what matters.',
            },
            {
              icon: Shield,
              title: 'Read-Only Access',
              desc: 'We only read your emails. We cannot send, delete, or modify anything.',
            },
          ].map((f, i) => (
            <div
              key={f.title}
              className={`animate-fade-in-up stagger-${i + 5} rounded-xl border bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <f.icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="animate-fade-in mt-auto border-t py-8 text-center text-sm text-gray-400">
        EmailFlow AI — MVP
      </footer>
    </div>
  )
}
