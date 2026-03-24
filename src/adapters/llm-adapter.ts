import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type {
  EmailInput,
  ThreadContext,
  ClassificationResult,
  TaskExtractionResult,
  PriorityResult,
  DigestResult,
} from '@/types'

// ============================================================
// LLM Adapter — unified interface for Claude + OpenAI
// ============================================================

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })

type Provider = 'claude' | 'openai'

async function callLLM(
  prompt: string,
  system: string,
  options: { model?: 'small' | 'medium' | 'large'; provider?: Provider } = {}
): Promise<string> {
  const { model = 'small', provider = 'claude' } = options

  const modelMap = {
    claude: {
      small: 'claude-haiku-4-5-20251001',
      medium: 'claude-sonnet-4-6-20250610',
      large: 'claude-opus-4-6-20250610',
    },
    openai: {
      small: 'gpt-4o-mini',
      medium: 'gpt-4o',
      large: 'gpt-4o',
    },
  }

  try {
    if (provider === 'claude') {
      const response = await anthropic.messages.create({
        model: modelMap.claude[model],
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = response.content[0]
      return block.type === 'text' ? block.text : ''
    } else {
      const response = await openai.chat.completions.create({
        model: modelMap.openai[model],
        max_tokens: 1024,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      })
      return response.choices[0]?.message?.content || ''
    }
  } catch (error) {
    // Fallback to OpenAI if Claude fails
    if (provider === 'claude') {
      console.warn('Claude API failed, falling back to OpenAI:', error)
      return callLLM(prompt, system, { model, provider: 'openai' })
    }
    throw error
  }
}

function parseJSON<T>(text: string): T {
  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim()
  return JSON.parse(jsonStr) as T
}

// ============================================================
// Public API
// ============================================================

export async function classifyEmail(email: EmailInput): Promise<ClassificationResult> {
  const system = `You are an email classification assistant. Classify the email into exactly one category.

Categories:
- "action": The email explicitly or implicitly asks the recipient to DO something (reply, complete a task, attend a meeting, make a decision, submit something).
- "awareness": The email contains useful information but requires no action (status updates, FYI messages, newsletters with relevant content).
- "ignore": The email is irrelevant to work (marketing spam, automated notifications with no actionable content, promotions).
- "uncertain": You cannot confidently determine the category. Use this when confidence would be below 0.6.

Rules:
- When in doubt between "action" and "awareness", prefer "uncertain".
- Never classify promotional emails as "action" unless they contain a genuine deadline.
- Consider the sender: emails from known clients/collaborators are more likely to be "action".

Respond with JSON ONLY, no other text:
{"category": "action|awareness|ignore|uncertain", "confidence": 0.0-1.0, "reasoning": "one line explanation", "isWorkRelated": true|false}`

  const prompt = `Subject: ${email.subject}
From: ${email.sender}
Date: ${email.date}
Body (preview): ${email.bodyPreview}`

  const result = await callLLM(prompt, system, { model: 'small' })
  return parseJSON<ClassificationResult>(result)
}

export async function extractTask(
  email: EmailInput,
  thread?: ThreadContext
): Promise<TaskExtractionResult> {
  const system = `You are a task extraction assistant. Given a work-related email that requires action, extract a structured task.

Rules:
- Title: concise action phrase (max 80 chars). Start with a verb.
- Summary: what needs to be done and why (max 200 chars).
- Action items: specific steps the user should take. Be concrete.
- Deadline: extract explicit deadlines exactly as stated. If no explicit deadline, infer a reasonable one based on urgency cues (today, ASAP, this week, before Friday, etc.). Set deadlineConfidence accordingly.
- NEVER fabricate information not present in the email.
- Use ISO date format YYYY-MM-DD for all dates.

Respond with JSON ONLY:
{"title": "...", "summary": "...", "actionItems": ["..."], "explicitDeadline": "YYYY-MM-DD or null", "inferredDeadline": "YYYY-MM-DD or null", "deadlineConfidence": 0.0-1.0}`

  let prompt = `Subject: ${email.subject}
From: ${email.sender}
Date: ${email.date}
Body: ${email.body || email.bodyPreview}`

  if (thread && thread.messages.length > 0) {
    prompt += `\n\nThread context (recent messages):\n`
    for (const msg of thread.messages.slice(-3)) {
      prompt += `From: ${msg.sender} | Date: ${msg.date}\n${msg.bodyPreview}\n---\n`
    }
  }

  const result = await callLLM(prompt, system, { model: 'medium' })
  return parseJSON<TaskExtractionResult>(result)
}

export async function scorePriority(
  task: { title: string; summary: string; actionItems: string[] },
  senderInfo: string,
  currentDate: string
): Promise<PriorityResult> {
  const system = `You are a priority scoring assistant. Score the task on two dimensions.

Urgency (1-5):
5 = Due today or overdue; "ASAP", "urgent", "immediately"
4 = Due within 2 days; meeting-dependent; blocking others
3 = Due this week; moderate time pressure
2 = Due next week; flexible timeline
1 = No deadline; informational follow-up

Impact (1-5):
5 = Key client/stakeholder; revenue at risk; contractual obligation
4 = Important project milestone; multiple people waiting
3 = Standard work task; affects one project
2 = Internal request; low external visibility
1 = Nice-to-have; no consequences if delayed

Respond with JSON ONLY:
{"urgency": 1-5, "impact": 1-5, "combinedScore": urgency*impact, "reasoning": "one line"}`

  const prompt = `Task: ${task.title}
Summary: ${task.summary}
Action items: ${task.actionItems.join('; ')}
Sender: ${senderInfo}
Current date: ${currentDate}`

  const result = await callLLM(prompt, system, { model: 'small' })
  return parseJSON<PriorityResult>(result)
}

export async function generateDigest(
  tasks: { title: string; summary: string; priorityScore: number; status: string; deadline: string | null }[],
  awarenessEmails: { subject: string; sender: string }[],
  uncertainEmails: { subject: string; sender: string }[],
  date: string
): Promise<DigestResult> {
  const system = `You are a digest generation assistant. Create a clear, scannable daily summary.

Format the digest in markdown with these sections:
1. Action Required — list tasks needing attention, sorted by priority
2. Awareness — brief mentions of informational emails
3. Needs Your Review — items the AI wasn't sure about
4. Stats — email counts by category

Keep it concise and actionable. Use bullet points.

Respond with JSON ONLY:
{"content": "markdown string", "stats": {"actionCount": N, "awarenessCount": N, "unresolvedCount": N}}`

  const prompt = `Date: ${date}

Action tasks:
${tasks.map((t) => `- [Priority ${t.priorityScore}] ${t.title} — ${t.summary}${t.deadline ? ` (Due: ${t.deadline})` : ''}`).join('\n')}

Awareness emails:
${awarenessEmails.map((e) => `- ${e.subject} from ${e.sender}`).join('\n') || '(none)'}

Uncertain/needs review:
${uncertainEmails.map((e) => `- ${e.subject} from ${e.sender}`).join('\n') || '(none)'}`

  const result = await callLLM(prompt, system, { model: 'medium' })
  return parseJSON<DigestResult>(result)
}
