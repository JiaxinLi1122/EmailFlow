export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createDailyDigest } from '@/workflows/digest-pipeline'

// ============================================================
// Cron: Daily Digest Generator
// Runs at 20:00 AEST (10:00 UTC) every day via Vercel Cron.
//
// Protected by CRON_SECRET — Vercel sends it as Authorization header.
// To trigger manually: GET /api/cron/digest
//   with header: Authorization: Bearer <CRON_SECRET>
// ============================================================

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
    select: { id: true, email: true },
  })

  const results: { userId: string; status: string; error?: string }[] = []

  for (const user of users) {
    try {
      await createDailyDigest(user.id)
      results.push({ userId: user.id, status: 'ok' })
    } catch (err: any) {
      console.error(`[cron/digest] Failed for user ${user.id}:`, err.message)
      results.push({ userId: user.id, status: 'error', error: err.message })
    }
  }

  console.log(`[cron/digest] Generated ${results.filter(r => r.status === 'ok').length}/${users.length} digests`)
  return NextResponse.json({ success: true, results })
}
