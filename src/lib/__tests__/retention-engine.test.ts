import { describe, it, expect } from 'vitest'
import { addDays, subDays } from 'date-fns'
import {
  getRetentionAction,
  DEFAULT_RETENTION_POLICY,
  type EmailSnapshot,
  type PolicySnapshot,
  type ProtectionRuleSnapshot,
} from '../retention-engine'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2026-04-15T12:00:00Z')

function makeEmail(overrides: Partial<EmailSnapshot> = {}): EmailSnapshot {
  return {
    id: 'email-1',
    retentionStatus: 'ACTIVE',
    receivedAt: subDays(NOW, 1),   // 1 day old by default
    sender: 'sender@example.com',
    labels: '["INBOX"]',
    archivedAt: null,
    metadataOnlyAt: null,
    restorableUntil: null,
    completedTaskAt: null,
    ...overrides,
  }
}

const NO_RULES: ProtectionRuleSnapshot[] = []
const policy = DEFAULT_RETENTION_POLICY

// ---------------------------------------------------------------------------
// PURGED — should always be a no-op
// ---------------------------------------------------------------------------

describe('PURGED email', () => {
  it('returns none for PURGED email regardless of age', () => {
    const email = makeEmail({ retentionStatus: 'PURGED', receivedAt: subDays(NOW, 365) })
    const result = getRetentionAction(email, policy, NO_RULES, NOW)
    expect(result.action).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// Protection rules — whitelist
// ---------------------------------------------------------------------------

describe('Protection rules', () => {
  const oldEmail = makeEmail({ receivedAt: subDays(NOW, 60) }) // past metadataOnly threshold

  it('protects STARRED emails', () => {
    const email = makeEmail({ receivedAt: subDays(NOW, 60), labels: '["INBOX","STARRED"]' })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('none')
  })

  it('protects IMPORTANT emails', () => {
    const email = makeEmail({ receivedAt: subDays(NOW, 60), labels: '["IMPORTANT"]' })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('none')
  })

  it('protects via CONTACT rule (full match)', () => {
    const rules: ProtectionRuleSnapshot[] = [{ ruleType: 'CONTACT', value: 'sender@example.com' }]
    expect(getRetentionAction(oldEmail, policy, rules, NOW).action).toBe('none')
  })

  it('CONTACT rule is case-insensitive', () => {
    const rules: ProtectionRuleSnapshot[] = [{ ruleType: 'CONTACT', value: 'SENDER@EXAMPLE.COM' }]
    expect(getRetentionAction(oldEmail, policy, rules, NOW).action).toBe('none')
  })

  it('protects via DOMAIN rule', () => {
    const rules: ProtectionRuleSnapshot[] = [{ ruleType: 'DOMAIN', value: 'example.com' }]
    expect(getRetentionAction(oldEmail, policy, rules, NOW).action).toBe('none')
  })

  it('does NOT protect when domain is different', () => {
    const rules: ProtectionRuleSnapshot[] = [{ ruleType: 'DOMAIN', value: 'other.com' }]
    expect(getRetentionAction(oldEmail, policy, rules, NOW).action).not.toBe('none')
  })

  it('protects via LABEL rule matching a label in the email', () => {
    const email = makeEmail({ receivedAt: subDays(NOW, 60), labels: '["INBOX","VIP"]' })
    const rules: ProtectionRuleSnapshot[] = [{ ruleType: 'LABEL', value: 'VIP' }]
    expect(getRetentionAction(email, policy, rules, NOW).action).toBe('none')
  })

  it('parses display-name sender correctly', () => {
    const email = makeEmail({
      receivedAt: subDays(NOW, 60),
      sender: 'Alice Smith <alice@acme.com>',
    })
    const contactRule: ProtectionRuleSnapshot[] = [{ ruleType: 'CONTACT', value: 'alice@acme.com' }]
    expect(getRetentionAction(email, policy, contactRule, NOW).action).toBe('none')

    const domainRule: ProtectionRuleSnapshot[] = [{ ruleType: 'DOMAIN', value: 'acme.com' }]
    expect(getRetentionAction(email, policy, domainRule, NOW).action).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// General emails (no completed task)
// ---------------------------------------------------------------------------

describe('General email — ACTIVE', () => {
  it('returns none when email is younger than metadataOnly threshold', () => {
    const email = makeEmail({ receivedAt: subDays(NOW, 29) })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('none')
  })

  it('returns metadataOnly exactly at threshold (30 days)', () => {
    const email = makeEmail({ receivedAt: subDays(NOW, 30) })
    const result = getRetentionAction(email, policy, NO_RULES, NOW)
    expect(result.action).toBe('metadataOnly')
  })

  it('metadataOnly result carries correct restorableUntil (receivedAt + 90 days)', () => {
    const receivedAt = subDays(NOW, 30)
    const email = makeEmail({ receivedAt })
    const result = getRetentionAction(email, policy, NO_RULES, NOW)
    if (result.action !== 'metadataOnly') throw new Error('expected metadataOnly')
    const expected = addDays(receivedAt, 90)
    expect(result.restorableUntil.toISOString()).toBe(expected.toISOString())
  })

  it('returns metadataOnly between day 30 and 90', () => {
    const email = makeEmail({ receivedAt: subDays(NOW, 60) })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('metadataOnly')
  })

  it('returns purge when email exceeds purge threshold (90 days)', () => {
    const email = makeEmail({ receivedAt: subDays(NOW, 90) })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('purge')
  })

  it('returns purge for very old email', () => {
    const email = makeEmail({ receivedAt: subDays(NOW, 365) })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('purge')
  })
})

describe('General email — METADATA_ONLY', () => {
  it('stays metadata_only if purge threshold not reached', () => {
    const email = makeEmail({
      retentionStatus: 'METADATA_ONLY',
      receivedAt: subDays(NOW, 60),
      metadataOnlyAt: subDays(NOW, 30),
      restorableUntil: addDays(NOW, 30),
    })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('none')
  })

  it('purges once receivedAt + purgeAfterDays is reached', () => {
    const email = makeEmail({
      retentionStatus: 'METADATA_ONLY',
      receivedAt: subDays(NOW, 90),
      metadataOnlyAt: subDays(NOW, 60),
      restorableUntil: subDays(NOW, 1),
    })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('purge')
  })
})

describe('General email — custom policy', () => {
  const customPolicy: PolicySnapshot = {
    ...DEFAULT_RETENTION_POLICY,
    metadataOnlyAfterDays: 7,
    purgeAfterDays: 14,
  }

  it('applies custom thresholds', () => {
    const email = makeEmail({ receivedAt: subDays(NOW, 8) })
    expect(getRetentionAction(email, customPolicy, NO_RULES, NOW).action).toBe('metadataOnly')
  })

  it('purges at custom purge threshold', () => {
    const email = makeEmail({ receivedAt: subDays(NOW, 14) })
    expect(getRetentionAction(email, customPolicy, NO_RULES, NOW).action).toBe('purge')
  })

  it('does nothing before custom metadataOnly threshold', () => {
    const email = makeEmail({ receivedAt: subDays(NOW, 6) })
    expect(getRetentionAction(email, customPolicy, NO_RULES, NOW).action).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// Task-done emails
// ---------------------------------------------------------------------------

describe('Task-done email — ACTIVE', () => {
  it('archives immediately when taskDoneArchiveAfterDays = 0 (default)', () => {
    const email = makeEmail({
      completedTaskAt: subDays(NOW, 1), // completed 1 day ago
    })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('archive')
  })

  it('does not archive if task just completed and threshold is > 0', () => {
    const customPolicy: PolicySnapshot = { ...DEFAULT_RETENTION_POLICY, taskDoneArchiveAfterDays: 7 }
    const email = makeEmail({
      completedTaskAt: subDays(NOW, 3),
    })
    expect(getRetentionAction(email, customPolicy, NO_RULES, NOW).action).toBe('none')
  })

  it('archives once taskDoneArchiveAfterDays threshold is met', () => {
    const customPolicy: PolicySnapshot = { ...DEFAULT_RETENTION_POLICY, taskDoneArchiveAfterDays: 7 }
    const email = makeEmail({
      completedTaskAt: subDays(NOW, 7),
    })
    expect(getRetentionAction(email, customPolicy, NO_RULES, NOW).action).toBe('archive')
  })
})

describe('Task-done email — ARCHIVED', () => {
  it('returns metadataOnly after taskDoneMetadataOnlyAfterDays since archival', () => {
    const archivedAt = subDays(NOW, 30)
    const email = makeEmail({
      retentionStatus: 'ARCHIVED',
      completedTaskAt: subDays(NOW, 31),
      archivedAt,
    })
    const result = getRetentionAction(email, policy, NO_RULES, NOW)
    expect(result.action).toBe('metadataOnly')
  })

  it('metadataOnly carries restorableUntil = archivedAt + metadataOnly + restoreWindow', () => {
    const archivedAt = subDays(NOW, 30)
    const email = makeEmail({
      retentionStatus: 'ARCHIVED',
      completedTaskAt: subDays(NOW, 31),
      archivedAt,
    })
    const result = getRetentionAction(email, policy, NO_RULES, NOW)
    if (result.action !== 'metadataOnly') throw new Error('expected metadataOnly')
    // archivedAt + 30 (metadataOnly) + 30 (restore window) = archivedAt + 60
    const expected = addDays(archivedAt, 30 + 30)
    expect(result.restorableUntil.toISOString()).toBe(expected.toISOString())
  })

  it('does not transition before taskDoneMetadataOnlyAfterDays', () => {
    const email = makeEmail({
      retentionStatus: 'ARCHIVED',
      completedTaskAt: subDays(NOW, 20),
      archivedAt: subDays(NOW, 15),
    })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('none')
  })
})

describe('Task-done email — METADATA_ONLY', () => {
  it('purges after restore window closes', () => {
    const email = makeEmail({
      retentionStatus: 'METADATA_ONLY',
      completedTaskAt: subDays(NOW, 70),
      archivedAt: subDays(NOW, 65),
      metadataOnlyAt: subDays(NOW, 35),
      restorableUntil: subDays(NOW, 5), // window closed 5 days ago
    })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('purge')
  })

  it('does not purge while restore window is open', () => {
    const email = makeEmail({
      retentionStatus: 'METADATA_ONLY',
      completedTaskAt: subDays(NOW, 40),
      archivedAt: subDays(NOW, 35),
      metadataOnlyAt: subDays(NOW, 5),
      restorableUntil: addDays(NOW, 25), // still open
    })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('ARCHIVED email with no completed task uses general rules', () => {
    // Should be treated as general: ARCHIVED → check receivedAt age
    const email = makeEmail({
      retentionStatus: 'ARCHIVED',
      receivedAt: subDays(NOW, 60), // past metadataOnly (30d), before purge (90d)
      completedTaskAt: null,
    })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('metadataOnly')
  })

  it('protection rule overrides even for very old emails', () => {
    const email = makeEmail({
      receivedAt: subDays(NOW, 365),
      labels: '["STARRED"]',
    })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('none')
  })

  it('malformed labels JSON is treated as empty array (no label protection)', () => {
    const email = makeEmail({
      receivedAt: subDays(NOW, 60),
      labels: 'not-valid-json',
    })
    // No protection should apply, should still get metadataOnly
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('metadataOnly')
  })

  it('empty labels array provides no protection', () => {
    const email = makeEmail({ receivedAt: subDays(NOW, 60), labels: '[]' })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('metadataOnly')
  })

  it('task-done email is protected despite completed task', () => {
    const email = makeEmail({
      completedTaskAt: subDays(NOW, 10),
      labels: '["STARRED"]',
    })
    expect(getRetentionAction(email, policy, NO_RULES, NOW).action).toBe('none')
  })
})
