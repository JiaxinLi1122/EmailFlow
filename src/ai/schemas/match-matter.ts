import { z } from 'zod'

// ============================================================
// Schema: Matter Match Decision
// Output of the match-matter skill — conservative AI judgment
// on whether a thread belongs to an existing matter.
// ============================================================

export const matchMatterSchema = z.object({
  matterId: z
    .string()
    .nullable()
    .describe(
      'The ID of the matching matter, or null to create a new matter. Only set this if you are highly confident.'
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence that this thread belongs to the matched matter (0-1)'),
  reasoning: z.string().max(200).describe('Brief explanation of the decision'),
})

export type MatchMatterResult = z.infer<typeof matchMatterSchema>
