export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAuthUser, success, error } from '@/lib/api-helpers'
import { createDailyDigest } from '@/services/digest-service'
import * as digestRepo from '@/repositories/digest-repo'

const EMPTY_LIST = { success: true, data: [], meta: { page: 1, totalPages: 0, totalCount: 0 } }

// GET /api/digest — get latest digests
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json(EMPTY_LIST)

    const url = req.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')

    const { digests, total } = await digestRepo.findDigestsPaginated(user.id, { page, limit })

    return success(digests, {
      page,
      totalPages: Math.ceil(total / limit),
      totalCount: total,
    })
  } catch (err) {
    console.error('[api/digest GET]', err)
    return NextResponse.json(EMPTY_LIST)
  }
}

// POST /api/digest — generate a new digest
export async function POST() {
  try {
    const user = await getAuthUser()
    if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

    const digest = await createDailyDigest(user.id)
    return success(digest)
  } catch (err: any) {
    console.error('[api/digest POST]', err)
    return error('DIGEST_FAILED', err.message || 'Failed to generate digest', 500)
  }
}
