import { errorFromException, getAuthUser, success, error } from '@/lib/api-helpers'
import * as identityRepo from '@/repositories/identity-repo'

export async function GET() {
  try {
    const user = await getAuthUser()

    const identities = await identityRepo.findAllForUser(user.id)
    return success(identities)
  } catch (err) {
    console.error('[api/identities GET]', err)
    return errorFromException(err, 'INTERNAL', 'Failed to load identities', 500)
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser()

    const { name, description } = await req.json()
    if (!name?.trim()) return error('BAD_REQUEST', 'Name is required', 400)

    const identity = await identityRepo.createSuggestion(user.id, {
      name: name.trim(),
      description: description?.trim() || null,
    })
    return success(identity)
  } catch (err) {
    console.error('[api/identities POST]', err)
    return errorFromException(err, 'INTERNAL', 'Failed to create identity', 500)
  }
}
