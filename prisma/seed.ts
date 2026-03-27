import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // =========================
  // 1️⃣ 固定 demo 用户
  // =========================
  const user = await prisma.user.upsert({
    where: { id: 'demo' }, // 🔥 用 id 而不是 email
    update: {},
    create: {
      id: 'demo',
      email: 'demo@emailflow.ai',
      name: 'demo',
      timezone: 'Asia/Shanghai',
      gmailConnected: true,
      syncEnabled: true,
      lastSyncAt: new Date(),
    },
  })

  // =========================
  // 2️⃣ demo session
  // =========================
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

  // =========================
  // 3️⃣ mock emails
  // =========================
  const WORK_EMAIL = 'demo@emailflow.ai'
  const PERSONAL_EMAIL = 'demo.personal@gmail.com'

  const emails = [
    {
      gmailMessageId: 'msg-001',
      accountEmail: WORK_EMAIL,
      subject: 'Q1 Report — Please review and submit by EOD Friday',
      sender: 'Sarah Chen <sarah@clientcorp.com>',
      bodyPreview: 'Please review Q1 report and submit feedback.',
      receivedAt: daysAgo(0),
      classification: 'action',
      classConfidence: 0.95,
      classReasoning: 'Has deadline',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-002',
      accountEmail: WORK_EMAIL,
      subject: 'Weekly status update',
      sender: 'Mike <mike@team.com>',
      bodyPreview: 'Project status update',
      receivedAt: daysAgo(1),
      classification: 'awareness',
      classConfidence: 0.9,
      classReasoning: 'Informational',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-003',
      accountEmail: PERSONAL_EMAIL,
      subject: '50% OFF SALE 🔥',
      sender: 'Shop <shop@store.com>',
      bodyPreview: 'Big discount',
      receivedAt: daysAgo(0),
      classification: 'ignore',
      classConfidence: 0.98,
      classReasoning: 'Spam',
      isWorkRelated: false,
    },
    {
      gmailMessageId: 'msg-011',
      accountEmail: WORK_EMAIL,
      subject: 'Reminder: Submit timesheet today',
      sender: 'HR <hr@company.com>',
      bodyPreview: 'Please submit your weekly timesheet before 6pm today.',
      receivedAt: daysAgo(0),
      classification: 'action',
      classConfidence: 0.93,
      classReasoning: 'Explicit deadline',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-012',
      accountEmail: WORK_EMAIL,
      subject: 'Team lunch this Friday 🍔',
      sender: 'Office Admin <admin@company.com>',
      bodyPreview: 'Join us for a team lunch this Friday at 12pm.',
      receivedAt: daysAgo(1),
      classification: 'awareness',
      classConfidence: 0.88,
      classReasoning: 'Optional event',
      isWorkRelated: true,
    },
    {
      gmailMessageId: 'msg-013',
      accountEmail: PERSONAL_EMAIL,
      subject: 'Flight booking confirmation ✈️',
      sender: 'Airline <booking@airline.com>',
      bodyPreview: 'Your flight to Sydney has been confirmed.',
      receivedAt: daysAgo(2),
      classification: 'awareness',
      classConfidence: 0.9,
      classReasoning: 'Travel confirmation',
      isWorkRelated: false,
    },
    {
      gmailMessageId: 'msg-014',
      accountEmail: PERSONAL_EMAIL,
      subject: 'Password reset request',
      sender: 'Security <security@service.com>',
      bodyPreview: 'Click here to reset your password.',
      receivedAt: daysAgo(0),
      classification: 'action',
      classConfidence: 0.85,
      classReasoning: 'Security action required',
      isWorkRelated: false,
    },
    {
      gmailMessageId: 'msg-015',
      accountEmail: PERSONAL_EMAIL,
      subject: '🔥 Flash Sale — Today Only!',
      sender: 'Deals <deals@shop.com>',
      bodyPreview: 'Limited time offer, up to 70% off!',
      receivedAt: daysAgo(0),
      classification: 'ignore',
      classConfidence: 0.97,
      classReasoning: 'Promotional email',
      isWorkRelated: false,
    }
  ]

  for (const email of emails) {
    await prisma.email.upsert({
      where: { gmailMessageId: email.gmailMessageId },
      update: {},
      create: {
        userId: user.id, // 🔥 核心：绑定 demo
        ...email,
        recipients: '',
        labels: '',
        hasAttachments: false,
        bodyFull: email.bodyPreview,
        processedAt: new Date(),
      },
    })
  }

  // =========================
  // 4️⃣ tasks（只给 action 邮件生成）
  // =========================
  const actionEmails = await prisma.email.findMany({
    where: {
      userId: user.id,
      classification: 'action',
    },
  })

    // =========================
    // ➕ 额外测试 tasks（不会影响已有数据）
    // =========================
    const extraTasks = [
      {
        title: 'Prepare presentation slides',
        summary: 'Create slides for demo presentation',
      },
      {
        title: 'Reply to client emails',
        summary: 'Respond to pending client messages',
      },
      {
        title: 'Clean up inbox',
        summary: 'Archive unnecessary emails',
      },
      {
        title: 'Plan next week schedule',
        summary: 'Organize upcoming tasks',
      },
    ]

    for (const t of extraTasks) {
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
            actionItems: JSON.stringify(['Do it']),
            urgency: 2,
            impact: 2,
            priorityScore: 4,
            status: 'pending',
          },
        })
      }
    }

  for (const email of actionEmails) {
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: email.subject,
        summary: email.bodyPreview,
        actionItems: JSON.stringify(['Review email']),
        urgency: 3,
        impact: 3,
        priorityScore: 9,
        status: 'pending',
      },
    })

    await prisma.taskEmail.create({
      data: {
        taskId: task.id,
        emailId: email.id,
        relationship: 'source',
      },
    })
  }

  // =========================
  // 5️⃣ digest
  // =========================
  await prisma.digest.create({
    data: {
      userId: user.id,
      period: 'daily',
      periodStart: daysAgo(1),
      periodEnd: new Date(),
      content: 'Demo digest summary',
      stats: JSON.stringify({
        action: 1,
        awareness: 1,
        ignore: 1,
      }),
    },
  })

  console.log('✅ Seed complete! Demo user id = demo')
}

// =========================
// helpers
// =========================
function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })