// ============================================================
// Core type definitions for EmailFlow AI
// ============================================================

// --- Classification ---
export type EmailCategory = 'action' | 'awareness' | 'ignore' | 'uncertain'

export interface ClassificationResult {
  category: EmailCategory
  confidence: number
  reasoning: string
  isWorkRelated: boolean
}

// --- Task Extraction ---
export interface TaskExtractionResult {
  title: string
  summary: string
  actionItems: string[]
  explicitDeadline: string | null
  inferredDeadline: string | null
  deadlineConfidence: number
}

// --- Priority ---
export type UrgencyScore = 1 | 2 | 3 | 4 | 5
export type ImpactScore = 1 | 2 | 3 | 4 | 5

export interface PriorityResult {
  urgency: UrgencyScore
  impact: ImpactScore
  combinedScore: number
  reasoning: string
}

export type PriorityBand = 'critical' | 'high' | 'medium' | 'low'

export function getPriorityBand(score: number): PriorityBand {
  if (score >= 20) return 'critical'
  if (score >= 12) return 'high'
  if (score >= 6) return 'medium'
  return 'low'
}

export function getPriorityColor(band: PriorityBand): string {
  switch (band) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200'
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'low': return 'text-gray-500 bg-gray-50 border-gray-200'
  }
}

export function getPriorityLabel(band: PriorityBand): string {
  switch (band) {
    case 'critical': return 'Critical'
    case 'high': return 'High'
    case 'medium': return 'Medium'
    case 'low': return 'Low'
  }
}

// --- Digest ---
export interface DigestResult {
  content: string
  stats: {
    actionCount: number
    awarenessCount: number
    unresolvedCount: number
  }
}

// --- API Response ---
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  meta?: {
    page: number
    totalPages: number
    totalCount: number
  }
}

// --- Email input for LLM ---
export interface EmailInput {
  subject: string
  sender: string
  date: string
  bodyPreview: string
  body?: string
}

export interface ThreadContext {
  messages: {
    sender: string
    date: string
    bodyPreview: string
  }[]
}

// --- Task status ---
export type TaskStatus = 'pending' | 'confirmed' | 'completed' | 'dismissed'
