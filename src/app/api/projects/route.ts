import { NextResponse } from 'next/server'
import { getAuthUser, success, error } from '@/lib/api-helpers'
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

export async function POST(req: Request) {
  try {
    const user = await getAuthUser()
    if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

    const { name, identityId, description } = await req.json()
    if (!name?.trim()) return error('BAD_REQUEST', 'Name is required', 400)

    const project = await projectContextRepo.createSuggestion(user.id, {
      name: name.trim(),
      identityId: identityId || null,
      description: description?.trim() || null,
    })
    return success(project)
  } catch (err) {
    console.error('[api/projects POST]', err)
    return error('INTERNAL', 'Failed to create project', 500)
  }
}
