// Email-related types
export type EmailCategory = 'action' | 'awareness' | 'ignore' | 'uncertain'

export interface EmailInput {
  subject: string
  sender: string
  date: string
  bodyPreview: string
  body?: string
}

export interface ThreadContext {
  messages: {
    sender: string
    date: string
    bodyPreview: string
  }[]
}
