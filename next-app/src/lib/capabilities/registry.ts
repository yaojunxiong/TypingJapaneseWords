import type {
  CapabilityDefinition,
  CapabilityRun,
  CapabilityEvidence,
  CapabilitySettings,
  CapabilityCategory,
  CapabilityRisk,
  VerificationStatus,
  SystemContextCapability,
  JimmySystemContext,
} from '@/types/capability'

type RegistryEntry = {
  definition: CapabilityDefinition
  settings: CapabilitySettings
  audit: AuditEntry[]
}

type AuditEntry = {
  action: string
  field: string
  oldValue: string
  newValue: string
  actor: string
  timestamp: string
}

const categories: CapabilityCategory[] = [
  'Browser', 'Git', 'GitHub', 'Project', 'Provider',
  'Verification', 'File', 'Shell', 'App', 'Connector', '其他',
]

function toStatus(available: boolean, disabled: boolean): 'available' | 'unavailable' | 'disabled' {
  if (disabled) return 'disabled'
  if (available) return 'available'
  return 'unavailable'
}

function now(): string {
  return new Date().toISOString()
}

const DEFAULT_SETTINGS: CapabilitySettings = {
  enabled: true,
  defaultProvider: 'system',
  timeoutMs: 30000,
  userLevelPolicy: 'confirm',
  requiresConfirmation: false,
}

function defineCapability(
  id: string,
  displayName: string,
  description: string,
  category: CapabilityCategory,
  risk: CapabilityRisk,
  available: boolean,
  disabled: boolean,
  permissions: { scope: string; description: string }[],
  supportsCancel: boolean,
  timeoutMs: number,
  evidenceRequired: boolean,
  requiresConfirmation: boolean,
): RegistryEntry {
  const definition: CapabilityDefinition = {
    id,
    displayName,
    description,
    category,
    risk,
    status: toStatus(available, disabled),
    provider: { id: 'system', displayName: 'System' },
    defaultProvider: 'system',
    permissions,
    supportsCancel,
    timeoutMs,
    evidenceRequired,
    verificationStatus: 'none',
    requiresConfirmation,
    lastCalledAt: null,
    lastResult: null,
    lastDiagnosticId: null,
  }
  return {
    definition,
    settings: { ...DEFAULT_SETTINGS, timeoutMs, requiresConfirmation, enabled: !disabled },
    audit: [],
  }
}

class CapabilityRegistry {
  private entries: Map<string, RegistryEntry> = new Map()
  private runs: Map<string, CapabilityRun[]> = new Map()
  private evidence: Map<string, CapabilityEvidence[]> = new Map()
  private runCounter = 0
  private initialized = false

