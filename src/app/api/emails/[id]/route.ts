export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { errorFromException, getAuthUser, success, error } from '@/lib/api-helpers'
import * as emailRepo from '@/repositories/email-repo'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    const { id } = await params
    const email = await emailRepo.findEmailById(user.id, id)
    if (!email) return error('NOT_FOUND', 'Email not found', 404)
    return success(email)
  } catch (err) {
    return errorFromException(err, 'INTERNAL_ERROR', 'Failed to load email', 500)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    const { id } = await params
    const body = await req.json()

    const existing = await emailRepo.findEmailById(user.id, id)
    if (!existing) return error('NOT_FOUND', 'Email not found', 404)

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
  } catch (err) {
    return errorFromException(err, 'INTERNAL_ERROR', 'Failed to update email', 500)
  }
}
