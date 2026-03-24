import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@emailflow.ai' },
    update: {},
    create: {
      email: 'demo@emailflow.ai',
      name: 'Demo User',
      timezone: 'Asia/Shanghai',
      gmailConnected: true,
      syncEnabled: true,
      lastSyncAt: new Date(),
    },
  })

  // Create a session for demo user (so they're "logged in")
  const expires = new Date()
  expires.setDate(expires.getDate() + 30)
  await prisma.session.upsert({
    where: { sessionToken: 'demo-session-token' },
    update: { expires },
    create: {
      sessionToken: 'demo-session-token',
      userId: user.id,
      expires,
    },
  })

  // Create mock emails (from two different email accounts)
  const WORK_EMAIL = 'demo@emailflow.ai'
  const PERSONAL_EMAIL = 'demo.personal@gmail.com'

  const emails = [
    {
      gmailMessageId: 'msg-001',
      accountEmail: WORK_EMAIL,
      subject: 'Q1 Report — Please review and submit by EOD Friday',
      sender: 'Sarah Chen <sarah@clientcorp.com>',
      bodyPreview: 'Hi, please review the attached Q1 report and submit your feedback by end of day Friday. The board meeting is on Monday and we need finalized numbers. Key areas to focus: revenue projections (page 3) and cost breakdown (page 7). Let me know if you have questions.',
      receivedAt: daysAgo(0),
      classification: 'action',
      classConfidence: 0.95,
      classReasoning: 'Explicit request with deadline — review and submit by Friday',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-002',
      accountEmail: WORK_EMAIL,
      subject: 'Contract Draft v2 — Review clauses 3 and 7',
      sender: 'Legal Team <legal@legalco.com>',
      bodyPreview: 'Attached is the updated contract draft. We\'ve revised clauses 3 (liability cap) and 7 (termination terms) based on your feedback. Please review and confirm by next Tuesday so we can proceed with signing.',
      receivedAt: daysAgo(1),
      classification: 'action',
      classConfidence: 0.92,
      classReasoning: 'Contract review request with specific deadline — next Tuesday',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-003',
      accountEmail: PERSONAL_EMAIL,
      subject: 'Internship Interview — Confirm your availability',
      sender: 'Career Office <coordinator@uni.edu>',
      bodyPreview: 'We have scheduled your internship interview for next Wednesday at 2pm. Please confirm your availability or suggest an alternative time by this Friday.',
      receivedAt: daysAgo(1),
      classification: 'action',
      classConfidence: 0.88,
      classReasoning: 'Interview scheduling — requires confirmation response',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-004',
      accountEmail: WORK_EMAIL,
      subject: 'Partnership opportunity — Let\'s schedule a call',
      sender: 'Alex Wong <alex@startup.io>',
      bodyPreview: 'Hi! I came across your work and would love to explore a potential partnership. We\'re building a complementary product and think there could be synergies. Would you be open to a 30-min call next week?',
      receivedAt: daysAgo(2),
      classification: 'uncertain',
      classConfidence: 0.45,
      classReasoning: 'Unknown sender — could be genuine opportunity or cold outreach',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-005',
      accountEmail: WORK_EMAIL,
      subject: 'Project Alpha — Weekly status update',
      sender: 'Mike Johnson <mike@team.co>',
      bodyPreview: 'Weekly update: Frontend is 80% complete. Backend API endpoints are all functional. QA testing starts next Monday. No blockers currently. Budget is on track.',
      receivedAt: daysAgo(0),
      classification: 'awareness',
      classConfidence: 0.91,
      classReasoning: 'Status update — informational only, no action required',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-006',
      accountEmail: PERSONAL_EMAIL,
      subject: 'Your Stripe payment was successful',
      sender: 'Stripe <notifications@stripe.com>',
      bodyPreview: 'Payment of $49.99 for your Pro subscription was processed successfully. Receipt attached.',
      receivedAt: daysAgo(1),
      classification: 'awareness',
      classConfidence: 0.87,
      classReasoning: 'Payment confirmation — informational notification',
      isWorkRelated: false,
    },
    {
      gmailMessageId: 'msg-007',
      accountEmail: PERSONAL_EMAIL,
      subject: 'Design Community Weekly Newsletter',
      sender: 'Design Weekly <hello@designweekly.com>',
      bodyPreview: 'This week: Top 10 UI trends for 2026, Interview with the Figma design team, Free icon pack download...',
      receivedAt: daysAgo(2),
      classification: 'ignore',
      classConfidence: 0.94,
      classReasoning: 'Newsletter — no action required',
      isWorkRelated: false,
    },
    {
      gmailMessageId: 'msg-008',
      accountEmail: PERSONAL_EMAIL,
      subject: '50% OFF — Spring Sale ends tomorrow!',
      sender: 'ShopMart <deals@shopmart.com>',
      bodyPreview: 'Don\'t miss our biggest spring sale! Up to 50% off on electronics, home goods, and more. Offer ends tomorrow.',
      receivedAt: daysAgo(0),
      classification: 'ignore',
      classConfidence: 0.98,
      classReasoning: 'Promotional spam — no work relevance',
      isWorkRelated: false,
    },
    {
      gmailMessageId: 'msg-009',
      accountEmail: WORK_EMAIL,
      subject: 'Invoice #1234 — Payment due in 5 days',
      sender: 'CloudHost <billing@cloudhost.io>',
      bodyPreview: 'Your invoice #1234 for $29.00 (March hosting) is due on March 29. Please ensure payment to avoid service interruption.',
      receivedAt: daysAgo(0),
      classification: 'action',
      classConfidence: 0.82,
      classReasoning: 'Invoice with payment deadline — requires action',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-010',
      accountEmail: WORK_EMAIL,
      subject: 'Brand collaboration request — Instagram campaign',
      sender: 'Jamie Lee <jamie@brandagency.com>',
      bodyPreview: 'Hi! We represent TechGadgets and would love to feature your product in our upcoming Instagram campaign. Budget is $2,000 for 3 posts. Interested? We need a response by end of this week.',
      receivedAt: daysAgo(1),
      classification: 'action',
      classConfidence: 0.79,
      classReasoning: 'Business opportunity with deadline — requires decision',
      isWorkRelated: true,
    },
  ]

  for (const emailData of emails) {
    await prisma.email.upsert({
      where: { gmailMessageId: emailData.gmailMessageId },
      update: {},
      create: {
        userId: user.id,
        ...emailData,
        recipients: '',
        labels: '',
        hasAttachments: false,
        bodyFull: emailData.bodyPreview,
        processedAt: new Date(),
      },
    })
  }

  // Create mock tasks (linked to action emails)
  const actionEmails = await prisma.email.findMany({
    where: { userId: user.id, classification: 'action' },
  })

  const taskData = [
    {
      title: 'Review and submit Q1 report feedback',
      summary: 'Sarah needs Q1 report feedback by Friday for Monday board meeting. Focus on revenue projections (p3) and cost breakdown (p7).',
      actionItems: JSON.stringify(['Review revenue projections on page 3', 'Check cost breakdown on page 7', 'Submit feedback to Sarah']),
      urgency: 5, impact: 5, priorityScore: 25,
      priorityReason: 'Explicit deadline (Friday), high-stakes board meeting on Monday',
      startDate: daysAgo(1),
      explicitDeadline: nextFriday(),
      deadlineConfidence: 0.95,
    },
    {
      title: 'Review contract draft — clauses 3 and 7',
      summary: 'LegalCo sent updated contract with revised liability cap and termination terms. Review and confirm by Tuesday.',
      actionItems: JSON.stringify(['Review clause 3 (liability cap)', 'Review clause 7 (termination terms)', 'Send confirmation to legal team']),
      urgency: 4, impact: 4, priorityScore: 16,
      priorityReason: 'Legal contract with specific deadline, affects business relationship',
      startDate: daysFromNow(1),
      explicitDeadline: nextTuesday(),
      deadlineConfidence: 0.92,
    },
    {
      title: 'Confirm internship interview availability',
      summary: 'Interview scheduled for next Wednesday 2pm. Need to confirm or suggest alternative by Friday.',
      actionItems: JSON.stringify(['Check calendar for Wednesday 2pm', 'Reply to confirm availability']),
      urgency: 3, impact: 3, priorityScore: 9,
      priorityReason: 'Interview scheduling with moderate deadline',
      startDate: daysFromNow(0),
      inferredDeadline: nextFriday(),
      deadlineConfidence: 0.88,
    },
    {
      title: 'Pay CloudHost invoice #1234',
      summary: 'March hosting invoice $29.00 due in 5 days. Pay to avoid service interruption.',
      actionItems: JSON.stringify(['Log into CloudHost billing portal', 'Process payment of $29.00']),
      urgency: 3, impact: 4, priorityScore: 12,
      priorityReason: 'Payment deadline, risk of service disruption',
      startDate: daysFromNow(3),
      explicitDeadline: daysFromNow(5),
      deadlineConfidence: 0.90,
    },
    {
      title: 'Respond to brand collaboration offer',
      summary: 'TechGadgets offering $2,000 for 3 Instagram posts. Need to decide by end of week.',
      actionItems: JSON.stringify(['Evaluate if TechGadgets aligns with brand', 'Decide on collaboration', 'Reply to Jamie by Friday']),
      urgency: 2, impact: 4, priorityScore: 8,
      priorityReason: 'Revenue opportunity but not urgent — deadline is end of week',
      startDate: daysFromNow(2),
      inferredDeadline: nextFriday(),
      deadlineConfidence: 0.75,
    },
  ]

  for (let i = 0; i < taskData.length && i < actionEmails.length; i++) {
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        ...taskData[i],
        status: 'pending',
      },
    })
    await prisma.taskEmail.create({
      data: {
        taskId: task.id,
        emailId: actionEmails[i].id,
        relationship: 'source',
      },
    })
  }

  // Create mock digests — daily + weekly
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const yesterdayEnd = new Date(yesterday)
  yesterdayEnd.setDate(yesterdayEnd.getDate() + 1)

  const twoDaysAgo = new Date(yesterday)
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 1)
  const twoDaysAgoEnd = new Date(twoDaysAgo)
  twoDaysAgoEnd.setDate(twoDaysAgoEnd.getDate() + 1)

  const weekStart = new Date(yesterday)
  weekStart.setDate(weekStart.getDate() - 6)

  // Daily digest — yesterday
  await prisma.digest.create({
    data: {
      userId: user.id,
      period: 'daily',
      periodStart: yesterday,
      periodEnd: yesterdayEnd,
      content: `## Daily Digest — ${yesterday.toLocaleDateString()}

### Action Required (5 tasks)
1. **Review and submit Q1 report feedback** — Due: Friday — Priority: Critical (25)
   From: Sarah Chen, client request for board meeting. Focus areas: revenue projections (p3) and cost breakdown (p7).
2. **Review contract draft — clauses 3 and 7** — Due: Tuesday — Priority: High (16)
   From: LegalCo, updated liability cap and termination terms need your sign-off.
3. **Pay CloudHost invoice #1234** — Due: 5 days — Priority: High (12)
   $29.00 hosting fee — pay promptly to avoid service interruption.
4. **Confirm internship interview availability** — Due: Friday — Priority: Medium (9)
   Wednesday 2pm interview slot. Respond to Career Office with confirmation.
5. **Respond to brand collaboration offer** — Due: Friday — Priority: Medium (8)
   TechGadgets offering $2,000 for 3 Instagram posts. Evaluate brand alignment.

### Awareness (2 emails)
- **Project Alpha — Weekly status update** from Mike Johnson: Frontend 80% complete, backend APIs done, QA starts Monday. No blockers, budget on track.
- **Stripe payment confirmation** — $49.99 Pro subscription processed successfully.

### Needs Your Review (1 item)
- **Partnership opportunity** from Alex Wong (startup.io) — AI confidence: 45%. Could be genuine collaboration opportunity or cold outreach. Recommend quick LinkedIn check on sender before engaging.

### Recommendations
- Start with the Q1 report review — it's your highest-priority item with a hard Friday deadline.
- The contract review can be batched with the Q1 report since both involve document review.
- Consider blocking 30 minutes this afternoon for the CloudHost payment — quick win to clear it.`,
      stats: JSON.stringify({ actionCount: 5, awarenessCount: 2, unresolvedCount: 1, ignoredCount: 2 }),
    },
  })

  // Daily digest — two days ago
  await prisma.digest.create({
    data: {
      userId: user.id,
      period: 'daily',
      periodStart: twoDaysAgo,
      periodEnd: twoDaysAgoEnd,
      content: `## Daily Digest — ${twoDaysAgo.toLocaleDateString()}

### Action Required (2 tasks)
1. **Review contract draft — clauses 3 and 7** — Due: Tuesday — Priority: High (16)
   Initial contract received from LegalCo.
2. **Respond to brand collaboration offer** — Due: Friday — Priority: Medium (8)
   New inquiry from Jamie Lee at BrandAgency for TechGadgets campaign.

### Awareness (1 email)
- **Design Community Weekly Newsletter** — Top 10 UI trends for 2026, Figma team interview.

### Needs Your Review (1 item)
- **Partnership opportunity** from Alex Wong (startup.io) — New contact, needs evaluation.

### Recommendations
- The contract review is your most time-sensitive item. Schedule a focused block tomorrow.
- The brand collab offer has an end-of-week deadline — no rush today.`,
      stats: JSON.stringify({ actionCount: 2, awarenessCount: 1, unresolvedCount: 1, ignoredCount: 1 }),
    },
  })

  // Weekly digest
  await prisma.digest.create({
    data: {
      userId: user.id,
      period: 'weekly',
      periodStart: weekStart,
      periodEnd: yesterdayEnd,
      content: `## Weekly Summary — ${weekStart.toLocaleDateString()} to ${yesterday.toLocaleDateString()}

### Overview
This was a **moderately busy week** with 10 emails processed across 2 accounts. The AI identified 5 action items, classified 2 as awareness, flagged 1 as uncertain, and filtered out 2 as noise.

### Key Metrics
- **Email volume**: 10 total (6 work, 4 personal)
- **Action rate**: 50% of emails required action — higher than typical
- **AI confidence**: Average 85% classification confidence
- **Task completion**: 0 of 5 tasks completed (all still pending)

### Top Priorities This Week
1. **Q1 Report Review** (Critical, Score: 25) — Board meeting dependency, Friday deadline
2. **Contract Review** (High, Score: 16) — Legal sign-off needed by Tuesday
3. **CloudHost Payment** (High, Score: 12) — Service continuity risk
4. **Interview Confirmation** (Medium, Score: 9) — Career opportunity
5. **Brand Collaboration** (Medium, Score: 8) — Revenue opportunity

### Email Sources
- **demo@emailflow.ai** (Work): 6 emails — 4 action, 1 awareness, 1 uncertain
- **demo.personal@gmail.com** (Personal): 4 emails — 1 action, 1 awareness, 2 ignored

### Patterns Detected
- Most action emails arrived on weekday mornings
- Legal and client emails consistently flagged as high priority
- Newsletter and promotional emails correctly filtered to "ignore"
- One uncertain classification (Alex Wong partnership) — suggest creating a "known contacts" list to improve future accuracy

### Recommendations for Next Week
- Clear the Q1 report and contract review early in the week to avoid deadline stress
- Set up auto-pay for recurring invoices like CloudHost to reduce task noise
- Review the uncertain sender (Alex Wong) to train the classifier`,
      stats: JSON.stringify({ actionCount: 5, awarenessCount: 2, unresolvedCount: 1, ignoredCount: 2 }),
    },
  })

  console.log('Seed complete! Demo user: demo@emailflow.ai')
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

function nextFriday(): Date {
  const d = new Date()
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7))
  return d
}

function nextTuesday(): Date {
  const d = new Date()
  d.setDate(d.getDate() + ((2 - d.getDay() + 7) % 7 || 7))
  return d
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1) })
