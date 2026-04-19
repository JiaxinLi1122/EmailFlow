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
    // 15:00 UTC → 00:00 next day Tokyo time
    const date = new Date('2024-06-15T15:00:00Z')
    expect(getLocalHour(date, 'Asia/Tokyo')).toBe(0)
  })
})

describe('getLocalDayRangeUtc', () => {
  it('returns full UTC day boundaries for a UTC reference', () => {
    const date = new Date('2024-01-15T12:00:00Z')
    const { start, end, localDate } = getLocalDayRangeUtc(date, 'UTC')

    expect(start.toISOString()).toBe('2024-01-15T00:00:00.000Z')
    expect(end.toISOString()).toBe('2024-01-16T00:00:00.000Z')
    expect(localDate).toEqual({ year: 2024, month: 1, day: 15 })
  })

  it('offsets by -1 day to get yesterday', () => {
    const date = new Date('2024-01-15T12:00:00Z')
    const { localDate } = getLocalDayRangeUtc(date, 'UTC', -1)
    expect(localDate.day).toBe(14)
  })

  it('offsets by +1 day to get tomorrow', () => {
    const date = new Date('2024-01-15T12:00:00Z')
    const { localDate } = getLocalDayRangeUtc(date, 'UTC', 1)
    expect(localDate.day).toBe(16)
  })

  it('start is always before end', () => {
    const date = new Date('2024-06-20T10:00:00Z')
    const { start, end } = getLocalDayRangeUtc(date, 'America/Los_Angeles')
    expect(start.getTime()).toBeLessThan(end.getTime())
  })
})