  init() {
    if (this.initialized) return
    this.initialized = true

    // ── Browser ──
    this.register(defineCapability(
      'browser.snapshot',
      'Browser Screenshot',
      'Capture a screenshot of the current browser page. Uses Playwright/Puppeteer to render and snapshot the page as a PNG image.',
      'Browser', 'low', true, false,
      [{ scope: 'browser:snapshot', description: 'Capture page screenshots' }],
      true, 30000, true, false,
    ))
    this.register(defineCapability(
      'browser.navigate',
      'Browser Navigation',
      'Navigate the browser to a specified URL and return page metadata.',
      'Browser', 'low', true, false,
      [{ scope: 'browser:navigate', description: 'Navigate to URLs' }],
      true, 15000, false, false,
    ))
    this.register(defineCapability(
      'browser.evaluate',
      'Browser JavaScript Evaluation',
      'Execute JavaScript in the browser context and return results. Highly restricted.',
      'Browser', 'high', false, false,
      [{ scope: 'browser:evaluate', description: 'Execute JavaScript in browser' }],
      true, 30000, true, true,
    ))

    // ── Git ──
    this.register(defineCapability(
      'git.status',
      'Git Status',
      'Check the current git repository status including staged, unstaged, and untracked files.',
      'Git', 'low', true, false,
      [{ scope: 'git:read', description: 'Read git status' }],
      true, 10000, false, false,
    ))
    this.register(defineCapability(
      'git.diff',
      'Git Diff',
      'Show uncommitted changes in the git working tree.',
      'Git', 'low', true, false,
      [{ scope: 'git:read', description: 'Read git diff' }],
      true, 10000, false, false,
    ))
    this.register(defineCapability(
      'git.commit',
      'Git Commit',
      'Create a new git commit with the specified message. Includes staged changes only.',
      'Git', 'medium', true, false,
      [{ scope: 'git:write', description: 'Create git commits' }],
      true, 15000, true, true,
    ))
    this.register(defineCapability(
      'git.push',
      'Git Push',
      'Push local commits to remote repository.',
      'Git', 'high', true, false,
      [{ scope: 'git:write', description: 'Push to remote' }],
      false, 30000, true, true,
    ))

    // ── GitHub ──
    this.register(defineCapability(
      'github.pr.list',
      'GitHub PR List',
      'List open pull requests for the current repository.',
      'GitHub', 'low', true, false,
      [{ scope: 'github:read', description: 'List pull requests' }],
      true, 15000, false, false,
    ))
    this.register(defineCapability(
      'github.pr.create',
      'GitHub PR Create',
      'Create a new pull request on GitHub from the current branch.',
      'GitHub', 'medium', true, false,
      [{ scope: 'github:write', description: 'Create pull requests' }],
      true, 20000, true, true,
    ))
    this.register(defineCapability(
      'github.issue.list',
      'GitHub Issue List',
      'List issues for the current repository with optional filters.',
      'GitHub', 'low', true, false,
      [{ scope: 'github:read', description: 'List issues' }],
      true, 15000, false, false,
    ))

    // ── Project ──
    this.register(defineCapability(
      'project.read',
      'Project File Read',
      'Read a file from the project filesystem. Restricted to workspace files.',
      'Project', 'medium', true, false,
      [{ scope: 'project:read', description: 'Read project files' }],
      true, 10000, false, false,
    ))
    this.register(defineCapability(
      'project.search',
      'Project Search',
      'Search for text patterns across project files using glob and regex.',
      'Project', 'low', true, false,
      [{ scope: 'project:read', description: 'Search project files' }],
      true, 15000, false, false,
    ))
    this.register(defineCapability(
      'project.write',
      'Project File Write',
      'Write content to a project file. First requires read access and confirmation.',
      'Project', 'high', true, false,
      [{ scope: 'project:write', description: 'Write project files' }],
      true, 10000, true, true,
    ))

    // ── Provider ──
    this.register(defineCapability(
      'provider.list',
      'List Providers',
      'List all registered model providers and their status.',
      'Provider', 'low', true, false,
      [{ scope: 'provider:read', description: 'List providers' }],
      true, 5000, false, false,
    ))
    this.register(defineCapability(
      'provider.configure',
      'Configure Provider',
      'Update provider configuration. Only existing providers can be reconfigured.',
      'Provider', 'high', true, false,
      [{ scope: 'provider:write', description: 'Configure providers' }],
      true, 10000, true, true,
    ))

    // ── Verification ──
    this.register(defineCapability(
      'verification.email',
      'Email Verification',
      'Send verification emails and check verification status.',
      'Verification', 'low', true, false,
      [{ scope: 'verification:email', description: 'Send verification emails' }],
      true, 15000, true, false,
    ))
    this.register(defineCapability(
      'verification.check',
      'Verification Check',
      'Check the verification status of a user or action.',
      'Verification', 'low', true, false,
      [{ scope: 'verification:read', description: 'Check verification status' }],
      true, 5000, false, false,
    ))

    // ── File ──
    this.register(defineCapability(
      'file.upload',
      'File Upload',
      'Upload a file to the system storage. Supports images, audio, and documents.',
      'File', 'medium', true, false,
      [{ scope: 'file:write', description: 'Upload files' }],
      true, 60000, true, false,
    ))
    this.register(defineCapability(
      'file.download',
      'File Download',
      'Download a file from system storage by ID.',
      'File', 'low', true, false,
      [{ scope: 'file:read', description: 'Download files' }],
      true, 30000, false, false,
    ))
    this.register(defineCapability(
      'file.list',
      'File List',
      'List files in a directory or by filter.',
      'File', 'low', true, false,
      [{ scope: 'file:read', description: 'List files' }],
      true, 10000, false, false,
    ))

    // ── Shell ──
    this.register(defineCapability(
      'shell.run',
      'Shell Command Execution',
      'Execute arbitrary shell commands in the system. High-risk operation requiring explicit approval.',
      'Shell', 'critical', false, true,
      [{ scope: 'shell:execute', description: 'Execute shell commands' }],
      false, 60000, true, true,
    ))

    // ── App ──
    this.register(defineCapability(
      'app.info',
      'App Information',
      'Read application metadata including version, environment, and configuration summary (no secrets).',
      'App', 'low', true, false,
      [{ scope: 'app:read', description: 'Read app info' }],
      true, 5000, false, false,
    ))
    this.register(defineCapability(
      'app.audit',
      'App Audit Log',
      'Read audit log entries for capability operations.',
      'App', 'medium', true, false,
      [{ scope: 'app:audit', description: 'Read audit logs' }],
      true, 15000, false, false,
    ))

    // ── Connector ──
    this.register(defineCapability(
      'connector.email',
      'Email Connector',
      'Send emails through the configured email provider (Brevo SMTP).',
      'Connector', 'medium', true, false,
      [{ scope: 'connector:email', description: 'Send emails' }],
      true, 15000, true, true,
    ))
    this.register(defineCapability(
      'connector.supabase',
      'Supabase Connector',
      'Interact with Supabase database for data storage and retrieval.',
      'Connector', 'medium', true, false,
      [{ scope: 'connector:supabase', description: 'Use Supabase operations' }],
      true, 30000, true, false,
    ))

    // ── 其他 ──
    this.register(defineCapability(
      'system.health',
      'System Health',
      'Check system health status including uptime, memory, and response times.',
      '其他', 'low', true, false,
      [{ scope: 'system:read', description: 'Check system health' }],
      true, 5000, false, false,
    ))
    this.register(defineCapability(
      'admin.access',
      'Admin Access Check',
      'Verify current user has admin privileges and retrieve role information.',
      '其他', 'medium', true, false,
      [{ scope: 'admin:read', description: 'Check admin access' }],
      true, 5000, false, false,
    ))
  }

