'use client'

import { useState } from 'react'

export default function TotpSetupPage() {
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/totp/setup', {
        method: 'POST',
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Failed to generate QR code')
        return
      }

      setQrCode(data.data.qrCodeDataUrl)
      setSecret(data.data.secret)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-gray-900">Set up Authenticator</h1>
        <p className="mb-4 text-sm text-gray-500">
          Click the button below to generate a QR code.
        </p>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate QR Code'}
        </button>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {qrCode && (
          <div className="space-y-4">
            <img src={qrCode} alt="TOTP QR Code" className="w-64 h-64 mx-auto border rounded-lg" />

            <div>
              <p className="text-sm font-medium text-gray-700">Secret:</p>
              <p className="break-all rounded bg-gray-100 p-2 text-sm text-gray-800">
                {secret}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}