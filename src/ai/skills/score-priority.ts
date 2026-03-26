import { generateObject } from 'ai'
import { getModel, getFallbackModel } from '../provider'
import { prioritySchema, type PriorityResult } from '../schemas'

// ============================================================
// Skill: Priority Scoring
// Scores a task on urgency and impact dimensions
// ============================================================

const SYSTEM_PROMPT = `Score the task on urgency and impact.

Urgency (1-5):
5=Due today/overdue/ASAP 4=Within 2 days/blocking others 3=This week 2=Next week 1=No deadline

Impact (1-5):
5=Key client/revenue at risk 4=Project milestone/multiple people waiting 3=Standard work task 2=Internal/low visibility 1=Nice-to-have

combinedScore = urgency × impact`

export interface ScorePriorityInput {
  title: string
  summary: string
  actionItems: string[]
  sender: string
  currentDate: string
}

export async function scorePriority(input: ScorePriorityInput): Promise<PriorityResult> {
  const prompt = `Task: ${input.title}
Summary: ${input.summary}
Action items: ${input.actionItems.join('; ')}
Sender: ${input.sender}
Current date: ${input.currentDate}`

  try {
    const { object } = await generateObject({
      model: getModel('fast'),
      schema: prioritySchema,
      system: SYSTEM_PROMPT,
      prompt,
    })
    return object
  } catch (error) {
    console.warn('Priority scoring primary model failed, trying fallback:', error)
    const { object } = await generateObject({
      model: getFallbackModel('fast'),
      schema: prioritySchema,
      system: SYSTEM_PROMPT,
      prompt,
    })
    return object
  }
}
