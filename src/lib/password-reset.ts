import crypto from 'crypto'

/** SHA-256 of the plaintext token. Never store or return the plaintext. */
export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** Token TTL in milliseconds. Defaults to 60 minutes. */
export function getTokenTtlMs(): number {
  const minutes = parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? '60', 10)
  return (isNaN(minutes) || minutes <= 0 ? 60 : minutes) * 60 * 1000
}

/** Minimum seconds between reset requests for the same user. */
export const RATE_LIMIT_SECONDS = 60
