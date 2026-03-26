import { generateObject } from 'ai'
import { getModel, getFallbackModel } from '../provider'
import { digestSchema, type DigestResult } from '../schemas'

// ============================================================
// Skill: Digest Generation
// Creates a daily/weekly summary of email activity and tasks
// ============================================================

const SYSTEM_PROMPT = `Create a concise daily email summary in markdown with bullet points.

Sections:
1. Action Required — tasks by priority
2. Awareness — informational emails
3. Needs Review — uncertain items
4. Stats — counts by category`

export interface GenerateDigestInput {
  tasks: {
    title: string
    summary: string
    priorityScore: number
    status: string
    deadline: string | null
  }[]
  awarenessEmails: { subject: string; sender: string }[]
  uncertainEmails: { subject: string; sender: string }[]
  date: string
}

export async function generateDigest(input: GenerateDigestInput): Promise<DigestResult> {
  const prompt = `Date: ${input.date}

Action tasks:
${input.tasks.map((t) => `- [Priority ${t.priorityScore}] ${t.title} — ${t.summary}${t.deadline ? ` (Due: ${t.deadline})` : ''}`).join('\n')}

Awareness emails:
${input.awarenessEmails.map((e) => `- ${e.subject} from ${e.sender}`).join('\n') || '(none)'}

Uncertain/needs review:
${input.uncertainEmails.map((e) => `- ${e.subject} from ${e.sender}`).join('\n') || '(none)'}`

  try {
    const { object } = await generateObject({
      model: getModel('balanced'),
      schema: digestSchema,
      system: SYSTEM_PROMPT,
      prompt,
    })
    return object
  } catch (error) {
    console.warn('Digest generation primary model failed, trying fallback:', error)
    const { object } = await generateObject({
      model: getFallbackModel('balanced'),
      schema: digestSchema,
      system: SYSTEM_PROMPT,
      prompt,
    })
    return object
  }
}
