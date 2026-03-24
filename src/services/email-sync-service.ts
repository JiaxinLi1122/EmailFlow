import { prisma } from '@/lib/prisma'
import { fetchNewEmails } from '@/adapters/gmail-adapter'
import { classifyEmail, extractTask, scorePriority } from '@/adapters/llm-adapter'

// ============================================================
// Email Sync Service — orchestrates fetch → classify → extract → score
// ============================================================

export async function syncEmails(userId: string, sinceDays: number = 7) {
  // Step 1: Fetch new emails from Gmail
  const newEmails = await fetchNewEmails(userId, sinceDays)
  if (newEmails.length === 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSyncAt: new Date() },
    })
    return { synced: 0, tasks: 0 }
  }

  // Step 2: Store emails in DB
  const stored = await Promise.all(
    newEmails.map((email) =>
      prisma.email.create({
        data: {
          userId,
          gmailMessageId: email.gmailMessageId,
          threadId: email.threadId,
          subject: email.subject,
          sender: email.sender,
          recipients: email.recipients,
          bodyPreview: email.bodyPreview,
          bodyFull: email.bodyFull,
          receivedAt: email.receivedAt,
          labels: email.labels,
          hasAttachments: email.hasAttachments,
        },
      })
    )
  )

  // Step 3: Classify each email
  let tasksCreated = 0

  for (const email of stored) {
    try {
      const classification = await classifyEmail({
        subject: email.subject,
        sender: email.sender,
        date: email.receivedAt.toISOString(),
        bodyPreview: email.bodyPreview,
      })

      await prisma.email.update({
        where: { id: email.id },
        data: {
          classification: classification.category,
          classConfidence: classification.confidence,
          classReasoning: classification.reasoning,
          isWorkRelated: classification.isWorkRelated,
          processedAt: new Date(),
        },
      })

      // Step 4: Extract task for action/uncertain emails
      if (classification.category === 'action' || classification.category === 'uncertain') {
        try {
          const taskResult = await extractTask({
            subject: email.subject,
            sender: email.sender,
            date: email.receivedAt.toISOString(),
            bodyPreview: email.bodyPreview,
            body: email.bodyFull || email.bodyPreview,
          })

          // Step 5: Score priority
          const priority = await scorePriority(
            {
              title: taskResult.title,
              summary: taskResult.summary,
              actionItems: taskResult.actionItems,
            },
            email.sender,
            new Date().toISOString().split('T')[0]
          )

          // Create task
          const task = await prisma.task.create({
            data: {
              userId,
              title: taskResult.title,
              summary: taskResult.summary,
              actionItems: taskResult.actionItems,
              status: classification.category === 'uncertain' ? 'pending' : 'pending',
              urgency: priority.urgency,
              impact: priority.impact,
              priorityScore: priority.combinedScore,
              priorityReason: priority.reasoning,
              explicitDeadline: taskResult.explicitDeadline
                ? new Date(taskResult.explicitDeadline)
                : null,
              inferredDeadline: taskResult.inferredDeadline
                ? new Date(taskResult.inferredDeadline)
                : null,
              deadlineConfidence: taskResult.deadlineConfidence,
            },
          })

          // Link task to email
          await prisma.taskEmail.create({
            data: {
              taskId: task.id,
              emailId: email.id,
              relationship: 'source',
            },
          })

          tasksCreated++
        } catch (error) {
          console.error(`Task extraction failed for email ${email.id}:`, error)
        }
      }
    } catch (error) {
      console.error(`Classification failed for email ${email.id}:`, error)
      await prisma.email.update({
        where: { id: email.id },
        data: {
          classification: 'uncertain',
          classConfidence: 0,
          classReasoning: 'Classification failed — needs manual review',
          processedAt: new Date(),
        },
      })
    }
  }

  // Update last sync time
  await prisma.user.update({
    where: { id: userId },
    data: { lastSyncAt: new Date() },
  })

  return { synced: stored.length, tasks: tasksCreated }
}
