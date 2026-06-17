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
