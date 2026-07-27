import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { buildJimmySystemContext, buildCapabilityIntentPrompt } from '../../src/lib/jimmy-identity/context-injector'
import { registry } from '../../src/lib/capabilities/registry'

describe('JimmyIdentity', () => {
  before(() => {
    registry.init()
  })

  it('buildJimmySystemContext returns identity string', () => {
    const ctx = buildJimmySystemContext()
    assert.ok(ctx.identity.includes('Jimmy AIOS'), 'Identity should identify as Jimmy AIOS')
    assert.ok(ctx.identity.includes('NOT'), 'Identity should clearly state NOT being a text chatbot')
  })

  it('buildJimmySystemContext includes available and unavailable capabilities', () => {
    const ctx = buildJimmySystemContext()
    assert.ok(ctx.availableCapabilities.length > 0, 'Should list available capabilities')
    assert.ok(ctx.unavailableCapabilities.length > 0, 'Should list unavailable capabilities')
  })

  it('each available capability has required fields', () => {
    const ctx = buildJimmySystemContext()
    for (const cap of ctx.availableCapabilities) {
      assert.ok(typeof cap.id === 'string' && cap.id.length > 0, 'id required')
      assert.ok(typeof cap.displayName === 'string' && cap.displayName.length > 0, 'displayName required')
      assert.ok(typeof cap.description === 'string', 'description required')
      assert.ok(['low', 'medium', 'high', 'critical'].includes(cap.risk), `risk must be valid for ${cap.id}`)
      assert.ok(['available', 'unavailable', 'disabled'].includes(cap.availability), `availability must be valid for ${cap.id}`)
      assert.equal(typeof cap.requiresConfirmation, 'boolean', 'requiresConfirmation must be boolean')
    }
  })

  it('System Context does NOT contain API keys', () => {
    const ctx = buildJimmySystemContext()
    const allText = JSON.stringify(ctx)
    const dangerousPatterns = [
      /sk-[a-zA-Z0-9]{20,}/,
      /ghp_[a-zA-Z0-9]{36}/,
      /api[_-]?key/i,
      /xox[baprs]-/,
    ]
    for (const pattern of dangerousPatterns) {
      assert.ok(!pattern.test(allText), `Should not contain pattern: ${pattern}`)
    }
  })

  it('System Context does NOT contain absolute local paths', () => {
    const ctx = buildJimmySystemContext()
    const allText = JSON.stringify(ctx)
    assert.ok(!allText.includes('/Users/'), 'Should not contain /Users/ paths')
    assert.ok(!allText.includes('/home/'), 'Should not contain /home/ paths')
  })

  it('System Context includes behavioral rules', () => {
    const ctx = buildJimmySystemContext()
    assert.ok(ctx.rules.length > 0, 'Should have rules')
    assert.ok(ctx.rules.some(r => r.includes('Capability Registry')), 'Rules should mention Capability Registry')
  })

  it('System Context includes security warnings', () => {
    const ctx = buildJimmySystemContext()
    assert.ok(ctx.warnings.length > 0, 'Should have warnings')
    assert.ok(ctx.warnings.some(w => w.includes('API keys') || w.includes('credentials')), 'Warnings should mention API keys')
  })

  it('browser.snapshot intent is parsed from screenshot request', () => {
    const msg = '帮我截图当前页面'
    const intent = buildCapabilityIntentPrompt(msg)
    assert.equal(intent, 'browser.snapshot', 'Screenshot request should map to browser.snapshot')
  })

  it('browser.snapshot intent from English request', () => {
    const msg = 'Can you take a screenshot?'
    const intent = buildCapabilityIntentPrompt(msg)
    assert.equal(intent, 'browser.snapshot', 'English screenshot request should map to browser.snapshot')
  })

  it('shell.run returns null when shell.run is disabled', () => {
    const msg = '帮我运行 Shell 命令'
    const intent = buildCapabilityIntentPrompt(msg)
    // shell.run is disabled by default, should return null
    assert.equal(intent, null, 'Shell command should return null when shell.run is disabled')
  })

  it('shell.run is explicitly not available - model should say not integrated', () => {
    const available = registry.isAvailable('shell.run')
    assert.equal(available, false, 'shell.run should not be available')
  })

  it('REMOVING browser.snapshot makes it unavailable', () => {
    // Simulate removal
    registry.updateSettings('browser.snapshot', { enabled: false }, 'test')
    const available = registry.isAvailable('browser.snapshot')
    assert.equal(available, false, 'After disabling, browser.snapshot should be unavailable')

    const ctx = buildJimmySystemContext()
    const stillPresent = ctx.availableCapabilities.some(c => c.id === 'browser.snapshot')
    assert.equal(stillPresent, false, 'Disabled browser.snapshot should not appear in available list')

    // Re-enable for other tests
    registry.updateSettings('browser.snapshot', { enabled: true }, 'test')
  })

  it('description field is sanitized and does not contain sensitive data', () => {
    const ctx = buildJimmySystemContext()
    for (const cap of ctx.availableCapabilities) {
      const desc = cap.description
      assert.ok(!desc.includes('/Users/'), `Description should not contain paths: ${cap.id}`)
      assert.ok(desc.length < 500, `Description should be within reasonable length: ${cap.id}`)
    }
  })
})
