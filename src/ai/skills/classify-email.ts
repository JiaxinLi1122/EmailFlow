import { generateObject } from 'ai'
import { getModel, getFallbackModel } from '../provider'
import { classificationSchema, type ClassificationResult } from '../schemas'

// ============================================================
// Skill: Email Classification
// Determines if an email requires action, is informational, or can be ignored
// ============================================================

const SYSTEM_PROMPT = `Classify the email into one category.

Categories:
- "action": asks recipient to DO something (reply, review, attend, decide, submit)
- "awareness": useful info, no action needed (status updates, FYI, newsletters)
- "ignore": irrelevant (spam, automated notifications, promotions)
- "uncertain": cannot confidently classify (use when confidence < 0.6)

Rules:
- When in doubt between action and awareness, prefer uncertain.
- Promotions are NOT action unless they contain a genuine deadline.
- Emails from clients/collaborators are more likely action.`

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
