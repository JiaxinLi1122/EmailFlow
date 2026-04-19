import { describe, it, expect } from 'vitest'
import { preFilterEmail } from '../pre-filter'

describe('preFilterEmail — provider categories', () => {
  it.each(['spam', 'promotions', 'social', 'updates'] as const)(
    'skips category "%s"',
    (category) => {
      const result = preFilterEmail({
        sender: 'someone@example.com',
        subject: 'Hello',
        providerCategories: [category],
      })
      expect(result.skipped).toBe(true)
      expect(result.category).toBe('ignore')
      expect(result.isWorkRelated).toBe(false)
    }
  )

  it('does not skip a plain inbox email', () => {
    const result = preFilterEmail({
      sender: 'boss@company.com',
      subject: 'Q3 review',
      providerCategories: [],
    })
    expect(result.skipped).toBe(false)
  })
})

describe('preFilterEmail — noreply senders', () => {
  it.each([
    'noreply@github.com',
    'no-reply@aws.amazon.com',
    'donotreply@bank.com',
    'do-not-reply@service.com',
    'mailer-daemon@mail.server.com',
    'postmaster@example.com',
  ])('skips sender "%s"', (sender) => {
    const result = preFilterEmail({ sender, subject: 'Notification', providerCategories: [] })
    expect(result.skipped).toBe(true)
    expect(result.category).toBe('awareness')
  })

  it('extracts email from angle-bracket format', () => {
    const result = preFilterEmail({
      sender: 'GitHub <noreply@github.com>',
      subject: 'PR merged',
      providerCategories: [],
    })
    expect(result.skipped).toBe(true)
    expect(result.category).toBe('awareness')
  })

  it('does not skip a normal sender', () => {
    const result = preFilterEmail({
      sender: 'alice@company.com',
      subject: 'Meeting at 3pm',
      providerCategories: [],
    })
    expect(result.skipped).toBe(false)
  })
})

describe('preFilterEmail — auto-reply subjects', () => {
  it.each([
    'Out of office: Back next week',
    'Automatic reply: Re: your question',
    'Auto-reply: Away until Friday',
    'Away from office — returns Monday',
    'On vacation until January 10',
    'Please unsubscribe me from this list',
  ])('skips subject "%s"', (subject) => {
    const result = preFilterEmail({
      sender: 'person@company.com',
      subject,
      providerCategories: [],
    })
    expect(result.skipped).toBe(true)
    expect(result.category).toBe('awareness')
  })
})

describe('preFilterEmail — normal emails pass through', () => {
  it('returns skipped: false for a work email', () => {
    const result = preFilterEmail({
      sender: 'manager@acme.com',
      subject: 'Please review the contract by Friday',
      providerCategories: [],
    })
    expect(result.skipped).toBe(false)
    expect(result.category).toBeUndefined()
  })
})
