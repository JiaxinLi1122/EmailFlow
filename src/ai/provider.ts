import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'

// ============================================================
// AI Provider Configuration
// Change model or provider here — everything else stays the same
// ============================================================

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })

// Model tiers — pick the right cost/quality tradeoff per task
const models = {
  // Fast + cheap: classification, priority scoring
  fast: anthropic('claude-haiku-4-5-20251001'),
  // Balanced: task extraction, digest generation
  balanced: anthropic('claude-sonnet-4-6-20250610'),
  // Best quality: complex reasoning (not used in MVP)
  powerful: anthropic('claude-opus-4-6-20250610'),
} as const

// Fallback models if primary provider is down
const fallbackModels = {
  fast: openai('gpt-4o-mini'),
  balanced: openai('gpt-4o'),
  powerful: openai('gpt-4o'),
} as const

export type ModelTier = keyof typeof models

export function getModel(tier: ModelTier) {
  return models[tier]
}

export function getFallbackModel(tier: ModelTier) {
  return fallbackModels[tier]
}
