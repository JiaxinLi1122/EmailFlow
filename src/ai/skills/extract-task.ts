import { generateObject } from 'ai'
import { getModel, getFallbackModel } from '../provider'
import { taskExtractionSchema, type TaskExtractionResult } from '../schemas'

// ============================================================
// Skill: Task Extraction
// Extracts structured task from an email that requires action
// ============================================================

const SYSTEM_PROMPT = `Extract a task from this action email.

Rules:
- Title: start with a verb, max 80 chars.
- Summary: what and why, max 200 chars.
- Action items: concrete steps the user should take.
- Deadlines: extract explicit ones as stated. If none, infer from urgency cues (ASAP, this week, before Friday). Set deadlineConfidence accordingly.
- NEVER fabricate info not in the email.
- Dates in YYYY-MM-DD format.`

export interface ExtractTaskInput {
  subject: string
  sender: string
  date: string
  bodyPreview: string
  body?: string
  threadContext?: {
    sender: string
    date: string
    bodyPreview: string
  }[]
}

export async function extractTask(input: ExtractTaskInput): Promise<TaskExtractionResult> {
  let prompt = `Subject: ${input.subject}
From: ${input.sender}
Date: ${input.date}
Body: ${input.body || input.bodyPreview}`

  if (input.threadContext && input.threadContext.length > 0) {
    prompt += `\n\nThread context (recent messages):\n`
    for (const msg of input.threadContext.slice(-3)) {
      prompt += `From: ${msg.sender} | Date: ${msg.date}\n${msg.bodyPreview}\n---\n`
    }
  }

  try {
    const { object } = await generateObject({
      model: getModel('balanced'),
      schema: taskExtractionSchema,
      system: SYSTEM_PROMPT,
      prompt,
    })
    return object
  } catch (error) {
    console.warn('Task extraction primary model failed, trying fallback:', error)
    const { object } = await generateObject({
      model: getFallbackModel('balanced'),
      schema: taskExtractionSchema,
      system: SYSTEM_PROMPT,
      prompt,
    })
    return object
  }
}
