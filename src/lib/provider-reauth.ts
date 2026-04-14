import { prisma } from '@/lib/prisma'

export type EmailProviderName = 'gmail' | 'outlook'
export type ProviderReauthReason =
  | 'access_token_invalid'
  | 'invalid_grant'
  | 'missing_refresh_token'
  | 'refresh_failed'
  | 'revoked'

export async function markProviderReauthRequired(
  userId: string,
  provider: EmailProviderName,
  reason: ProviderReauthReason,
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      emailProviderReauthRequired: true,
      emailProviderReauthReason: reason,
      emailProviderReauthAt: new Date(),
      emailProviderReauthProvider: provider,
    },
  })
}

export async function clearProviderReauthRequired(userId: string, provider: EmailProviderName) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      emailProviderReauthRequired: false,
      emailProviderReauthReason: null,
      emailProviderReauthAt: null,
      emailProviderReauthProvider: provider,
    },
  })
}
