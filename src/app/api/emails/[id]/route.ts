export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { getAuthUser, success, error } from '@/lib/api-helpers'
import * as emailRepo from '@/repositories/email-repo'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  const { id } = await params

  const email = await emailRepo.findEmailById(user.id, id)
  if (!email) return error('NOT_FOUND', 'Email not found', 404)
  return success(email)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  const { id } = await params
  const body = await req.json()

  // Verify ownership
  const existing = await emailRepo.findEmailById(user.id, id)
  if (!existing) return error('NOT_FOUND', 'Email not found', 404)

  // Only allow classification update for now
  if (body.classification) {
    const updated = await emailRepo.updateClassification(id, {
      category: body.classification,
      confidence: existing.classConfidence || 0.5,
      reasoning: `Manually updated to ${body.classification}`,
      isWorkRelated: body.classification !== 'ignore',
    })
    return success(updated)
  }

  return error('BAD_REQUEST', 'No valid fields to update', 400)
}
