// ============================================================
// AI Module — public API
// Import from '@/ai' to use any AI capability
// ============================================================

// Skills (what the AI can do)
export {
  classifyEmail,
  extractTask,
  scorePriority,
  generateDigest,
} from './skills'

export type {
  ClassifyEmailInput,
  ExtractTaskInput,
  ScorePriorityInput,
  GenerateDigestInput,
} from './skills'

// Schemas (output format definitions)
export {
  classificationSchema,
  taskExtractionSchema,
  prioritySchema,
  digestSchema,
} from './schemas'

export type {
  ClassificationResult,
  TaskExtractionResult,
  PriorityResult,
  DigestResult,
} from './schemas'

// Provider (model configuration)
export { getModel, getFallbackModel, type ModelTier } from './provider'

// Utils (pre-processing)
export {
  preFilterEmail,
  cleanEmailBody,
  prepareForClassification,
  prepareForExtraction,
} from './utils'
export type { PreFilterInput, PreFilterResult } from './utils'
