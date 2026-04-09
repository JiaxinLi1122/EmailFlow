import { z } from 'zod'

// ============================================================
// Schema: Thread Memory Update
// Output of the update-thread-memory skill
// ============================================================

export const threadMemoryUpdateSchema = z.object({
  title: z
    .string()
    .max(120)
    .describe('Cleaned, specific event/matter title (e.g. "Job application at Acme Corp", not "Email thread")'),
  topic: z.enum([
    'meeting',
    'invoice',
    'project_update',
    'support',
    'application',
    'approval',
    'deadline',
    'other',
  ]),
  summary: z
    .string()
    .max(300)
    .describe('One sentence describing the current state of this thread — what it is about and where it stands'),
  status: z.enum(['open', 'pending', 'waiting_reply', 'completed']),
  nextAction: z
    .string()
    .max(200)
    .nullable()
    .describe('The most important concrete next step the user needs to take, or null if no action needed'),
  needsFullAnalysis: z
    .boolean()
    .describe(
      'True if the email body preview is too short or truncated to understand required action items or deadlines'
    ),
})

export type ThreadMemoryUpdateResult = z.infer<typeof threadMemoryUpdateSchema>
