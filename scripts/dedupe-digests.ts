import { prisma } from '../src/lib/prisma'

type DigestRow = {
  id: string
  userId: string
  period: string
  periodStart: Date
  createdAt: Date
}

// Returns "YYYY-Www" for the ISO week containing the given date (timezone-agnostic).
function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  // ISO week: shift so Monday = day 0
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const year = d.getUTCFullYear()
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

async function main() {
  const digests = (await prisma.digest.findMany({
    select: {
      id: true,
      userId: true,
      period: true,
      periodStart: true,
      createdAt: true,
    },
    orderBy: [
      { userId: 'asc' },
      { period: 'asc' },
      { periodStart: 'asc' },
      { createdAt: 'desc' },
    ],
  })) as DigestRow[]

  const keep = new Set<string>()
  const duplicates: string[] = []

  for (const digest of digests) {
    // For weekly digests, normalise to ISO week (Mon–Sun) so timezone-shifted
    // periodStart values (e.g. Apr 5 14:00 UTC vs Apr 6 00:00 UTC) are treated
    // as the same week.
    const weekKey = getISOWeekKey(digest.periodStart)
    const key = `${digest.userId}::${digest.period}::${weekKey}`
    if (keep.has(key)) {
      duplicates.push(digest.id)
      continue
    }
    keep.add(key)
  }

  if (duplicates.length === 0) {
    console.log('No duplicate digests found.')
    return
  }

  const result = await prisma.digest.deleteMany({
    where: {
      id: { in: duplicates },
    },
  })

  console.log(`Deleted ${result.count} duplicate digests.`)
}

main()
  .catch((error) => {
    console.error('Failed to dedupe digests:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
