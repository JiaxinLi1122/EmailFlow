import { prisma } from '../src/lib/prisma'

type DigestRow = {
  id: string
  userId: string
  period: string
  periodStart: Date
  createdAt: Date
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
    const key = `${digest.userId}::${digest.period}::${digest.periodStart.toISOString()}`
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
