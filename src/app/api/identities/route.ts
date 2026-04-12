import { NextResponse } from 'next/server'
import { getAuthUser, success } from '@/lib/api-helpers'
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
