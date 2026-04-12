import { NextResponse } from 'next/server'
import { getAuthUser, success } from '@/lib/api-helpers'
import * as projectContextRepo from '@/repositories/project-context-repo'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: true, data: [] })

    const projects = await projectContextRepo.findAllForUser(user.id)
    return success(projects)
  } catch (err) {
    console.error('[api/projects GET]', err)
    return NextResponse.json({ success: true, data: [] })
  }
}
