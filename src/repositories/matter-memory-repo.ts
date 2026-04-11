import { prisma } from '@/lib/prisma'
import type { ThreadMemory } from './thread-memory-repo'

// ============================================================
// Matter Memory Repository
//
// A "matter" is a higher-level grouping of one or more threads
// that share the same underlying situation, issue, or project.
// One matter → many threads.
//
// Matching is intentionally conservative: we prefer creating
// a new matter over incorrectly merging unrelated threads.
// ============================================================

export type MatterMemory = {
  id: string
  userId: string
  title: string
  topic: string
  summary: string
  status: string
  nextAction: string | null
  linkedPrimaryTaskId: string | null
  lastEmailId: string | null
  lastMessageAt: Date | null
  threadCount: number
  emailCount: number
  lastClassification: string | null
  participants: string[]
  keywords: string[]
  createdAt: Date
  updatedAt: Date
}

// ── Candidate discovery ───────────────────────────────────────

const CANDIDATE_WINDOW_DAYS = 60
const MAX_CANDIDATES = 5

/**
 * Rule-based candidate filtering — returns matters that share
 * the same topic OR have overlapping participants, within the
 * time window and not yet completed.
 *
 * Returns at most MAX_CANDIDATES, scored by relevance.
 */
export async function findCandidates(
  userId: string,
  thread: { topic: string; participants: string[]; title: string }
): Promise<MatterMemory[]> {
  const cutoff = new Date(Date.now() - CANDIDATE_WINDOW_DAYS * 86_400_000)

  // Fetch recent non-completed matters (small result set in practice)
  const recent = await prisma.matterMemory.findMany({
    where: {
      userId,
      status: { not: 'completed' },
      lastMessageAt: { gte: cutoff },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 30,
  })

  if (recent.length === 0) return []

  const threadKeywords = new Set(extractKeywords(thread.title))

  const scored = recent
    .map((m) => {
      const matter = mapRow(m)
      const topicMatch = matter.topic === thread.topic && thread.topic !== 'other'
      const participantOverlap = matter.participants.some((p) => thread.participants.includes(p))

      // Require at least one primary signal to be a candidate
      if (!topicMatch && !participantOverlap) return null

      // Keywords are a weak tiebreaker among already-qualifying candidates
      const keywordOverlap = matter.keywords.filter((k) => threadKeywords.has(k)).length

      const score = (topicMatch ? 2 : 0) + (participantOverlap ? 1 : 0) + (keywordOverlap >= 2 ? 0.5 : 0)
      return { matter, score }
    })
    .filter((x): x is { matter: MatterMemory; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES)
    .map((x) => x.matter)

  return scored
}

// ── Reads ─────────────────────────────────────────────────────

export async function findById(matterId: string): Promise<MatterMemory | null> {
  const raw = await prisma.matterMemory.findUnique({ where: { id: matterId } })
  return raw ? mapRow(raw) : null
}

// ── Writes ────────────────────────────────────────────────────

/**
 * Create a new matter seeded from a thread's current memory state.
 */
export async function createFromThread(
  userId: string,
  thread: ThreadMemory
): Promise<MatterMemory> {
  return mapRow(await prisma.matterMemory.create({
    data: {
      userId,
      title: thread.title,
      topic: thread.topic,
      summary: thread.summary,
      status: thread.status,
      nextAction: thread.nextAction,
      lastEmailId: thread.lastEmailId,
      lastMessageAt: thread.lastMessageAt,
      lastClassification: thread.lastClassification,
      participants: thread.participants,
      keywords: extractKeywords(thread.title),
      threadCount: 1,
      emailCount: 1, // the email that triggered this creation
    },
  }))
}

/**
 * Update a matter when an already-linked thread receives a new email.
 * Merges participants, updates summary/status/nextAction to latest.
 */
export async function updateFromThread(
  matterId: string,
  thread: ThreadMemory
): Promise<MatterMemory> {
  const matter = await prisma.matterMemory.findUnique({
    where: { id: matterId },
    select: { participants: true },
  })

  const mergedParticipants = mergeParticipants(matter?.participants as string[] | null, thread.participants)

  return mapRow(await prisma.matterMemory.update({
    where: { id: matterId },
    data: {
      summary: thread.summary,
      status: thread.status,
      nextAction: thread.nextAction,
      lastEmailId: thread.lastEmailId,
      lastMessageAt: thread.lastMessageAt,
      lastClassification: thread.lastClassification,
      participants: mergedParticipants,
      emailCount: { increment: 1 },
    },
  }))
}

/**
 * Link a NEW thread into an existing matter (called when matching succeeds).
 * Increments threadCount and merges thread state.
 */
export async function mergeThread(
  matterId: string,
  thread: ThreadMemory
): Promise<MatterMemory> {
  const matter = await prisma.matterMemory.findUnique({
    where: { id: matterId },
    select: { participants: true },
  })

  const mergedParticipants = mergeParticipants(matter?.participants as string[] | null, thread.participants)

  return mapRow(await prisma.matterMemory.update({
    where: { id: matterId },
    data: {
      summary: thread.summary,
      status: thread.status,
      nextAction: thread.nextAction,
      lastEmailId: thread.lastEmailId,
      lastMessageAt: thread.lastMessageAt,
      lastClassification: thread.lastClassification,
      participants: mergedParticipants,
      threadCount: { increment: 1 },
      emailCount: { increment: 1 },
    },
  }))
}

/**
 * Set the primary task for this matter (called once, first time a task is created).
 */
export async function linkPrimaryTask(matterId: string, taskId: string): Promise<void> {
  await prisma.matterMemory.update({
    where: { id: matterId },
    data: { linkedPrimaryTaskId: taskId },
  })
}

// ── Helpers ───────────────────────────────────────────────────

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string')
}

// Prisma returns Json columns as JsonValue; map them to typed fields at the boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(raw: any): MatterMemory {
  return {
    ...raw,
    participants: asStringArray(raw.participants),
    keywords: asStringArray(raw.keywords),
  }
}

function mergeParticipants(existing: string[] | null, incoming: string[]): string[] {
  return Array.from(new Set([...(existing ?? []), ...incoming]))
}

const SUBJECT_NOISE = /^(re|fwd?|fw|aw|回复|转发):\s*/gi
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'be', 'your', 'my',
  'our', 'this', 'that', 'it', 'we', 'you', 'i',
])

/**
 * Extract 5 significant keywords from a title for lightweight matching.
 */
function extractKeywords(title: string): string[] {
  const cleaned = title.replace(SUBJECT_NOISE, '').toLowerCase()
  const words = cleaned
    .split(/[\s\-_/|,]+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))

  return [...new Set(words)].slice(0, 5)
}
