import { z } from 'zod'

// Schema for task extraction output
export const taskExtractionSchema = z.object({
  title: z.string().max(80),
  summary: z.string().max(200),
  actionItems: z.array(z.string()),
  explicitDeadline: z.string().nullable(),
  inferredDeadline: z.string().nullable(),
  deadlineConfidence: z.number().min(0).max(1),
})

export type TaskExtractionResult = z.infer<typeof taskExtractionSchema>
