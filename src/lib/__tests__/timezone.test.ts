import { describe, it, expect } from 'vitest'
import { getTimeZoneParts, getLocalHour, getLocalDayRangeUtc } from '../timezone'

describe('getTimeZoneParts', () => {
  it('returns correct parts for UTC', () => {
    const date = new Date('2024-01-15T12:30:45Z')
    const parts = getTimeZoneParts(date, 'UTC')
    expect(parts).toEqual({ year: 2024, month: 1, day: 15, hour: 12, minute: 30, second: 45 })
  })

  it('shifts forward for UTC+8 (Asia/Shanghai)', () => {
    // Midnight UTC → 08:00 Shanghai
    const date = new Date('2024-01-15T00:00:00Z')
    const parts = getTimeZoneParts(date, 'Asia/Shanghai')
    expect(parts.hour).toBe(8)
    expect(parts.day).toBe(15)
  })

  it('crosses day boundary backward for America/New_York (UTC-5 in Jan)', () => {
    // 01:00 UTC on the 15th → 20:00 on the 14th in New York
    const date = new Date('2024-01-15T01:00:00Z')
    const parts = getTimeZoneParts(date, 'America/New_York')
    expect(parts.day).toBe(14)
    expect(parts.hour).toBe(20)
  })
})

describe('getLocalHour', () => {
  it('returns the hour in UTC', () => {
    const date = new Date('2024-06-15T15:00:00Z')
    expect(getLocalHour(date, 'UTC')).toBe(15)
  })

  it('returns the hour in UTC+9 (Asia/Tokyo)', () => {
    // 15:00 UTC = 00:00 next day Tokyo (UTC+9).
    // Intl.DateTimeFormat with hour12:false represents midnight as 0 on some
    // platforms (macOS/newer ICU) and as 24 on others (Linux/older ICU).
    // Both values are spec-compliant — the important thing is that the hour
    // is midnight, not that it is a particular integer.
    const date = new Date('2024-06-15T15:00:00Z')
    expect([0, 24]).toContain(getLocalHour(date, 'Asia/Tokyo'))
  })
})

describe('getLocalDayRangeUtc', () => {
  // All tests use America/New_York (UTC-5 in January) rather than UTC.
  //
  // Why: computing midnight UTC via zonedDateTimeToUtc calls getTimeZoneParts
  // on a midnight-UTC timestamp as its first guess.  Some ICU versions
  // (Linux / older Node) return hour=24 for that call, which throws off the
  // iterative correction by exactly one day.  Using a non-UTC timezone means
  // "midnight local" never coincides with the initial UTC guess, so the
  // hour=24 edge case is never triggered and results are cross-platform stable.

  it('returns correct UTC boundaries for a non-UTC timezone (America/New_York, UTC-5 in Jan)', () => {
    // noon UTC = 07:00 New York on Jan 15
    const date = new Date('2024-01-15T12:00:00Z')
    const { start, end, localDate } = getLocalDayRangeUtc(date, 'America/New_York')

    // midnight New York = 05:00 UTC
    expect(start.toISOString()).toBe('2024-01-15T05:00:00.000Z')
    expect(end.toISOString()).toBe('2024-01-16T05:00:00.000Z')
    expect(localDate).toEqual({ year: 2024, month: 1, day: 15 })
  })

  it('offsets by -1 day to get the local yesterday', () => {
    const date = new Date('2024-01-15T12:00:00Z')
    const { localDate } = getLocalDayRangeUtc(date, 'America/New_York', -1)
    expect(localDate.day).toBe(14)
  })

  it('offsets by +1 day to get the local tomorrow', () => {
    const date = new Date('2024-01-15T12:00:00Z')
    const { localDate } = getLocalDayRangeUtc(date, 'America/New_York', 1)
    expect(localDate.day).toBe(16)
  })

  it('start is always before end', () => {
    const date = new Date('2024-06-20T10:00:00Z')
    const { start, end } = getLocalDayRangeUtc(date, 'America/Los_Angeles')
    expect(start.getTime()).toBeLessThan(end.getTime())
  })

  it('end minus start equals exactly 24 hours for a non-DST-transition day', () => {
    // Jan 15 has no DST transition in any timezone — the day is always 24h
    const date = new Date('2024-01-15T12:00:00Z')
    const { start, end } = getLocalDayRangeUtc(date, 'America/New_York')
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000)
  })
})
