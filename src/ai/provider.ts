import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'

// ============================================================
// AI Provider Configuration
// Change model or provider here — everything else stays the same
// ============================================================

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' })
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })

// Model tiers — pick the right cost/quality tradeoff per task
const models = {
  // Fast + cheap: classification, priority scoring
  fast: google('gemini-2.5-flash'),
  // Balanced: task extraction, digest generation
  balanced: google('gemini-2.5-flash'),
  // Best quality: complex reasoning (not used in MVP)
  powerful: google('gemini-2.5-flash'),
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
