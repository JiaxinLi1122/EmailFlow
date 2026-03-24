import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

// ============================================================
// Gmail Adapter — handles OAuth token management + email fetching
// ============================================================

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  )
}

async function getAuthenticatedClient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      gmailAccessToken: true,
      gmailRefreshToken: true,
      gmailTokenExpiry: true,
    },
  })

  if (!user?.gmailRefreshToken) {
    throw new Error('Gmail not connected')
  }

  const oauth2 = getOAuth2Client()
  oauth2.setCredentials({
    access_token: user.gmailAccessToken,
    refresh_token: user.gmailRefreshToken,
    expiry_date: user.gmailTokenExpiry?.getTime(),
  })

  // Auto-refresh if expired
  const tokenInfo = await oauth2.getAccessToken()
  if (tokenInfo.token !== user.gmailAccessToken) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        gmailAccessToken: tokenInfo.token,
        gmailTokenExpiry: new Date(Date.now() + 3600 * 1000),
      },
    })
  }

  return oauth2
}

export interface GmailMessage {
  gmailMessageId: string
  threadId: string | null
  subject: string
  sender: string
  recipients: string[]
  bodyPreview: string
  bodyFull: string
  receivedAt: Date
  labels: string[]
  hasAttachments: boolean
}

function decodeBase64Url(data: string): string {
  const buff = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  return buff.toString('utf-8')
}

function extractBody(payload: any): string {
  // Try plain text first, then HTML
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }
  if (payload.parts) {
    // Look for text/plain
    const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain')
    if (textPart?.body?.data) {
      return decodeBase64Url(textPart.body.data)
    }
    // Fall back to text/html and strip tags
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html')
    if (htmlPart?.body?.data) {
      const html = decodeBase64Url(htmlPart.body.data)
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    }
    // Recurse into multipart
    for (const part of payload.parts) {
      if (part.parts) {
        const result = extractBody(part)
        if (result) return result
      }
    }
  }
  return ''
}

function getHeader(headers: any[], name: string): string {
  const h = headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
  return h?.value || ''
}

export async function fetchNewEmails(
  userId: string,
  sinceDays: number = 7
): Promise<GmailMessage[]> {
  const auth = await getAuthenticatedClient(userId)
  const gmail = google.gmail({ version: 'v1', auth })

  // Calculate the "after" date
  const afterDate = new Date()
  afterDate.setDate(afterDate.getDate() - sinceDays)
  const afterStr = Math.floor(afterDate.getTime() / 1000).toString()

  // Get existing message IDs to avoid duplicates
  const existingIds = new Set(
    (
      await prisma.email.findMany({
        where: { userId },
        select: { gmailMessageId: true },
      })
    ).map((e) => e.gmailMessageId)
  )

  // List messages
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: `after:${afterStr}`,
    maxResults: 100,
  })

  const messageIds = (listRes.data.messages || [])
    .map((m) => m.id!)
    .filter((id) => !existingIds.has(id))

  if (messageIds.length === 0) return []

  // Fetch each message (batch in groups of 10)
  const messages: GmailMessage[] = []
  const batchSize = 10

  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (msgId) => {
        try {
          const res = await gmail.users.messages.get({
            userId: 'me',
            id: msgId,
            format: 'full',
          })
          return res.data
        } catch {
          console.warn(`Failed to fetch message ${msgId}`)
          return null
        }
      })
    )

    for (const msg of results) {
      if (!msg || !msg.payload) continue

      const headers = msg.payload.headers || []
      const bodyFull = extractBody(msg.payload)
      const subject = getHeader(headers, 'Subject') || '(no subject)'
      const sender = getHeader(headers, 'From')
      const to = getHeader(headers, 'To')
      const cc = getHeader(headers, 'Cc')
      const dateStr = getHeader(headers, 'Date')
      const receivedAt = dateStr ? new Date(dateStr) : new Date()

      const recipients = [to, cc].filter(Boolean)
      const hasAttachments = !!(msg.payload.parts?.some(
        (p: any) => p.filename && p.filename.length > 0
      ))

      messages.push({
        gmailMessageId: msg.id!,
        threadId: msg.threadId || null,
        subject,
        sender,
        recipients,
        bodyPreview: bodyFull.slice(0, 2000),
        bodyFull,
        receivedAt,
        labels: msg.labelIds || [],
        hasAttachments,
      })
    }
  }

  return messages
}

export async function disconnectGmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gmailAccessToken: true },
  })

  if (user?.gmailAccessToken) {
    try {
      const oauth2 = getOAuth2Client()
      await oauth2.revokeToken(user.gmailAccessToken)
    } catch {
      // Token might already be invalid
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      gmailAccessToken: null,
      gmailRefreshToken: null,
      gmailTokenExpiry: null,
      gmailConnected: false,
      syncEnabled: false,
    },
  })
}
