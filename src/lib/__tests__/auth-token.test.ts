import { describe, it, expect } from 'vitest'
import { createToken, verifyToken, COOKIE_NAME } from '../auth-token'

// Only testing createToken / verifyToken — pure JWT logic, no Next.js deps.
// Cookie helpers (setSessionCookie, clearSessionCookie, getSessionToken) require
// the Next.js request context and are covered by integration/e2e tests.

describe('createToken / verifyToken', () => {
  it('round-trips a minimal payload', () => {
    const token = createToken({ userId: 'user-123' })
    const payload = verifyToken(token)
    expect(payload?.userId).toBe('user-123')
  })

  it('includes optional purpose and remember fields', () => {
    const token = createToken({ userId: 'u1', purpose: 'pre-2fa', remember: true })
    const payload = verifyToken(token)
    expect(payload?.purpose).toBe('pre-2fa')
    expect(payload?.remember).toBe(true)
  })

  it('returns null for a garbage token', () => {
    expect(verifyToken('not-a-token')).toBeNull()
  })

  it('returns null for a token signed with a different secret', () => {
    // jwt.sign with a different secret produces a valid-looking but unverifiable token
    const jwt = require('jsonwebtoken')
    const token = jwt.sign({ userId: 'u1' }, 'wrong-secret')
    expect(verifyToken(token)).toBeNull()
  })

  it('returns null for an already-expired token', () => {
    // expiresIn: 0 means exp === iat, which is immediately expired
    const token = createToken({ userId: 'u1' }, 0)
    expect(verifyToken(token)).toBeNull()
  })
})

describe('COOKIE_NAME', () => {
  it('is defined', () => {
    expect(COOKIE_NAME).toBe('ef-session')
  })
})
