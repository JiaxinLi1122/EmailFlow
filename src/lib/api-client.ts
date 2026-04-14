'use client'

export class ApiClientError extends Error {
  readonly code?: string
  readonly status: number

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
  }
}

export const SESSION_FAILURE_CODES = new Set([
  'SESSION_EXPIRED',
  'SESSION_REVOKED',
  'SESSION_INACTIVE_EXPIRED',
])

export function isSessionFailureCode(code?: string | null) {
  return Boolean(code && SESSION_FAILURE_CODES.has(code))
}

export async function readApiClientError(response: Response): Promise<ApiClientError> {
  let payload: unknown = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  const wrapped = payload as
    | { error?: { code?: string; message?: string } | string; message?: string }
    | null
    | undefined
  const errorCode = typeof wrapped?.error === 'object' ? wrapped.error?.code : undefined
  const errorMessage =
    (typeof wrapped?.error === 'object' && wrapped.error?.message) ||
    (typeof wrapped?.error === 'string' ? wrapped.error : undefined) ||
    wrapped?.message ||
    'Request failed'

  return new ApiClientError(errorMessage, response.status, errorCode)
}
