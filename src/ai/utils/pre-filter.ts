// ============================================================
// Rule-based Pre-filter
// Skips AI for emails that can be classified by rules alone.
// Only catches obvious cases — anything uncertain goes to AI.
//
// Provider-agnostic: uses NormalizedCategory from the provider
// interface, so Gmail, Outlook, or any future provider all work.
// ============================================================

import type { NormalizedCategory } from '@/integrations/email-provider'

export interface PreFilterInput {
  sender: string
  subject: string
  /** Normalized categories from the email provider (spam, promotions, etc.) */
  providerCategories: NormalizedCategory[]
}

export interface PreFilterResult {
  /** true = skip AI, use the rule-based classification */
  skipped: boolean
  category?: 'ignore' | 'awareness'
  confidence?: number
  reasoning?: string
  isWorkRelated?: boolean
}

// Patterns that indicate auto-generated / no-reply emails
const NOREPLY_PATTERNS = [
  /^noreply@/i,
  /^no-reply@/i,
  /^donotreply@/i,
  /^do-not-reply@/i,
  /^mailer-daemon@/i,
  /^postmaster@/i,
]

// Normalized categories that should skip AI
const SKIP_CATEGORIES = new Set<NormalizedCategory>([
  'spam',
  'promotions',
  'social',
  'updates',
])

// Subject patterns for auto-replies
const AUTO_REPLY_PATTERNS = [
  /^(re:\s*)?out of office/i,
  /^(re:\s*)?automatic reply/i,
  /^(re:\s*)?auto-reply/i,
  /^(re:\s*)?away from office/i,
  /^(re:\s*)?on vacation/i,
  /unsubscribe/i,
]

export function preFilterEmail(input: PreFilterInput): PreFilterResult {
  const senderEmail = input.sender.match(/<([^>]+)>/)?.[1] || input.sender

  // Rule 1: Provider already classified as spam/promotions/social/updates
  // Works for Gmail, Outlook, or any provider that maps to NormalizedCategory
  for (const category of input.providerCategories) {
    if (SKIP_CATEGORIES.has(category)) {
      return {
        skipped: true,
        category: 'ignore',
        confidence: 0.95,
        reasoning: `Provider category: ${category}`,
        isWorkRelated: false,
      }
    }
  }

  // Rule 2: No-reply sender addresses (universal across all providers)
  if (NOREPLY_PATTERNS.some((p) => p.test(senderEmail))) {
    return {
      skipped: true,
      category: 'awareness',
      confidence: 0.85,
      reasoning: 'Automated sender (noreply)',
      isWorkRelated: false,
    }
  }

  // Rule 3: Auto-reply / out of office (universal across all providers)
  if (AUTO_REPLY_PATTERNS.some((p) => p.test(input.subject))) {
    return {
      skipped: true,
      category: 'awareness',
      confidence: 0.90,
      reasoning: 'Auto-reply detected from subject',
      isWorkRelated: false,
    }
  }

  // No rule matched — let AI handle it
  return { skipped: false }
}
