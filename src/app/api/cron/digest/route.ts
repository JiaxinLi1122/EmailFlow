export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createDailyDigest } from '@/workflows/digest-pipeline'

// ============================================================
// Cron: Daily Digest Generator
// Runs every hour via Vercel Cron.
// For each Gmail-connected user, fires when it's 20:xx in their timezone.
//
// Protected by CRON_SECRET — Vercel sends it as Authorization header.
// To trigger manually: GET /api/cron/digest
//   with header: Authorization: Bearer <CRON_SECRET>
// ============================================================

function localHour(timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).formatToParts(new Date())
    const hourPart = parts.find(p => p.type === 'hour')
    return hourPart ? parseInt(hourPart.value, 10) : -1
  } catch {
    return -1
  }
}

export async function GET(req: NextRequest) {
  // Verify secret
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find all users with Gmail connected
  const users = await prisma.user.findMany({
    where: { gmailConnected: true },
    select: { id: true, email: true, timezone: true },
  })

  const results: { userId: string; status: string; reason?: string; error?: string }[] = []

  for (const user of users) {
    const tz = user.timezone || 'UTC'
    const hour = localHour(tz)

    // Only generate digest when it's 20:xx in the user's timezone
    if (hour !== 20) {
      results.push({ userId: user.id, status: 'skipped', reason: `local hour is ${hour} in ${tz}` })
      continue
    }

    try {
      await createDailyDigest(user.id)
      results.push({ userId: user.id, status: 'ok' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown digest failure'
      console.error(`[cron/digest] Failed for user ${user.id}:`, message)
      results.push({ userId: user.id, status: 'error', error: message })
    }
  }

  const generated = results.filter(r => r.status === 'ok').length
  const skipped = results.filter(r => r.status === 'skipped').length
  console.log(`[cron/digest] Generated ${generated}, skipped ${skipped}/${users.length} users`)
  return NextResponse.json({ success: true, results })
}