  private register(entry: RegistryEntry) {
    this.entries.set(entry.definition.id, entry)
  }

  list(): CapabilityDefinition[] {
    return Array.from(this.entries.values()).map(e => ({ ...e.definition }))
  }

  describe(id: string): { definition: CapabilityDefinition; settings: CapabilitySettings } | null {
    const entry = this.entries.get(id)
    if (!entry) return null
    return { definition: { ...entry.definition }, settings: { ...entry.settings } }
  }

  getByCategory(category: CapabilityCategory): CapabilityDefinition[] {
    return this.list().filter(c => c.category === category)
  }

  getCategories(): CapabilityCategory[] {
    return [...categories]
  }

  getByRisk(risk: CapabilityRisk): CapabilityDefinition[] {
    return this.list().filter(c => c.risk === risk)
  }

  getAvailableIds(): string[] {
    return this.list()
      .filter(c => c.status === 'available')
      .map(c => c.id)
  }

  getUnavailableIds(): string[] {
    return this.list()
      .filter(c => c.status !== 'available')
      .map(c => c.id)
  }

  isAvailable(id: string): boolean {
    const entry = this.entries.get(id)
    return !!entry && entry.definition.status === 'available' && entry.settings.enabled
  }

  updateSettings(
    id: string,
    patch: Partial<CapabilitySettings>,
    actor: string,
  ): { success: boolean; error?: string } {
    const entry = this.entries.get(id)
    if (!entry) return { success: false, error: 'Capability not found' }

    const oldSettings = { ...entry.settings }

    if (patch.enabled !== undefined) {
      if (patch.enabled && entry.definition.risk === 'critical') {
        return { success: false, error: 'Critical risk capabilities cannot be enabled via UI' }
      }
      entry.settings.enabled = patch.enabled
      entry.audit.push({
        action: 'update',
        field: 'enabled',
        oldValue: String(oldSettings.enabled),
        newValue: String(patch.enabled),
        actor,
        timestamp: now(),
      })
    }

    if (patch.defaultProvider !== undefined) {
      entry.settings.defaultProvider = patch.defaultProvider
      entry.audit.push({
        action: 'update',
        field: 'defaultProvider',
        oldValue: oldSettings.defaultProvider,
        newValue: patch.defaultProvider,
        actor,
        timestamp: now(),
      })
    }

    if (patch.timeoutMs !== undefined) {
      if (patch.timeoutMs < 1000 || patch.timeoutMs > 300000) {
        return { success: false, error: 'Timeout must be between 1000ms and 300000ms' }
      }
      entry.settings.timeoutMs = patch.timeoutMs
      entry.audit.push({
        action: 'update',
        field: 'timeoutMs',
        oldValue: String(oldSettings.timeoutMs),
        newValue: String(patch.timeoutMs),
        actor,
        timestamp: now(),
      })
    }

    if (patch.userLevelPolicy !== undefined) {
      entry.settings.userLevelPolicy = patch.userLevelPolicy
      entry.audit.push({
        action: 'update',
        field: 'userLevelPolicy',
        oldValue: oldSettings.userLevelPolicy,
        newValue: patch.userLevelPolicy,
        actor,
        timestamp: now(),
      })
    }

    if (patch.requiresConfirmation !== undefined) {
      entry.settings.requiresConfirmation = patch.requiresConfirmation
      entry.audit.push({
        action: 'update',
        field: 'requiresConfirmation',
        oldValue: String(oldSettings.requiresConfirmation),
        newValue: String(patch.requiresConfirmation),
        actor,
        timestamp: now(),
      })
    }

    entry.definition.status = entry.settings.enabled
      ? this.entries.get(id)?.definition.status === 'available' ? 'available' : 'available'
      : 'disabled'

    return { success: true }
  }

