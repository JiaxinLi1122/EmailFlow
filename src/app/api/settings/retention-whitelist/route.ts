/**
 * GET  /api/settings/retention-whitelist      — list all protection rules
 * POST /api/settings/retention-whitelist      — add a rule
 *   Body: { ruleType: 'CONTACT' | 'DOMAIN' | 'LABEL', value: string }
 */

import { getAuthUser, success, error, errorFromException } from '@/lib/api-helpers'
import * as retentionRepo from '@/repositories/retention-repo'
import type { ProtectionRuleType } from '@prisma/client'

export const dynamic = 'force-dynamic'

const VALID_RULE_TYPES: ProtectionRuleType[] = ['CONTACT', 'DOMAIN', 'LABEL']

export async function GET() {
  try {
    const user = await getAuthUser()
    const rules = await retentionRepo.getProtectionRulesWithIds(user.id)
    return success(rules)
  } catch (err) {
    return errorFromException(err, 'FETCH_FAILED', 'Failed to fetch whitelist rules', 500)
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser()
    const body = await req.json()
    const { ruleType, value } = body

    if (!VALID_RULE_TYPES.includes(ruleType)) {
      return error(
        'INVALID_INPUT',
        `ruleType must be one of: ${VALID_RULE_TYPES.join(', ')}`,
        400
      )
    }

    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return error('INVALID_INPUT', 'value is required and must be a non-empty string', 400)
    }

    const rule = await retentionRepo.addProtectionRule(user.id, ruleType, value.trim())
    return success(rule)
  } catch (err) {
    // Unique constraint violation → duplicate rule
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return error('DUPLICATE_RULE', 'This rule already exists', 409)
    }
    return errorFromException(err, 'CREATE_FAILED', 'Failed to add whitelist rule', 500)
  }
}
