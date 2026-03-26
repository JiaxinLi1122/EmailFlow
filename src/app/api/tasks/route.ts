export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAuthUser, success } from '@/lib/api-helpers'
import * as taskRepo from '@/repositories/task-repo'

const EMPTY_LIST = { success: true, data: [], meta: { page: 1, totalPages: 0, totalCount: 0 } }

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json(EMPTY_LIST)

    const url = req.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const status = url.searchParams.get('status') || undefined
    const sort = (url.searchParams.get('sort') || 'priority') as 'priority' | 'date' | 'deadline' | 'title'

    const { tasks, total } = await taskRepo.findTasksPaginated(user.id, {
      page,
      limit,
      status,
      sort,
    })

    return success(tasks, {
      page,
      totalPages: Math.ceil(total / limit),
      totalCount: total,
    })
  } catch (err) {
    console.error('[api/tasks GET]', err)
    return NextResponse.json(EMPTY_LIST)
  }
}
