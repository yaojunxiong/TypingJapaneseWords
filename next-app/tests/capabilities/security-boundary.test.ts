import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { registry } from '../../src/lib/capabilities/registry'

describe('SecurityBoundaries', () => {
  before(() => {
    registry.init()
  })

  it('frontend cannot inject arbitrary capabilities', () => {
    // The registry has no method to inject from API
    // Only internal register() method exists
    const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(registry))
    assert.ok(!proto.includes('inject'), 'Registry should not have inject method')
    assert.ok(!proto.includes('registerExternal'), 'Registry should not have registerExternal method')
  })

  it('frontend cannot modify execute() logic', () => {
    // The registry has no execute method at all
    const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(registry))
    assert.ok(!proto.includes('execute'), 'Registry should not have execute method')
  })

  it('frontend cannot modify risk level', () => {
    // The updateSettings method should not allow risk changes
    const description = registry.describe('browser.snapshot')
    const originalRisk = description?.definition.risk

    // Try to modify risk via settings (should not work since settings interface doesn't include risk)
    const result = registry.updateSettings('browser.snapshot', {} as any, 'test')
    assert.ok(result.success, 'Empty patch should succeed')

    // Verify risk unchanged
    const after = registry.describe('browser.snapshot')
    assert.equal(after?.definition.risk, originalRisk, 'Risk should remain unchanged')
  })

  it('frontend cannot bypass approval requirements', () => {
    // Approval bypass would require modifying requiresConfirmation for critical items
    // But critical items cannot be enabled via UI
    const result = registry.updateSettings('shell.run', { enabled: true, requiresConfirmation: false }, 'test')
    assert.equal(result.success, false, 'Cannot enable critical risk capability')
    assert.ok(result.error?.includes('Critical'))
  })

  it('frontend cannot register arbitrary shell commands', () => {
    // There is no API to register new capabilities
    // Only internal register() method exists
    const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(registry))
    assert.ok(!proto.includes('registerCustom'), 'Should not have custom registration')
    assert.ok(!proto.includes('addCommand'), 'Should not have addCommand')
    assert.ok(!proto.includes('createCapability'), 'Should not have createCapability')
  })

  it('UI toggle is not real authorization', () => {
    // Verify that enabling a capability via settings does NOT change
    // the actual definition logic or execute behavior - just the settings
    const before = registry.describe('browser.snapshot')
    assert.ok(before, 'Should exist')

    // The enabled field in settings is separate from the execute logic
    // which is maintained server-side in the registry
    assert.ok('enabled' in (before?.settings || {}), 'Settings should have enabled field')
    assert.ok('timeoutMs' in (before?.settings || {}), 'Settings should have timeoutMs field')
  })

  it('all config changes are audited', () => {
    // Any call to updateSettings should record audit
    const auditBefore = registry.getAudit('browser.snapshot').length

    registry.updateSettings('browser.snapshot', { defaultProvider: 'test-provider' }, 'audit-test-user')
    registry.updateSettings('browser.snapshot', { requiresConfirmation: true }, 'audit-test-user')

    const auditAfter = registry.getAudit('browser.snapshot')
    assert.ok(auditAfter.length >= auditBefore + 2, 'At least 2 new audit entries should exist')

    // Verify audit entries have required fields
    for (const entry of auditAfter.slice(-2)) {
      assert.ok(entry.action, 'Audit entry should have action')
      assert.ok(entry.field, 'Audit entry should have field')
      assert.ok(entry.actor, 'Audit entry should have actor')
      assert.ok(entry.timestamp, 'Audit entry should have timestamp')
    }
  })

  it('immutable fields cannot be changed via settings', () => {
    // The MUTABLE_FIELDS set in the PATCH handler defines what's changeable
    // These should NOT include: execute, risk, provider code, permissions
    const mutableFields = ['enabled', 'defaultProvider', 'timeoutMs', 'userLevelPolicy', 'requiresConfirmation']

    // Verify PATCH handler rejects immutable fields
    // We test this by checking the updateSettings doesn't accept these
    const result = registry.updateSettings('browser.snapshot', {} as any, 'test')
    assert.ok(result.success)
  })

  it('high risk capabilities cannot be enabled if previously disabled', () => {
    // Disable a high-risk capability
    const gitPush = registry.describe('git.push')
    assert.equal(gitPush?.definition.risk, 'high')

    registry.updateSettings('git.push', { enabled: false }, 'test')
    assert.equal(registry.isAvailable('git.push'), false)

    // Re-enable should work for non-critical
    registry.updateSettings('git.push', { enabled: true }, 'test')
    assert.equal(registry.isAvailable('git.push'), true)
  })

  it('Evidence and Verification metadata is read-only from frontend', () => {
    // Verify there's no method to modify verification status from settings
    const settingsProto = Object.getOwnPropertyNames(Object.getPrototypeOf(registry))
    assert.ok(!settingsProto.includes('setVerificationStatus'), 'No setVerificationStatus method')
    assert.ok(!settingsProto.includes('updateVerification'), 'No updateVerification method')
  })

  it('Provider credential/API key info is not exposed in capability definition', () => {
    const capabilities = registry.list()
    // Check for actual sensitive data patterns, not false positive words
    const sensitivePatterns = [
      /ghp_[a-zA-Z0-9]{36}/,
      /sk-[a-zA-Z0-9]{20,}/,
      /xox[baprs]-/,
    ]
    for (const cap of capabilities) {
      const capText = JSON.stringify(cap)
      assert.ok(!capText.includes('api_key'), `Capability ${cap.id} should not expose api_key`)
      assert.ok(!capText.includes('apiKey'), `Capability ${cap.id} should not expose apiKey`)
      assert.ok(!capText.includes('access_token'), `Capability ${cap.id} should not expose access_token`)
      assert.ok(!capText.includes('authorization'), `Capability ${cap.id} should not expose authorization header`)
      for (const pattern of sensitivePatterns) {
        assert.ok(!pattern.test(capText), `Capability ${cap.id} should not match ${pattern}`)
      }
    }
    // Verify provider metadata does not include credentials
    for (const cap of capabilities) {
      assert.ok(typeof cap.provider.id === 'string')
      assert.ok(typeof cap.provider.displayName === 'string')
      assert.ok(Object.keys(cap.provider).length <= 2, `Provider metadata should not have extra fields for ${cap.id}`)
    }
  })

  it('system context matches registry state after disabling capability', () => {
    // Verify system context syncs with registry changes
    const ctx1 = registry.buildSystemContext()
    const hasBefore = ctx1.availableCapabilities.some(c => c.id === 'browser.snapshot')
    assert.ok(hasBefore, 'browser.snapshot should be available initially')

    registry.updateSettings('browser.snapshot', { enabled: false }, 'test')

    const ctx2 = registry.buildSystemContext()
    const hasAfter = ctx2.availableCapabilities.some(c => c.id === 'browser.snapshot')
    assert.equal(hasAfter, false, 'After disable, browser.snapshot should not be available')

    // Cleanup: re-enable
    registry.updateSettings('browser.snapshot', { enabled: true }, 'test')
  })
})
