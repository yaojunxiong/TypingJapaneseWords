import type { SupabaseClient } from '@supabase/supabase-js'

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

export type WorkflowEligibilityResult = {
  eligible: boolean
  reason: string
}

export async function getStudyVisitorWorkflowEligibility(
  supabase: SupabaseClient,
  params: {
    userId: string | null
    path: string
    isAdmin: boolean
  }
): Promise<WorkflowEligibilityResult> {
  const config = getStudyVisitorWorkflowConfig()

  if (!config.enabled) {
    return { eligible: false, reason: 'workflow_disabled' }
  }

  if (config.ignoreAdminPaths && isAdminPath(params.path)) {
    return { eligible: false, reason: 'admin_path_ignored' }
  }

  if (config.ignoreAdminUsers && params.isAdmin) {
    return { eligible: false, reason: 'admin_user_ignored' }
  }

  if (!params.userId) {
    return { eligible: false, reason: 'anonymous_visitor' }
  }

  const { data: existing } = await supabase
    .from('workflow_instances')
    .select('id')
    .eq('reference_type', 'study_visitor')
    .eq('reference_id', params.userId)
    .in('status', ['running'])
    .maybeSingle()

  if (existing) {
    return { eligible: false, reason: 'workflow_already_exists' }
  }

  return { eligible: true, reason: 'eligible' }
}
