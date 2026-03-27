import { z } from 'zod'

// Schema for email classification output
// Vercel AI SDK validates this automatically — if the LLM returns wrong format, it retries
export const classificationSchema = z.object({
  category: z.enum(['action', 'awareness', 'ignore', 'uncertain']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  isWorkRelated: z.boolean(),
})

export type ClassificationResult = z.infer<typeof classificationSchema>
