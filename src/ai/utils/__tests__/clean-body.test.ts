import { describe, it, expect } from 'vitest'
import { cleanEmailBody, prepareForClassification, prepareForExtraction } from '../clean-body'

describe('cleanEmailBody', () => {
  it('preserves plain content unchanged', () => {
    const body = 'Please review the attached report.'
    expect(cleanEmailBody(body)).toBe(body)
  })

  it('removes deeply-quoted lines (>> prefix)', () => {
    const body = 'My reply\n>> This was deeply quoted\nEnd'
    expect(cleanEmailBody(body)).not.toContain('>>')
    expect(cleanEmailBody(body)).toContain('My reply')
  })

  it('removes "On ... wrote:" headers', () => {
    const body = 'My reply.\nOn Mon, Jan 1 2024, Alice wrote:\n> Original text'
    expect(cleanEmailBody(body)).not.toContain('On Mon, Jan 1 2024, Alice wrote:')
  })

  it('removes standard signature separator (-- )', () => {
    // Signature must be after 40% of content to be removed
    const body =
      'This is the main message body with enough content to clear the threshold.\n-- \nJohn Doe\nSenior Engineer'
    const result = cleanEmailBody(body)
    expect(result).not.toContain('John Doe')
    expect(result).toContain('main message body')
  })

  it('removes "Sent from my iPhone" signature', () => {
    const body =
      'Let\'s meet tomorrow, that works great for me and I\'ll be there on time.\nSent from my iPhone'
    const result = cleanEmailBody(body)
    expect(result).not.toContain('Sent from my iPhone')
    expect(result).toContain("Let's meet tomorrow")
  })

  it('collapses 3+ blank lines into 2', () => {
    const body = 'Line one\n\n\n\n\nLine two'
    expect(cleanEmailBody(body)).toBe('Line one\n\nLine two')
  })

  it('removes legal disclaimer in the bottom half', () => {
    const intro = 'This is the actual email content that is long enough.\n\n'.repeat(5)
    const disclaimer =
      'CONFIDENTIALITY NOTICE: This email and any attachments are for the exclusive use of the intended recipient.'
    const body = intro + disclaimer
    const result = cleanEmailBody(body)
    expect(result).not.toContain('CONFIDENTIALITY NOTICE')
  })
})

describe('prepareForClassification', () => {
  it('returns the body unchanged when under the limit', () => {
    const body = 'Short message'
    expect(prepareForClassification(body)).toBe('Short message')
  })

  it('truncates long bodies and appends "..."', () => {
    const body = 'x'.repeat(1000)
    const result = prepareForClassification(body, 500)
    expect(result.endsWith('...')).toBe(true)
    expect(result.length).toBe(503) // 500 chars + "..."
  })
})

describe('prepareForExtraction', () => {
  it('returns the body unchanged when under the limit', () => {
    const body = 'Short enough content'
    expect(prepareForExtraction(body)).toBe('Short enough content')
  })

  it('keeps both beginning and end of a long body', () => {
    const body = 'START_MARKER' + 'x'.repeat(3000) + 'END_MARKER'
    const result = prepareForExtraction(body, 2000)
    expect(result).toContain('START_MARKER')
    expect(result).toContain('END_MARKER')
    expect(result).toContain('[...]')
  })

  it('result is within the length limit', () => {
    const body = 'a'.repeat(5000)
    const result = prepareForExtraction(body, 2000)
    // Allow some slack for the "[...]" separator
    expect(result.length).toBeLessThanOrEqual(2100)
  })
})
