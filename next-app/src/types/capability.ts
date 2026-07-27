export type CapabilityRisk = 'low' | 'medium' | 'high' | 'critical'

export type CapabilityStatus = 'available' | 'unavailable' | 'disabled'

export type CapabilityCategory =
  | 'Browser'
  | 'Git'
  | 'GitHub'
  | 'Project'
  | 'Provider'
  | 'Verification'
  | 'File'
  | 'Shell'
  | 'App'
  | 'Connector'
  | '其他'

export type VerificationStatus = 'verified' | 'pending' | 'failed' | 'none'

export type CapabilityPermission = {
  scope: string
  description: string
}

export type ProviderMetadata = {
  id: string
  displayName: string
}

export type CapabilityDefinition = {
  id: string
  displayName: string
  description: string
  category: CapabilityCategory
  risk: CapabilityRisk
  status: CapabilityStatus
  provider: ProviderMetadata
  defaultProvider: string
  permissions: CapabilityPermission[]
  supportsCancel: boolean
  timeoutMs: number
  evidenceRequired: boolean
  verificationStatus: VerificationStatus
  requiresConfirmation: boolean
  lastCalledAt: string | null
  lastResult: string | null
  lastDiagnosticId: string | null
}

export type CapabilityRun = {
  id: string
  capabilityId: string
  intent: string
  args: Record<string, unknown>
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  result: string | null
  diagnosticId: string | null
  evidenceId: string | null
  verificationStatus: VerificationStatus
  approvalRequired: boolean
  approvedBy: string | null
  startedAt: string
  completedAt: string | null
  error: string | null
}

export type CapabilityEvidence = {
  id: string
  capabilityId: string
  runId: string
  type: string
  content: string
  contentType: string
  createdAt: string
  verificationStatus: VerificationStatus
}

export type CapabilitySettings = {
  enabled: boolean
  defaultProvider: string
  timeoutMs: number
  userLevelPolicy: 'allow' | 'confirm' | 'deny'
  requiresConfirmation: boolean
}

export type SystemContextCapability = {
  id: string
  displayName: string
  description: string
  risk: CapabilityRisk
  availability: CapabilityStatus
  requiresConfirmation: boolean
}

export type JimmySystemContext = {
  identity: string
  projectSecuritySummary: string
  availableCapabilities: SystemContextCapability[]
  unavailableCapabilities: string[]
  rules: string[]
  warnings: string[]
}

export type AuditEntry = {
  action: string
  field: string
  oldValue: string
  newValue: string
  actor: string
  timestamp: string
}
