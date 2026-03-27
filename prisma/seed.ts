import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@emailflow.ai' },
    update: {
      name: 'Demo User',
      timezone: 'Asia/Shanghai',
      gmailConnected: true,
      syncEnabled: true,
      lastSyncAt: new Date(),
    },
    create: {
      id: 'demo',
      email: 'demo@emailflow.ai',
      name: 'Demo User',
      timezone: 'Asia/Shanghai',
      gmailConnected: true,
      syncEnabled: true,
      lastSyncAt: new Date(),
    },
  })

  const expires = daysFromNow(30)
  await prisma.session.upsert({
    where: { sessionToken: 'demo-session-token' },
    update: {
      userId: user.id,
      expires,
    },
    create: {
      sessionToken: 'demo-session-token',
      userId: user.id,
      expires,
    },
  })

  const WORK_EMAIL = 'demo@emailflow.ai'
  const PERSONAL_EMAIL = 'demo.personal@gmail.com'

  const emails = [
    {
      gmailMessageId: 'msg-001',
      threadId: 'thread-001',
      accountEmail: WORK_EMAIL,
      subject: 'Q1 Report — Please review and submit by EOD Friday',
      sender: 'Sarah Chen <sarah@clientcorp.com>',
      recipients: JSON.stringify(['demo@emailflow.ai']),
      bodyPreview:
        'Please review the Q1 report and send your feedback by Friday EOD.',
      bodyFull:
        'Hi, please review the attached Q1 report and submit feedback by Friday EOD. Focus especially on page 3 revenue projections and page 7 cost breakdown.',
      receivedAt: daysAgo(0),
      labels: JSON.stringify(['INBOX', 'IMPORTANT']),
      hasAttachments: true,
      classification: 'action',
      classConfidence: 0.95,
      classReasoning: 'Explicit deliverable with clear deadline',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-002',
      threadId: 'thread-002',
      accountEmail: WORK_EMAIL,
      subject: 'Weekly status update',
      sender: 'Mike Johnson <mike@team.co>',
      recipients: JSON.stringify(['demo@emailflow.ai']),
      bodyPreview:
        'Frontend is 80% complete, backend ready, QA starts Monday.',
      bodyFull:
        'Weekly update: frontend is 80% complete, backend API endpoints are functional, QA starts next Monday. No blockers and budget is on track.',
      receivedAt: daysAgo(1),
      labels: JSON.stringify(['INBOX']),
      hasAttachments: false,
      classification: 'awareness',
      classConfidence: 0.91,
      classReasoning: 'Informational status update only',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-003',
      threadId: 'thread-003',
      accountEmail: PERSONAL_EMAIL,
      subject: '50% OFF SALE 🔥',
      sender: 'ShopMart <deals@shopmart.com>',
      recipients: JSON.stringify(['demo.personal@gmail.com']),
      bodyPreview: 'Big discount today only.',
      bodyFull:
        'Today only: up to 50% off electronics, home goods, and more.',
      receivedAt: daysAgo(0),
      labels: JSON.stringify(['INBOX', 'PROMOTIONS']),
      hasAttachments: false,
      classification: 'ignore',
      classConfidence: 0.98,
      classReasoning: 'Promotional email',
      isWorkRelated: false,
    },
    {
      gmailMessageId: 'msg-004',
      threadId: 'thread-004',
      accountEmail: WORK_EMAIL,
      subject: 'Reminder: Submit timesheet today',
      sender: 'HR <hr@company.com>',
      recipients: JSON.stringify(['demo@emailflow.ai']),
      bodyPreview: 'Please submit your weekly timesheet before 6pm today.',
      bodyFull:
        'Friendly reminder to submit your weekly timesheet before 6pm today so payroll can be processed on time.',
      receivedAt: daysAgo(0),
      labels: JSON.stringify(['INBOX']),
      hasAttachments: false,
      classification: 'action',
      classConfidence: 0.93,
      classReasoning: 'Same-day deadline and explicit action',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-005',
      threadId: 'thread-005',
      accountEmail: PERSONAL_EMAIL,
      subject: 'Password reset request',
      sender: 'Security <security@service.com>',
      recipients: JSON.stringify(['demo.personal@gmail.com']),
      bodyPreview: 'Click here to reset your password.',
      bodyFull:
        'We received a password reset request. If this was you, complete the reset within 24 hours. If not, ignore this email and monitor your account.',
      receivedAt: daysAgo(0),
      labels: JSON.stringify(['INBOX']),
      hasAttachments: false,
      classification: 'action',
      classConfidence: 0.86,
      classReasoning: 'Potential security action required',
      isWorkRelated: false,
    },
    {
      gmailMessageId: 'msg-006',
      threadId: 'thread-006',
      accountEmail: WORK_EMAIL,
      subject: 'Contract draft ready — confirm by Tuesday',
      sender: 'Legal Team <legal@vendor.com>',
      recipients: JSON.stringify(['demo@emailflow.ai']),
      bodyPreview: 'Please review clauses 3 and 7 before Tuesday.',
      bodyFull:
        'Attached is the updated contract draft. Please review clauses 3 and 7 and confirm by Tuesday so we can proceed.',
      receivedAt: daysAgo(1),
      labels: JSON.stringify(['INBOX', 'IMPORTANT']),
      hasAttachments: true,
      classification: 'action',
      classConfidence: 0.92,
      classReasoning: 'Legal review with explicit deadline',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-007',
      threadId: 'thread-007',
      accountEmail: WORK_EMAIL,
      subject: 'Invoice #2048 due in 3 days',
      sender: 'CloudHost <billing@cloudhost.io>',
      recipients: JSON.stringify(['demo@emailflow.ai']),
      bodyPreview: 'Hosting invoice is due in 3 days.',
      bodyFull:
        'Invoice #2048 for hosting services is due in 3 days. Please pay promptly to avoid any service interruption.',
      receivedAt: daysAgo(0),
      labels: JSON.stringify(['INBOX']),
      hasAttachments: true,
      classification: 'action',
      classConfidence: 0.89,
      classReasoning: 'Payment deadline and service risk',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-008',
      threadId: 'thread-008',
      accountEmail: PERSONAL_EMAIL,
      subject: 'Flight booking confirmation ✈️',
      sender: 'Airline <booking@airline.com>',
      recipients: JSON.stringify(['demo.personal@gmail.com']),
      bodyPreview: 'Your flight to Sydney has been confirmed.',
      bodyFull:
        'Your booking is confirmed. Departure is next Tuesday at 9:40am. Check-in opens 24 hours before departure.',
      receivedAt: daysAgo(2),
      labels: JSON.stringify(['INBOX']),
      hasAttachments: false,
      classification: 'awareness',
      classConfidence: 0.9,
      classReasoning: 'Travel confirmation',
      isWorkRelated: false,
    },
    {
      gmailMessageId: 'msg-009',
      threadId: 'thread-009',
      accountEmail: WORK_EMAIL,
      subject: 'Partnership opportunity — Let’s schedule a call',
      sender: 'Alex Wong <alex@startup.io>',
      recipients: JSON.stringify(['demo@emailflow.ai']),
      bodyPreview:
        'Would you be open to a 30-minute call next week to discuss partnership?',
      bodyFull:
        'Hi, I came across your work and would love to explore a potential partnership. Would you be open to a 30-minute call next week?',
      receivedAt: daysAgo(2),
      labels: JSON.stringify(['INBOX']),
      hasAttachments: false,
      classification: 'uncertain',
      classConfidence: 0.46,
      classReasoning: 'Could be genuine opportunity or cold outreach',
      isWorkRelated: true,
    },
  ]

  for (const email of emails) {
    await prisma.email.upsert({
      where: { gmailMessageId: email.gmailMessageId },
      update: {
        userId: user.id,
        threadId: email.threadId,
        accountEmail: email.accountEmail,
        subject: email.subject,
        sender: email.sender,
        recipients: email.recipients,
        bodyPreview: email.bodyPreview,
        bodyFull: email.bodyFull,
        receivedAt: email.receivedAt,
        labels: email.labels,
        hasAttachments: email.hasAttachments,
        classification: email.classification,
        classConfidence: email.classConfidence,
        classReasoning: email.classReasoning,
        isWorkRelated: email.isWorkRelated,
        processedAt: new Date(),
      },
      create: {
        userId: user.id,
        gmailMessageId: email.gmailMessageId,
        threadId: email.threadId,
        accountEmail: email.accountEmail,
        subject: email.subject,
        sender: email.sender,
        recipients: email.recipients,
        bodyPreview: email.bodyPreview,
        bodyFull: email.bodyFull,
        receivedAt: email.receivedAt,
        labels: email.labels,
        hasAttachments: email.hasAttachments,
        classification: email.classification,
        classConfidence: email.classConfidence,
        classReasoning: email.classReasoning,
        isWorkRelated: email.isWorkRelated,
        processedAt: new Date(),
      },
    })
  }

  const taskBlueprints = [
    {
      sourceMessageId: 'msg-001',
      title: 'Review Q1 report and send feedback',
      summary:
        'Review key pages of the Q1 report and send feedback before Friday EOD.',
      actionItems: [
        'Review page 3 revenue projections',
        'Review page 7 cost breakdown',
        'Reply to Sarah with final feedback',
      ],
      urgency: 5,
      impact: 5,
      priorityScore: 25,
      priorityReason: 'Board meeting dependency and hard Friday deadline',
      startDate: daysAgo(0),
      explicitDeadline: nextWeekday(5),
      inferredDeadline: null,
      deadlineConfidence: 0.95,
      status: 'pending',
    },
    {
      sourceMessageId: 'msg-004',
      title: 'Submit weekly timesheet',
      summary: 'Complete and submit timesheet before 6pm today.',
      actionItems: [
        'Open timesheet system',
        'Fill in work hours',
        'Submit before 6pm',
      ],
      urgency: 5,
      impact: 3,
      priorityScore: 15,
      priorityReason: 'Same-day administrative deadline',
      startDate: daysAgo(0),
      explicitDeadline: todayAt(18, 0),
      inferredDeadline: null,
      deadlineConfidence: 0.98,
      status: 'pending',
    },
    {
      sourceMessageId: 'msg-005',
      title: 'Review password reset request',
      summary:
        'Check whether the password reset request was legitimate and act if needed.',
      actionItems: [
        'Verify whether you requested the reset',
        'Reset password if legitimate',
        'Monitor account if suspicious',
      ],
      urgency: 4,
      impact: 4,
      priorityScore: 16,
      priorityReason: 'Potential account security risk',
      startDate: daysAgo(0),
      explicitDeadline: null,
      inferredDeadline: daysFromNow(1),
      deadlineConfidence: 0.8,
      status: 'pending',
    },
    {
      sourceMessageId: 'msg-006',
      title: 'Review contract clauses 3 and 7',
      summary: 'Review the updated contract draft and respond before Tuesday.',
      actionItems: [
        'Review clause 3',
        'Review clause 7',
        'Reply to legal team',
      ],
      urgency: 4,
      impact: 5,
      priorityScore: 20,
      priorityReason: 'Legal review with explicit external deadline',
      startDate: daysAgo(0),
      explicitDeadline: nextWeekday(2),
      inferredDeadline: null,
      deadlineConfidence: 0.92,
      status: 'pending',
    },
    {
      sourceMessageId: 'msg-007',
      title: 'Pay CloudHost invoice #2048',
      summary: 'Pay hosting invoice to avoid service interruption.',
      actionItems: [
        'Open billing portal',
        'Review invoice details',
        'Complete payment',
      ],
      urgency: 4,
      impact: 4,
      priorityScore: 16,
      priorityReason: 'Service continuity risk if unpaid',
      startDate: daysAgo(0),
      explicitDeadline: daysFromNow(3),
      inferredDeadline: null,
      deadlineConfidence: 0.9,
      status: 'pending',
    },
  ]

  for (const blueprint of taskBlueprints) {
    const sourceEmail = await prisma.email.findUnique({
      where: { gmailMessageId: blueprint.sourceMessageId },
    })

    if (!sourceEmail) continue

    let task = await prisma.task.findFirst({
      where: {
        userId: user.id,
        title: blueprint.title,
      },
    })

    if (!task) {
      task = await prisma.task.create({
        data: {
          userId: user.id,
          title: blueprint.title,
          summary: blueprint.summary,
          actionItems: JSON.stringify(blueprint.actionItems),
          status: blueprint.status,
          urgency: blueprint.urgency,
          impact: blueprint.impact,
          priorityScore: blueprint.priorityScore,
          priorityReason: blueprint.priorityReason,
          startDate: blueprint.startDate,
          explicitDeadline: blueprint.explicitDeadline,
          inferredDeadline: blueprint.inferredDeadline,
          deadlineConfidence: blueprint.deadlineConfidence,
        },
      })
    } else {
      task = await prisma.task.update({
        where: { id: task.id },
        data: {
          summary: blueprint.summary,
          actionItems: JSON.stringify(blueprint.actionItems),
          status: task.status,
          urgency: blueprint.urgency,
          impact: blueprint.impact,
          priorityScore: blueprint.priorityScore,
          priorityReason: blueprint.priorityReason,
          startDate: blueprint.startDate,
          explicitDeadline: blueprint.explicitDeadline,
          inferredDeadline: blueprint.inferredDeadline,
          deadlineConfidence: blueprint.deadlineConfidence,
        },
      })
    }

    await prisma.taskEmail.upsert({
      where: {
        taskId_emailId: {
          taskId: task.id,
          emailId: sourceEmail.id,
        },
      },
      update: {
        relationship: 'source',
      },
      create: {
        taskId: task.id,
        emailId: sourceEmail.id,
        relationship: 'source',
      },
    })
  }

  const standaloneTasks = [
    {
      title: 'Prepare presentation slides',
      summary: 'Create demo slides for product walkthrough.',
      actionItems: ['Draft slide outline', 'Add screenshots', 'Practice demo'],
      urgency: 2,
      impact: 3,
      priorityScore: 6,
      priorityReason: 'Useful for stakeholder demo preparation',
      startDate: daysFromNow(1),
      inferredDeadline: daysFromNow(4),
      status: 'pending',
    },
    {
      title: 'Plan next week schedule',
      summary: 'Organize meetings and focus blocks for next week.',
      actionItems: [
        'Review calendar',
        'Block focus time',
        'Prioritize top tasks',
      ],
      urgency: 2,
      impact: 2,
      priorityScore: 4,
      priorityReason: 'Improves planning and reduces deadline stress',
      startDate: daysFromNow(2),
      inferredDeadline: daysFromNow(5),
      status: 'pending',
    },
  ]

  for (const t of standaloneTasks) {
    const existing = await prisma.task.findFirst({
      where: {
        userId: user.id,
        title: t.title,
      },
    })

    if (!existing) {
      await prisma.task.create({
        data: {
          userId: user.id,
          title: t.title,
          summary: t.summary,
          actionItems: JSON.stringify(t.actionItems),
          status: t.status,
          urgency: t.urgency,
          impact: t.impact,
          priorityScore: t.priorityScore,
          priorityReason: t.priorityReason,
          startDate: t.startDate,
          inferredDeadline: t.inferredDeadline,
        },
      })
    }
  }

  const todayStart = startOfDay(new Date())
  const todayEnd = endOfDay(new Date())

  const existingDigest = await prisma.digest.findFirst({
    where: {
      userId: user.id,
      period: 'daily',
      periodStart: todayStart,
      periodEnd: todayEnd,
    },
  })

  const digestContent = `## Daily Digest

### Timeline
- **Today 6:00 PM** — Submit weekly timesheet
- **Tomorrow** — Review password reset request if still unresolved
- **In 3 days** — Pay CloudHost invoice #2048
- **By Tuesday** — Review contract clauses 3 and 7
- **By Friday** — Review Q1 report and send feedback

### Linked email tasks
- Q1 report review is linked to Sarah Chen's email
- Timesheet submission is linked to the HR reminder
- Contract review is linked to the legal team email
- Invoice payment is linked to the CloudHost billing email

### Summary
You have several action-oriented emails that have been converted into tasks with dates and priorities. Highest-priority items are the Q1 report, the contract review, and the invoice payment.`

  const digestStats = JSON.stringify({
    totalEmails: emails.length,
    actionTasks: taskBlueprints.length,
    standaloneTasks: standaloneTasks.length,
    awarenessEmails: emails.filter((e) => e.classification === 'awareness').length,
    ignoredEmails: emails.filter((e) => e.classification === 'ignore').length,
  })

  if (!existingDigest) {
    await prisma.digest.create({
      data: {
        userId: user.id,
        period: 'daily',
        periodStart: todayStart,
        periodEnd: todayEnd,
        content: digestContent,
        stats: digestStats,
      },
    })
  }

  console.log('✅ Seed complete! Demo user id =', user.id)
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

function nextWeekday(targetDay: number): Date {
  const d = new Date()
  const current = d.getDay()
  let diff = (targetDay - current + 7) % 7
  if (diff === 0) diff = 7
  d.setDate(d.getDate() + diff)
  return d
}

function todayAt(hour: number, minute: number): Date {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })