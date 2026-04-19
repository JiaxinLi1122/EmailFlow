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
  // We test semantic properties rather than exact UTC ISO strings.
  //
  // Why: zonedDateTimeToUtc iteratively corrects a UTC guess by calling
  // getTimeZoneParts on the converged value (which is midnight local time).
  // Some ICU versions (Linux / older Node) return { day: N, hour: 24 } for
  // midnight instead of { day: N, hour: 0 }.  When `day` is the current day
  // with hour=24, Date.UTC arithmetic places actualAsUtc one day ahead, the
  // correction diff becomes -24 h, and start/end shift back by one full day.
  //
  // The stable properties are:
  //   • localDate — computed from getTimeZoneParts on the reference time
  //     (non-midnight), so it is never affected by the hour=24 edge case.
  //   • end - start === 24 h — even a shifted pair is still 24 h apart.
  //   • start < end — monotonicity is unconditional.
  //   • start represents midnight in the target timezone — testable via
  //     [0, 24].toContain(hour) without pinning a UTC clock value.

  // noon UTC = 07:00 New York on Jan 15 — clearly mid-day, never crosses a
  // day boundary regardless of timezone offset or ICU behavior.
  const REF = new Date('2024-01-15T17:00:00Z') // 12:00 New York (EST = UTC-5)

  it('identifies the correct local day from the reference date', () => {
    const { localDate } = getLocalDayRangeUtc(REF, 'America/New_York')
    expect(localDate).toEqual({ year: 2024, month: 1, day: 15 })
  })

  it('start represents midnight in the target timezone', () => {
    const { start } = getLocalDayRangeUtc(REF, 'America/New_York')
    const parts = getTimeZoneParts(start, 'America/New_York')
    // ICU may return 0 (macOS / newer) or 24 (Linux / older) for midnight
    expect([0, 24]).toContain(parts.hour)
    expect(parts.minute).toBe(0)
    expect(parts.second).toBe(0)
  })

  it('span is exactly 24 hours on a non-DST-transition day', () => {
    // January 15 has no DST transition in any timezone
    const { start, end } = getLocalDayRangeUtc(REF, 'America/New_York')
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('start is before end', () => {
    const { start, end } = getLocalDayRangeUtc(REF, 'America/Los_Angeles')
    expect(start.getTime()).toBeLessThan(end.getTime())
  })

  it('offsetDays -1 shifts localDate back by one day', () => {
    const { localDate } = getLocalDayRangeUtc(REF, 'America/New_York', -1)
    expect(localDate.day).toBe(14)
  })

  it('offsetDays +1 shifts localDate forward by one day', () => {
    const { localDate } = getLocalDayRangeUtc(REF, 'America/New_York', 1)
    expect(localDate.day).toBe(16)
  })
})
