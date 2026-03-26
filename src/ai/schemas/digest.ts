import { z } from 'zod'

// Schema for digest generation output
export const digestSchema = z.object({
  content: z.string(),
  stats: z.object({
    actionCount: z.number().int(),
    awarenessCount: z.number().int(),
    unresolvedCount: z.number().int(),
  }),
})

export type DigestResult = z.infer<typeof digestSchema>
