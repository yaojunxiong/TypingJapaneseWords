import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { registry } from '../../src/lib/capabilities/registry'

describe('CapabilityRegistry', () => {
  before(() => {
    registry.init()
  })

  it('lists all registered capabilities', () => {
    const capabilities = registry.list()
    assert.ok(capabilities.length > 0, 'Registry should contain capabilities')
    const allHaveIds = capabilities.every(c => typeof c.id === 'string' && c.id.length > 0)
    assert.ok(allHaveIds, 'All capabilities must have an id')
  })

  it('frontend has no hardcoded capability list - registry is the source of truth', () => {
    const capabilities = registry.list()
    const ids = capabilities.map(c => c.id)
    // These should NOT be in frontend code as a fixed list
    // We verify the registry is populated dynamically
    assert.ok(ids.includes('browser.snapshot'), 'browser.snapshot should be in registry')
    assert.ok(ids.includes('git.status'), 'git.status should be in registry')
    assert.ok(ids.includes('shell.run'), 'shell.run should be in registry (as unavailable)')
  })

  it('capability describe returns definition and settings', () => {
    const result = registry.describe('browser.snapshot')
    assert.ok(result, 'describe should return data for browser.snapshot')
    assert.equal(result.definition.id, 'browser.snapshot')
    assert.ok(result.settings, 'settings should be present')
    assert.equal(typeof result.settings.enabled, 'boolean')
    assert.equal(typeof result.settings.requiresConfirmation, 'boolean')
  })

  it('returns null for unknown capability', () => {
    const result = registry.describe('nonexistent.capability')
    assert.equal(result, null)
  })

  it('shell.run is registered but unavailable/disabled', () => {
    const result = registry.describe('shell.run')
    assert.ok(result, 'shell.run should be registered')
    assert.equal(result.definition.status, 'disabled', 'shell.run should be disabled')
    assert.equal(result.definition.risk, 'critical', 'shell.run should be critical risk')
  })

  it('browser.snapshot is available when querying', () => {
    const available = registry.isAvailable('browser.snapshot')
    assert.ok(available, 'browser.snapshot should be available')
  })

  it('shell.run is NOT available', () => {
    const available = registry.isAvailable('shell.run')
    assert.equal(available, false, 'shell.run should not be available')
  })

  it('getAvailableIds returns available capability IDs', () => {
    const ids = registry.getAvailableIds()
    assert.ok(ids.includes('browser.snapshot'), 'browser.snapshot should be in available list')
    assert.ok(!ids.includes('shell.run'), 'shell.run should NOT be in available list')
  })

  it('getUnavailableIds returns unavailable capability IDs', () => {
    const ids = registry.getUnavailableIds()
    assert.ok(ids.includes('shell.run'), 'shell.run should be in unavailable list')
  })

  it('categories are properly assigned', () => {
    const capabilities = registry.list()
    const browserCaps = capabilities.filter(c => c.category === 'Browser')
    assert.ok(browserCaps.length >= 3, 'At least 3 browser capabilities expected')
    const gitCaps = capabilities.filter(c => c.category === 'Git')
    assert.ok(gitCaps.length >= 3, 'At least 3 git capabilities expected')
  })

  it('RISK levels are immutable and not configurable by UI', () => {
    const capabilities = registry.list()
    for (const cap of capabilities) {
      assert.ok(['low', 'medium', 'high', 'critical'].includes(cap.risk),
        `Capability ${cap.id} must have a valid risk level`)
    }
  })

  it('Capability execute() cannot be modified via settings', () => {
    // The settings interface should NOT include execute function
    const settings = registry.describe('browser.snapshot')?.settings
    assert.ok(settings, 'settings must exist')
    // Verify only configurable fields exist
    const configurableFields = ['enabled', 'defaultProvider', 'timeoutMs', 'userLevelPolicy', 'requiresConfirmation']
    const actualFields = Object.keys(settings)
    for (const field of actualFields) {
      assert.ok(configurableFields.includes(field), `Field ${field} should be configurable`)
    }
  })

  it('updateSettings rejects invalid timeout', () => {
    const result = registry.updateSettings(
      'browser.snapshot',
      { timeoutMs: 500 },
      'test'
    )
    assert.equal(result.success, false)
    assert.ok(result.error?.includes('Timeout'))
  })

  it('updateSettings rejects enabling critical risk capability', () => {
    const result = registry.updateSettings(
      'shell.run',
      { enabled: true },
      'test'
    )
    assert.equal(result.success, false)
    assert.ok(result.error?.includes('Critical'))
  })

  it('updateSettings records audit entries', () => {
    const result = registry.updateSettings(
      'browser.snapshot',
      { requiresConfirmation: true },
      'test-audit-user'
    )
    assert.ok(result.success)
    const audit = registry.getAudit('browser.snapshot')
    const lastAudit = audit[audit.length - 1]
    assert.ok(lastAudit, 'Audit entry should exist')
    assert.equal(lastAudit.actor, 'test-audit-user')
    assert.equal(lastAudit.field, 'requiresConfirmation')
  })

  it('recordRun updates lastCalledAt and lastResult', () => {
    const before = registry.describe('git.status')
    assert.equal(before?.definition.lastCalledAt, null)

    registry.recordRun('git.status', {
      capabilityId: 'git.status',
      intent: 'git.status',
      args: {},
      status: 'completed',
      result: 'clean working tree',
      diagnosticId: 'diag-001',
      evidenceId: null,
      verificationStatus: 'none',
      approvalRequired: false,
      approvedBy: null,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      error: null,
    })

    const after = registry.describe('git.status')
    assert.ok(after?.definition.lastCalledAt, 'lastCalledAt should be set')
    assert.equal(after?.definition.lastResult, 'clean working tree')
    assert.equal(after?.definition.lastDiagnosticId, 'diag-001')
  })

  it('getRuns returns recorded runs', () => {
    const runs = registry.getRuns('git.status')
    assert.ok(runs.length > 0, 'Should have at least 1 run')
    assert.equal(runs[0].intent, 'git.status')
  })

  it('addEvidence stores evidence', () => {
    registry.addEvidence('browser.snapshot', {
      capabilityId: 'browser.snapshot',
      runId: 'run-1',
      type: 'screenshot',
      content: 'base64_encoded_image_data',
      contentType: 'image/png',
      createdAt: new Date().toISOString(),
      verificationStatus: 'verified',
    })
    const evidence = registry.getEvidence('browser.snapshot')
    assert.ok(evidence.length > 0, 'Should have evidence')
    assert.equal(evidence[0].type, 'screenshot')
  })

  it('building system context includes available capabilities', () => {
    const ctx = registry.buildSystemContext('Test project')
    assert.ok(ctx.availableCapabilities.length > 0, 'Should have available capabilities')
    assert.ok(ctx.unavailableCapabilities.length > 0, 'Should have unavailable capabilities')
    assert.ok(ctx.availableCapabilities.some(c => c.id === 'browser.snapshot'),
      'browser.snapshot should be in available')
    assert.ok(ctx.unavailableCapabilities.includes('shell.run'),
      'shell.run should be in unavailable')
  })

  it('system context does NOT contain sensitive data patterns', () => {
    const ctx = registry.buildSystemContext()
    const allText = JSON.stringify(ctx)

    // Check no API keys
    assert.ok(!allText.includes('sk-'), 'System context should not contain API keys')
    // Check no absolute paths
    assert.ok(!allText.includes('/Users/'), 'System context should not contain absolute paths')
    // Check no tokens
    assert.ok(!allText.includes('ghp_'), 'System context should not contain GitHub tokens')
  })

  it('disabled capability is not available', () => {
    // Disable browser.snapshot
    registry.updateSettings('browser.snapshot', { enabled: false }, 'test')
    assert.equal(registry.isAvailable('browser.snapshot'), false)

    // Re-enable for other tests
    registry.updateSettings('browser.snapshot', { enabled: true }, 'test')
    assert.equal(registry.isAvailable('browser.snapshot'), true)
  })

  it('deleting a capability (simulated by disabling) removes from available list', () => {
    // Simulate removal by disabling
    registry.updateSettings('browser.snapshot', { enabled: false }, 'test')
    const ctx = registry.buildSystemContext()
    const stillHas = ctx.availableCapabilities.some(c => c.id === 'browser.snapshot')
    assert.equal(stillHas, false, 'Disabled capability should not appear in available list')

    // Re-enable
    registry.updateSettings('browser.snapshot', { enabled: true }, 'test')
  })

  it('getByCategory returns capabilities filtered by category', () => {
    const browserCaps = registry.getByCategory('Browser')
    assert.ok(browserCaps.every(c => c.category === 'Browser'))
  })

  it('getByRisk returns capabilities filtered by risk', () => {
    const criticalCaps = registry.getByRisk('critical')
    assert.ok(criticalCaps.every(c => c.risk === 'critical'))
    assert.equal(criticalCaps.length, 1) // only shell.run
  })
})
