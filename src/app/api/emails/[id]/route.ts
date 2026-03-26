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
