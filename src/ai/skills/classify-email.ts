import { generateObject } from 'ai'
import { getModel, getFallbackModel } from '../provider'
import { classificationSchema, type ClassificationResult } from '../schemas'

// ============================================================
// Skill: Email Classification
// Determines if an email requires action, is informational, or can be ignored
// ============================================================

const SYSTEM_PROMPT = `Classify the email into one category.

Categories:
- "action": the recipient is expected to do something, such as reply, review, confirm, approve, submit, pay, schedule, attend, or follow up
- "awareness": useful information, but no clear action is required
- "ignore": spam, promotions, newsletters, receipts, automated low-value notifications, irrelevant messages
- "uncertain": not enough information to decide confidently

Rules:
- Prefer "action" when the email contains a clear request, deliverable, question requiring a reply, deadline, meeting ask, approval ask, payment ask, or response expectation.
- If someone asks the recipient to review, confirm, submit, pay, reply, schedule, approve, or attend, classify as "action".
- Use "awareness" only when the email is truly FYI and no response or follow-up is expected.
- Use "ignore" only for irrelevant, promotional, or low-value automated messages.
- Use "uncertain" only when the content is too ambiguous to judge.

Return:
- category
- confidence
- reasoning
- isWorkRelated`

export interface ClassifyEmailInput {
  subject: string
  sender: string
  date: string
  bodyPreview: string
}

export async function classifyEmail(input: ClassifyEmailInput): Promise<ClassificationResult> {
  const prompt = `Subject: ${input.subject}
From: ${input.sender}
Date: ${input.date}
Body (preview): ${input.bodyPreview}`

  try {
    const { object } = await generateObject({
      model: getModel('fast'),
      schema: classificationSchema,
      system: SYSTEM_PROMPT,
      prompt,
    })
    return object
  } catch (error) {
    // Fallback to OpenAI if primary model fails
    console.warn('Classification primary model failed, trying fallback:', error)
    const { object } = await generateObject({
      model: getFallbackModel('fast'),
      schema: classificationSchema,
      system: SYSTEM_PROMPT,
      prompt,
    })
    return object
  }
}
