import { describe, it, expect } from 'vitest'
import { AppError, isAppError, getErrorMessage } from '../app-errors'

describe('AppError', () => {
  it('creates with default status 400', () => {
    const err = new AppError('UNAUTHORIZED', 'Not allowed')
    expect(err.code).toBe('UNAUTHORIZED')
    expect(err.message).toBe('Not allowed')
    expect(err.status).toBe(400)
    expect(err.name).toBe('AppError')
  })

  it('accepts custom status', () => {
    const err = new AppError('SESSION_EXPIRED', 'Session expired', 401)
    expect(err.status).toBe(401)
  })

  it('accepts details', () => {
    const details = { field: 'email' }
    const err = new AppError('VALIDATION_ERROR', 'Invalid', 422, details)
    expect(err.details).toEqual(details)
  })

  it('is instanceof Error', () => {
    expect(new AppError('UNAUTHORIZED', 'No')).toBeInstanceOf(Error)
  })
})

describe('isAppError', () => {
  it('returns true for AppError', () => {
    expect(isAppError(new AppError('UNAUTHORIZED', 'x'))).toBe(true)
  })

  it('returns false for plain Error', () => {
    expect(isAppError(new Error('x'))).toBe(false)
  })

  it('returns false for non-errors', () => {
    expect(isAppError('string')).toBe(false)
    expect(isAppError(null)).toBe(false)
    expect(isAppError(undefined)).toBe(false)
  })
})

describe('getErrorMessage', () => {
  it('returns the error message when present', () => {
    expect(getErrorMessage(new Error('oops'), 'fallback')).toBe('oops')
  })

  it('returns fallback for non-Error values', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback')
    expect(getErrorMessage('string', 'fallback')).toBe('fallback')
    expect(getErrorMessage(42, 'fallback')).toBe('fallback')
  })

  it('returns fallback for AppError (treated as Error, returns message)', () => {
    const err = new AppError('UNAUTHORIZED', 'custom msg')
    expect(getErrorMessage(err, 'fallback')).toBe('custom msg')
  })
})
