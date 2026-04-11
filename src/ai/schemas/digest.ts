import { z } from 'zod'

// Schema for digest generation output — AI only generates content, stats are computed from real data
export const digestSchema = z.object({
  content: z.string(),
})

export type DigestResult = z.infer<typeof digestSchema>
