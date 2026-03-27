import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-session'
import type { ApiResponse } from '@/types'

export function success<T>(data: T, meta?: ApiResponse['meta']): NextResponse {
  return NextResponse.json({ success: true, data, meta })
}

export function error(code: string, message: string, status: number = 400): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

export async function getAuthUser() {
  return getCurrentUser()
}