  recordRun(capabilityId: string, run: Omit<CapabilityRun, 'id'>): CapabilityRun {
    this.runCounter += 1
    const fullRun: CapabilityRun = {
      ...run,
      id: `run-${this.runCounter}-${Date.now()}`,
    }
    const existing = this.runs.get(capabilityId) || []
    existing.unshift(fullRun)
    if (existing.length > 100) existing.pop()
    this.runs.set(capabilityId, existing)

    const entry = this.entries.get(capabilityId)
    if (entry) {
      entry.definition.lastCalledAt = fullRun.startedAt
      entry.definition.lastResult = fullRun.result
      entry.definition.lastDiagnosticId = fullRun.diagnosticId
    }

    return fullRun
  }

  getRuns(capabilityId: string): CapabilityRun[] {
    return this.runs.get(capabilityId) || []
  }

  addEvidence(capabilityId: string, evidence: Omit<CapabilityEvidence, 'id'>): CapabilityEvidence {
    const fullEvidence: CapabilityEvidence = {
      ...evidence,
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }
    const existing = this.evidence.get(capabilityId) || []
    existing.unshift(fullEvidence)
    if (existing.length > 100) existing.pop()
    this.evidence.set(capabilityId, existing)
    return fullEvidence
  }

  getEvidence(capabilityId: string): CapabilityEvidence[] {
    return this.evidence.get(capabilityId) || []
  }

  getAudit(id: string): AuditEntry[] {
    return this.entries.get(id)?.audit || []
  }

  buildSystemContext(
    projectSummary?: string,
  ): JimmySystemContext {
    const all = this.list()
    const available: SystemContextCapability[] = all
      .filter(c => c.status === 'available' && this.entries.get(c.id)?.settings.enabled)
      .map(c => ({
        id: c.id,
        displayName: c.displayName,
        description: c.description,
        risk: c.risk,
        availability: c.status,
        requiresConfirmation: this.entries.get(c.id)?.settings.requiresConfirmation ?? false,
      }))

    const unavailable: string[] = all
      .filter(c => c.status !== 'available' || !this.entries.get(c.id)?.settings.enabled)
      .map(c => c.id)

    return {
      identity: 'Jimmy AIOS - An intelligent operating system with controlled capability execution. Not a general-purpose text chatbot.',
      projectSecuritySummary: projectSummary || 'Secure project workspace with controlled capability access.',
      availableCapabilities: available,
      unavailableCapabilities: unavailable,
      rules: [
        'All operations must go through the Capability Registry.',
        'Do not claim to have executed actions that have not been performed.',
        'Do not directly execute Shell, File, Git, Browser, or Deployment operations yourself.',
        'When execution is needed, output only supported Capability Intents.',
        'If a capability is not available, clearly state it has not been integrated yet.',
      ],
      warnings: [
        'Do not expose API keys, approval tokens, or credentials.',
        'Do not expose absolute local file paths.',
        'Do not include sensitive Event, Audit, or Evidence raw content.',
      ],
    }
  }
}

export const registry = new CapabilityRegistry()
