import type { SupabaseClient } from '@supabase/supabase-js'

type FlowType = 'anonymous_visitor' | 'logged_in_first_visit' | 'all'
type RuleType = 'email' | 'user_id' | 'visitor_id' | 'ip' | 'path' | 'user_agent'

type BlockRule = {
  id: string
  flow_type: FlowType
  rule_type: RuleType
  rule_value: string
  enabled: boolean
}

type BlockRuleCheckParams = {
  email: string | null
  userId: string | null
  visitorId: string | null
  ip: string | null
  path: string
  userAgent: string | null
}

export type WorkflowEligibilityResult = {
  eligible: boolean
  reason: string
}

export const LOGGED_IN_FIRST_VISIT_DEFINITION_KEY = 'study_visitor'

const UNRESOLVED_STATUSES = ['running']

function envFlag(name: string, defaultValue: boolean) {
  const value = process.env[name]
  if (value === undefined) return defaultValue
  return value.trim().toLowerCase() === 'true'
}

export function getStudyVisitorWorkflowConfig() {
  return {
    enabled: envFlag('STUDY_VISITOR_WORKFLOW_ENABLED', true),
    ignoreAdminPaths: envFlag('STUDY_VISITOR_IGNORE_ADMIN_PATHS', false),
    ignoreAdminUsers: envFlag('STUDY_VISITOR_IGNORE_ADMIN_USERS', false),
  }
}

export function isAdminPath(path: string) {
  return path === '/admin' || path.startsWith('/admin/') || path === '/api' || path.startsWith('/api/')
}

/**
 * Check visitor_flow_block_rules for matches against the given parameters.
 * Returns the matching rule if found, or null if no enabled rule matches.
 */
export async function checkVisitorFlowBlockRules(
  supabase: SupabaseClient,
  params: BlockRuleCheckParams,
  targetFlowType: FlowType
): Promise<{ matched: boolean; reason: string | null }> {
  const { data: rules } = await supabase
    .from('visitor_flow_block_rules')
    .select('*')
    .eq('enabled', true)

  if (!rules || rules.length === 0) {
    return { matched: false, reason: null }
  }

  for (const rule of rules as BlockRule[]) {
    if (rule.flow_type !== 'all' && rule.flow_type !== targetFlowType) {
      continue
    }

    let matched = false
    switch (rule.rule_type) {
      case 'email':
        matched = params.email !== null && params.email.toLowerCase() === rule.rule_value.toLowerCase()
        break
      case 'user_id':
        matched = params.userId !== null && params.userId === rule.rule_value
        break
      case 'visitor_id':
        matched = params.visitorId !== null && params.visitorId === rule.rule_value
        break
      case 'ip':
        matched = params.ip !== null && params.ip === rule.rule_value
        break
      case 'path':
        matched = params.path === rule.rule_value
        break
      case 'user_agent':
        matched = params.userAgent !== null && params.userAgent.includes(rule.rule_value)
        break
    }

    if (matched) {
      const reason = `blocked_by_${rule.rule_type}_rule`
      return { matched: true, reason }
    }
  }

  return { matched: false, reason: null }
}

/**
 * Check if there is an unresolved "study_visitor" workflow for the given
 * user that was created within the last 24 hours.
 */
export async function checkLoggedInFirstVisitDedup24h(
  supabase: SupabaseClient,
  userId: string
): Promise<{ hasPending: boolean; existingInstanceId: string | null; reason: string | null }> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: existing } = await supabase
    .from('workflow_instances')
    .select('id')
    .eq('reference_type', LOGGED_IN_FIRST_VISIT_DEFINITION_KEY)
    .eq('reference_id', userId)
    .in('status', UNRESOLVED_STATUSES)
    .gte('created_at', twentyFourHoursAgo)
    .maybeSingle()

  if (existing) {
    return {
      hasPending: true,
      existingInstanceId: existing.id,
      reason: 'pending_logged_in_first_visit_within_24h',
    }
  }

  return { hasPending: false, existingInstanceId: null, reason: null }
}

/**
 * Full eligibility check for the logged-in first visit workflow.
 * Order:
 * 1. workflow enabled
 * 2. admin path check
 * 3. admin user check
 * 4. block rules check
 * 5. 24h dedup check
 */
export async function getLoggedInFirstVisitEligibility(
  supabase: SupabaseClient,
  params: {
    userId: string
    email: string | null
    path: string
    isAdmin: boolean
    ip: string | null
    userAgent: string | null
  }
): Promise<WorkflowEligibilityResult & { pendingInstanceId?: string | null }> {
  const config = getStudyVisitorWorkflowConfig()

  if (!config.enabled) {
    return { eligible: false, reason: 'workflow_disabled' }
  }

  if (isAdminPath(params.path)) {
    return { eligible: false, reason: 'admin_path' }
  }

  if (params.isAdmin) {
    return { eligible: false, reason: 'admin_user' }
  }

  const blockCheck = await checkVisitorFlowBlockRules(supabase, {
    email: params.email,
    userId: params.userId,
    visitorId: null,
    ip: params.ip,
    path: params.path,
    userAgent: params.userAgent,
  }, 'logged_in_first_visit')

  if (blockCheck.matched) {
    return { eligible: false, reason: blockCheck.reason! }
  }

  const dedupCheck = await checkLoggedInFirstVisitDedup24h(supabase, params.userId)

  if (dedupCheck.hasPending) {
    return {
      eligible: false,
      reason: dedupCheck.reason!,
      pendingInstanceId: dedupCheck.existingInstanceId,
    }
  }

  return { eligible: true, reason: 'eligible' }
}
