import { NextResponse } from 'next/server'
import { requireCurrentUser } from '@/lib/auth-session'
import { AppError, isAppError } from '@/lib/app-errors'
import type { ApiResponse } from '@/types'

export function success<T>(data: T, meta?: ApiResponse['meta']): NextResponse {
  return NextResponse.json({ success: true, data, meta })
}

export function error(code: string, message: string, status: number = 400): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

export async function getAuthUser() {
  return requireCurrentUser()
}

export function errorFromException(
  err: unknown,
  fallbackCode: string = 'SYNC_FAILED',
  fallbackMessage: string = 'Request failed',
  fallbackStatus: number = 500,
) {
  if (isAppError(err)) {
    return error(err.code, err.message, err.status)
  }

  if (err instanceof AppError) {
    return error(err.code, err.message, err.status)
  }

  return error(fallbackCode, fallbackMessage, fallbackStatus)
}
