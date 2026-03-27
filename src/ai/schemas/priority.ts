import { z } from 'zod'

// Schema for priority scoring output
export const prioritySchema = z.object({
  urgency: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  combinedScore: z.number().int(),
  reasoning: z.string(),
})

export type PriorityResult = z.infer<typeof prioritySchema>
