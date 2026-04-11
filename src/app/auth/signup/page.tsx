'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Zap, Loader2, Eye, EyeOff, ArrowLeft, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function SignUpPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null)

  const passwordsDoNotMatch = confirmPassword.length > 0 && password !== confirmPassword

  function handleContinue(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Email is required'); return }
    setStep(2)
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!agreedToTerms) { setError('Please agree to the Terms of Service to continue.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Registration failed'); return }
      queryClient.invalidateQueries({ queryKey: ['auth-user'] })
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Dialog open={legalModal !== null} onOpenChange={(open) => { if (!open) setLegalModal(null) }}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0"
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b px-6 py-4 shrink-0">
          <DialogTitle className="text-base font-semibold text-gray-900">
            {legalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          </DialogTitle>
          <button
            onClick={() => setLegalModal(null)}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-6 text-sm leading-relaxed text-gray-700">
          {legalModal === 'terms' ? (
            <div className="space-y-6">
              <p className="text-xs text-gray-400">Last updated: April 2026</p>
              <p>These Terms of Service ("Terms") govern your use of EmailFlow AI, a product of <strong>Vaxon</strong> ("we", "us", or "our"). By creating an account or using our service, you agree to these Terms.</p>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">1. What EmailFlow AI does</h2>
                <p>EmailFlow AI connects to your email account using read-only access. It uses AI to classify incoming emails, extract actionable tasks, assign priority scores, and organise work by project.</p>
                <p className="mt-2">EmailFlow AI does not send, delete, modify, or forward any of your emails. Our access is strictly read-only.</p>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">2. Your account</h2>
                <ul className="list-disc space-y-1 pl-5">
                  <li>You must be 18 years or older to use this service.</li>
                  <li>You are responsible for keeping your login credentials secure.</li>
                  <li>You must not share your account with others or use the service on behalf of a third party without their consent.</li>
                  <li>You agree to provide accurate information when creating your account.</li>
                </ul>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">3. Acceptable use</h2>
                <p>You agree not to:</p>
                <ul className="list-disc space-y-1 pl-5 mt-2">
                  <li>Use the service for any unlawful purpose or in violation of any applicable laws</li>
                  <li>Attempt to reverse-engineer, scrape, or abuse the service or its APIs</li>
                  <li>Connect email accounts belonging to others without their explicit permission</li>
                  <li>Use the service to process sensitive personal data of third parties without their consent</li>
                </ul>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">4. Beta and availability</h2>
                <p>EmailFlow AI is currently in early access (MVP/Beta). The service is provided "as is" and may change, be unavailable, or contain bugs. We do not guarantee uptime or uninterrupted access during this phase.</p>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">5. Intellectual property</h2>
                <p>EmailFlow AI and all associated software, design, and content are owned by Vaxon. Your email data remains yours. We do not claim ownership of any content processed through the service.</p>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">6. Limitation of liability</h2>
                <p>To the fullest extent permitted by law, Vaxon is not liable for any indirect, incidental, or consequential damages arising from your use of EmailFlow AI. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">7. Termination</h2>
                <p>You may stop using EmailFlow AI and delete your account at any time from Settings. We may suspend or terminate accounts that violate these Terms.</p>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">8. Changes to these Terms</h2>
                <p>We may update these Terms from time to time. We will notify you of material changes by email or via a notice in the app.</p>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">9. Governing law</h2>
                <p>These Terms are governed by the laws of Australia. Any disputes shall be resolved in the courts of Australia.</p>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">10. Contact</h2>
                <p>Questions about these Terms? Contact us at <a href="mailto:legal@vaxon.ai" className="text-blue-600 hover:underline">legal@vaxon.ai</a></p>
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-xs text-gray-400">Last updated: April 2026</p>
              <p>Vaxon ("we", "us", "our") operates EmailFlow AI. This Privacy Policy explains what data we collect when you use our service, how we use it, and your rights regarding that data.</p>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">1. What data we collect</h2>
                <h3 className="font-medium text-gray-800 mb-1 mt-3">Account information</h3>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Name and email address (provided at registration)</li>
                  <li>Hashed password (we never store your password in plain text)</li>
                  <li>OAuth tokens used to access your email provider</li>
                </ul>
                <h3 className="font-medium text-gray-800 mb-1 mt-3">Email data</h3>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Email metadata: subject, sender, recipients, date, thread ID</li>
                  <li>Email body content: read and processed to extract tasks and summaries</li>
                  <li>AI-generated task titles, summaries, priority scores, and project classifications</li>
                </ul>
                <h3 className="font-medium text-gray-800 mb-1 mt-3">Usage data</h3>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Actions you take in the app (e.g. confirming or completing tasks)</li>
                  <li>Sync timestamps and error logs for service reliability</li>
                </ul>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">2. How we use your data</h2>
                <ul className="list-disc space-y-1 pl-5">
                  <li>To provide the EmailFlow AI service: syncing, classifying, and displaying your emails and tasks</li>
                  <li>To improve reliability and debug issues</li>
                  <li>To send you service-related emails (e.g. password reset, account notifications)</li>
                </ul>
                <p className="mt-3">We do not use your email content to train AI models. We do not sell your data. We do not use your data for advertising.</p>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">3. Third-party services</h2>
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="font-medium text-gray-800">AI processing</p>
                    <p className="mt-1 text-gray-600 text-xs">Email content is sent to a third-party AI processing service to classify emails and extract tasks. This provider is contractually prohibited from storing or using your content to train models.</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="font-medium text-gray-800">Google (Gmail)</p>
                    <p className="mt-1 text-gray-600 text-xs">We connect to your Gmail account with read-only access. We do not store your Google password. You can revoke access at any time from your Google account settings.</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="font-medium text-gray-800">Infrastructure</p>
                    <p className="mt-1 text-gray-600 text-xs">Your data is stored in a secure cloud database served via enterprise-grade hosting with security certifications and data protection commitments.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">4. Data retention</h2>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Your data is retained for as long as your account is active</li>
                  <li>If you delete your account, your data is permanently removed within 30 days</li>
                  <li>You can disconnect your email at any time from Settings</li>
                </ul>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">5. Your rights</h2>
                <ul className="list-disc space-y-1 pl-5">
                  <li><strong>Access</strong> — request a copy of the data we hold about you</li>
                  <li><strong>Correction</strong> — ask us to correct inaccurate data</li>
                  <li><strong>Deletion</strong> — delete your account and all data from Settings, or contact us</li>
                  <li><strong>Portability</strong> — request your task data in a machine-readable format</li>
                  <li><strong>Withdrawal of consent</strong> — disconnect your email account or delete your account at any time</li>
                </ul>
                <p className="mt-3">Contact us at <a href="mailto:privacy@vaxon.ai" className="text-blue-600 hover:underline">privacy@vaxon.ai</a>. We will respond within 30 days.</p>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">6. Security</h2>
                <p>We use encrypted connections (HTTPS), hashed passwords, and scoped OAuth tokens. If you discover a security vulnerability, please report it to <a href="mailto:security@vaxon.ai" className="text-blue-600 hover:underline">security@vaxon.ai</a>.</p>
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-2">7. Contact</h2>
                <p>For privacy-related questions: <a href="mailto:privacy@vaxon.ai" className="text-blue-600 hover:underline">privacy@vaxon.ai</a><br />Vaxon — Australia</p>
              </section>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 shrink-0 flex justify-end">
          <button
            onClick={() => setLegalModal(null)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
    <div className="flex min-h-screen">
      {/* ── Left: brand panel ── */}
      <div className="relative hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col border-r bg-gray-50 p-12">
        <Link href="/landing" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-gray-900">EmailFlow AI</span>
        </Link>

        <div className="mt-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Get started in 3 steps
          </p>
          <h2 className="mt-3 text-2xl font-bold leading-snug text-gray-900">
            From signup to
            <br />inbox clarity
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            No complex setup. Connect your email and EmailFlow AI handles the rest.
          </p>

          <ol className="mt-8 space-y-5">
            {[
              { n: '1', title: 'Create your account', desc: 'Takes less than a minute.', active: true },
              { n: '2', title: 'Connect your email', desc: 'Link your inbox in a few clicks.', active: false },
              { n: '3', title: 'See your tasks and priorities', desc: 'Your emails, turned into clear actions.', active: false },
            ].map(({ n, title, desc, active }) => (
              <li key={n} className="flex items-start gap-3.5">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {n}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${active ? 'text-gray-900' : 'text-gray-400'}`}>{title}</p>
                  <p className={`text-xs mt-0.5 ${active ? 'text-gray-500' : 'text-gray-400'}`}>{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-12 text-xs text-gray-400">© {new Date().getFullYear()} EmailFlow AI</p>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <Link href="/landing" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-gray-900">EmailFlow AI</span>
          </Link>
        </div>

        <div className="w-full max-w-[360px]">
          {/* Step indicator */}
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-1.5">
              <div className="h-1 w-8 rounded-full bg-blue-600" />
              <div className={`h-1 w-8 rounded-full transition-colors ${step === 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 1 ? 'Create your account' : 'Set your password'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {step === 1 ? 'Free to start, no credit card needed' : `Setting up account for ${email}`}
            </p>
          </div>

          {/* ── Step 1: OAuth + Name + Email ── */}
          {step === 1 && (
            <>
              {/* OAuth buttons */}
              <div className="space-y-2.5">
                <a
                  href="/api/auth/google"
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="flex-1">Continue with Google</span>
                </a>

                <div className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-400">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 21 21" fill="none">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                  </svg>
                  <span className="flex-1">Continue with Microsoft</span>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">Coming soon</span>
                </div>

                <div className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-400">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.27.07 2.15.73 2.88.78 1.09-.22 2.14-.91 3.31-.82 1.4.12 2.46.72 3.14 1.84-2.87 1.72-2.19 5.49.58 6.56-.69 1.67-1.59 3.31-1.91 4.5zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <span className="flex-1">Continue with Apple</span>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">Coming soon</span>
                </div>
              </div>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-xs text-gray-400">or continue with email</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>

              <form onSubmit={handleContinue} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoFocus
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Continue
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: Password ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoFocus
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                  <button type="button" onClick={() => setShowPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    className={`w-full rounded-lg border px-3.5 py-2.5 pr-11 text-sm transition-all focus:outline-none focus:ring-4 ${
                      passwordsDoNotMatch
                        ? 'border-red-400 focus:ring-red-100'
                        : 'border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                    {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {passwordsDoNotMatch && (
                  <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                )}
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500 leading-relaxed">
                  I agree to the{' '}
                  <button type="button" onClick={() => setLegalModal('terms')} className="text-blue-600 hover:underline">Terms of Service</button>
                  {' '}and{' '}
                  <button type="button" onClick={() => setLegalModal('privacy')} className="text-blue-600 hover:underline">Privacy Policy</button>
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !agreedToTerms}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create free account
              </button>

              <button
                type="button"
                onClick={() => { setStep(1); setError(''); setPassword(''); setConfirmPassword('') }}
                className="flex w-full items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-medium text-blue-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
    </>
  )
}
