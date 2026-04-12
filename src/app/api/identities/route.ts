import { NextResponse } from 'next/server'
import { getAuthUser, success, error } from '@/lib/api-helpers'
import * as identityRepo from '@/repositories/identity-repo'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: true, data: [] })

    const identities = await identityRepo.findAllForUser(user.id)
    return success(identities)
  } catch (err) {
    console.error('[api/identities GET]', err)
    return NextResponse.json({ success: true, data: [] })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser()
    if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

    const { name, description } = await req.json()
    if (!name?.trim()) return error('BAD_REQUEST', 'Name is required', 400)

    const identity = await identityRepo.createSuggestion(user.id, {
      name: name.trim(),
      description: description?.trim() || null,
    })
    return success(identity)
  } catch (err) {
    console.error('[api/identities POST]', err)
    return error('INTERNAL', 'Failed to create identity', 500)
  }
}
