import { errorFromException, getAuthUser, success, error } from '@/lib/api-helpers'
import * as projectContextRepo from '@/repositories/project-context-repo'

export async function GET() {
  try {
    const user = await getAuthUser()

    const projects = await projectContextRepo.findAllForUser(user.id)
    return success(projects)
  } catch (err) {
    console.error('[api/projects GET]', err)
    return errorFromException(err, 'INTERNAL', 'Failed to load projects', 500)
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser()

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
    return errorFromException(err, 'INTERNAL', 'Failed to create project', 500)
  }
}
