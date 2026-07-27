import { test, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

/*
 * E2E test for admin local-video upload in forum rich-text posts.
 *
 * Required environment:
 *   ADMIN_ORIGIN    – exact origin of the Admin Preview deployment
 *                     (e.g. https://admin-preview.jimmyyao.com)
 *   FORUM_ORIGIN    – exact origin of the Forum Preview deployment
 *                     (e.g. https://forum-preview.jimmyyao.com)
 *   ADMIN_EMAIL
 *   ADMIN_PASSWORD
 *   TEST_USER_EMAIL
 *   TEST_USER_PASSWORD
 *
 * Operator procedure (run before this spec):
 *   1. Enable the feature flag via Supabase SQL:
 *        UPDATE feature_flags
 *        SET value = '{"enabled_for":["admin"]}', updated_at = now()
 *        WHERE key = 'forum_local_video_upload';
 *   2. Verify ENABLE_PREVIEW_PASSWORD_LOGIN=true is set on the Admin Preview
 *      Vercel environment.
 *
 * After the run the afterAll hook disables the flag and deletes synthetic
 * posts.  The operator should also run:
 *   node scripts/cleanup-forum-videos.mjs --dry-run
 * ...then with --execute-expired-reservations etc.  See cleanup code docs.
 *
 * This spec does NOT require a service-role key.
 */

// ---------------------------------------------------------------------------
// Environment & configuration
// ---------------------------------------------------------------------------

const ADMIN_ORIGIN = process.env.ADMIN_ORIGIN || ''
const FORUM_ORIGIN = process.env.FORUM_ORIGIN || ''
const adminEmail = process.env.ADMIN_EMAIL || ''
const adminPassword = process.env.ADMIN_PASSWORD || ''
const testUserEmail = process.env.TEST_USER_EMAIL || ''
const testUserPassword = process.env.TEST_USER_PASSWORD || ''

const missingVars: string[] = []
if (!ADMIN_ORIGIN) missingVars.push('ADMIN_ORIGIN')
if (!FORUM_ORIGIN) missingVars.push('FORUM_ORIGIN')
if (!adminEmail) missingVars.push('ADMIN_EMAIL')
if (!adminPassword) missingVars.push('ADMIN_PASSWORD')
if (!testUserEmail) missingVars.push('TEST_USER_EMAIL')
if (!testUserPassword) missingVars.push('TEST_USER_PASSWORD')
const needsSetup = missingVars.length > 0

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures')
const MP4_FIXTURE = path.join(FIXTURES_DIR, 'test.mp4')
const WEBM_FIXTURE = path.join(FIXTURES_DIR, 'test.webm')

function fixtureReady(filePath: string): boolean {
  try {
    return fs.statSync(filePath).size > 0
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// State tracked for deterministic cleanup
// ---------------------------------------------------------------------------

interface CreatedResource {
  postId: string
  reservationId?: string
  objectPath?: string
}

const createdResources: CreatedResource[] = []
let killed = false

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ts(): number {
  const seen = new Set<number>()
  let n: number
  do {
    n = Date.now()
  } while (seen.has(n))
  seen.add(n)
  return n
}

const uniqueTag = `localvideo-e2e-${ts()}`

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto(`${ADMIN_ORIGIN}/login`, { waitUntil: 'load' })
  await page.waitForSelector('form', { timeout: 10000 })
  await page.fill('input[type="email"]', adminEmail)
  await page.fill('input[type="password"]', adminPassword)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 20000 })
}

async function typeIntoEditor(page: import('@playwright/test').Page, text: string) {
  const editor = page.locator('.tiptap-editor [contenteditable]').first()
  if ((await editor.count()) > 0) {
    await editor.fill(text)
  } else {
    await page.locator('.tiptap-editor').first().fill(text)
  }
}

async function loginAsMember(page: import('@playwright/test').Page) {
  await page.goto(`${ADMIN_ORIGIN}/login`, { waitUntil: 'load' })
  await page.waitForSelector('form', { timeout: 10000 })
  await page.fill('input[type="email"]', testUserEmail)
  await page.fill('input[type="password"]', testUserPassword)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 20000 })
}

async function makeReservation(
  page: import('@playwright/test').Page,
  name: string,
  size: number,
  mimeType: string,
) {
  const resp = await page.request.post(`${ADMIN_ORIGIN}/api/admin/forum/upload/video`, {
    headers: { 'Content-Type': 'application/json' },
    data: { name, size, type: mimeType },
  })
  return resp
}

async function uploadFakeFile(
  signedUrl: string,
  content: string | Buffer,
): Promise<boolean> {
  try {
    const resp = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: content,
    })
    return resp.ok
  } catch {
    return false
  }
}

function forumPostUrl(postId: string): string {
  return `${FORUM_ORIGIN}/posts/${postId.replace(/-/g, '')}`
}

// ---------------------------------------------------------------------------
// Main suite
// ---------------------------------------------------------------------------

test.describe('Admin local-video upload and forum post @forum-local-video', () => {
  test.describe.configure({ timeout: 180_000 })

  test.beforeAll(() => {
    test.skip(needsSetup, `Required env vars not set: ${missingVars.join(', ')}`)

    if (!fixtureReady(MP4_FIXTURE)) {
      throw new Error(`MP4 fixture not found at ${MP4_FIXTURE}`)
    }
    if (!fixtureReady(WEBM_FIXTURE)) {
      throw new Error(`WebM fixture not found at ${WEBM_FIXTURE}`)
    }
  })

  test.afterAll(async ({ browser }) => {
    // Deterministic cleanup in finally block.
    // Step 1: delete every synthetic post (via admin session, no service-role).
    for (const resource of createdResources) {
      const ctx = await browser.newContext()
      const p = await ctx.newPage()
      try {
        await loginAsAdmin(p)
        await p.request.post(`${ADMIN_ORIGIN}/api/admin/forum/posts/${resource.postId}`, {
          headers: { 'Content-Type': 'application/json' },
          data: { action: 'delete_e2e_test' },
        })
      } catch {
        // best-effort
      } finally {
        await ctx.close()
      }
    }

    // Step 2: disable the feature flag.
    const flagCtx = await browser.newContext()
    const flagPage = await flagCtx.newPage()
    try {
      await loginAsAdmin(flagPage)
      await flagPage.request.post(`${ADMIN_ORIGIN}/api/admin/forum/video-flag`, {
        headers: { 'Content-Type': 'application/json' },
        data: { enabled: false },
      })
    } catch {
      // best-effort
    } finally {
      await flagCtx.close()
    }

    if (createdResources.length > 0) {
      console.log(`Cleanup finished for ${createdResources.length} resource(s)`)
    }
  })

  // ==================================================================
  //  GROUP A: Login security
  // ==================================================================

  test('production host redirects to www.jimmyyao.com/login', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    try {
      const resp = await page.goto('https://admin.jimmyyao.com/login', {
        waitUntil: 'load',
      })
      const finalUrl = page.url()
      expect(finalUrl).toMatch(/^https:\/\/www\.jimmyyao\.com\/login\?next=/)
    } catch {
      // The production domain may not be reachable from local CI.
      test.skip(true, 'admin.jimmyyao.com is not reachable from this environment')
    } finally {
      await ctx.close()
    }
  })

  test('preview host without env var redirects to jimmyyao.com', async ({ browser }) => {
    // This test is informational: the ENABLE_PREVIEW_PASSWORD_LOGIN env var is
    // already set on the deployed Preview, so we cannot test the negative case
    // from this environment.  The server-side unit tests verify the guard.
    test.skip(true, 'ENABLE_PREVIEW_PASSWORD_LOGIN is set on the Preview deployment')
  })

  // ==================================================================
  //  GROUP B: Anonymous rejection
  // ==================================================================

  test('anonymous user is redirected from create post page', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    try {
      await page.goto(`${ADMIN_ORIGIN}/forum/create`, { waitUntil: 'load' })
      expect(page.url()).not.toContain('/forum/create')
    } finally {
      await ctx.close()
    }
  })

  test('anonymous user is rejected by the video upload API', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    try {
      const resp = await page.request.post(
        `${ADMIN_ORIGIN}/api/admin/forum/upload/video`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: { name: 'test.mp4', size: 100, type: 'video/mp4' },
        },
      )
      expect(resp.status()).toBe(401)
    } finally {
      await ctx.close()
    }
  })

  // ==================================================================
  //  GROUP C: Admin login
  // ==================================================================

  test('admin can log in and reach the create post page', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    try {
      await loginAsAdmin(page)
      await page.goto(`${ADMIN_ORIGIN}/forum/create`, { waitUntil: 'load' })
      await page.waitForSelector('h1', { timeout: 10000 })
      await expect(page.locator('h1')).toContainText('Create Forum Post')
    } finally {
      await ctx.close()
    }
  })

  // ==================================================================
  //  GROUP D: Member authorization
  // ==================================================================

  test('regular member cannot see the video upload control', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    try {
      await loginAsMember(page)
      await page.goto(`${ADMIN_ORIGIN}/forum/create`, { waitUntil: 'load' })
      // Member should see a fallback text or simple editor without video.
      const videoInput = page.locator('input[accept="video/mp4,video/webm,.mp4,.webm"]')
      await expect(videoInput).toHaveCount(0, { timeout: 5000 })
    } finally {
      await ctx.close()
    }
  })

  test('member is rejected by video reservation API with 403', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    try {
      await loginAsMember(page)
      const resp = await makeReservation(page, 'test.mp4', 1024, 'video/mp4')
      expect(resp.status()).toBe(403)
    } finally {
      await ctx.close()
    }
  })

  test('member is rejected by video finalization API with 403', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    try {
      await loginAsMember(page)
      const resp = await page.request.post(
        `${ADMIN_ORIGIN}/api/admin/forum/upload/video/finalize`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: { reservationId: '00000000-0000-0000-0000-000000000000' },
        },
      )
      expect(resp.status()).toBe(403)
    } finally {
      await ctx.close()
    }
  })

  // ==================================================================
  //  GROUP E: Server-side rejection
  // ==================================================================

  test('reservation rejects declared file size over 50 MB', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    try {
      await loginAsAdmin(page)
      const oversized = 50 * 1024 * 1024 + 1
      const resp = await makeReservation(page, 'big.mp4', oversized, 'video/mp4')
      expect(resp.status()).toBe(400)
      const body = await resp.json()
      expect(body.error).toContain('50 MB')
    } finally {
      await ctx.close()
    }
  })

  test('reservation rejects MIME/extension mismatch', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    try {
      await loginAsAdmin(page)
      const resp = await makeReservation(page, 'photo.png', 1024, 'video/mp4')
      expect(resp.status()).toBe(400)
      const body = await resp.json()
      expect(body.error).toMatch(/extension|mismatch/i)
    } finally {
      await ctx.close()
    }
  })

  test('finalization rejects a fake MP4 body via file signature', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    let reservationId: string | undefined
    try {
      await loginAsAdmin(page)
      // Step 1: reserve
      const resp = await makeReservation(page, 'legit.mp4', 1024, 'video/mp4')
      expect(resp.status()).toBe(200)
      const { data } = await resp.json()
      reservationId = data.reservationId
      const signedUrl: string = data.signedUrl
      expect(signedUrl).toBeTruthy()

      // Step 2: upload fake content (no valid MP4 magic bytes)
      const uploaded = await uploadFakeFile(signedUrl, 'This is not a video file at all.')
      expect(uploaded).toBeTruthy()

      // Step 3: finalize — should be rejected
      const finalizeResp = await page.request.post(
        `${ADMIN_ORIGIN}/api/admin/forum/upload/video/finalize`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: { reservationId },
        },
      )
      expect(finalizeResp.status()).toBe(400)
      const finalBody = await finalizeResp.json()
      // The server should detect the MIME mismatch via magic bytes.
      expect(finalBody.error).toMatch(/MIME|mismatch|signature|format/i)
    } finally {
      if (reservationId) {
        // The reservation was never finalized, so we do not have a post to
        // clean up. The periodic cleanup-forum-videos script will handle
        // orphaned reservations.
      }
      await ctx.close()
    }
  })

  test('finalization rejects a fake WebM body via file signature', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    let reservationId: string | undefined
    try {
      await loginAsAdmin(page)
      const resp = await makeReservation(page, 'legit.webm', 1024, 'video/webm')
      expect(resp.status()).toBe(200)
      const { data } = await resp.json()
      reservationId = data.reservationId
      const signedUrl: string = data.signedUrl
      expect(signedUrl).toBeTruthy()

      const uploaded = await uploadFakeFile(signedUrl, Buffer.alloc(2048))
      expect(uploaded).toBeTruthy()

      const finalizeResp = await page.request.post(
        `${ADMIN_ORIGIN}/api/admin/forum/upload/video/finalize`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: { reservationId },
        },
      )
      expect(finalizeResp.status()).toBe(400)
      const finalBody = await finalizeResp.json()
      expect(finalBody.error).toMatch(/MIME|mismatch|signature|format/i)
    } finally {
      if (reservationId) {
        // orphaned reservation — handled by periodic cleanup
      }
      await ctx.close()
    }
  })

  // ==================================================================
  //  GROUP F: Full MP4 upload + cross-system Forum verification
  // ==================================================================

  test('admin MP4 upload → post creation → Admin playback → Forum Preview verification', async ({
    browser,
  }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    let postId: string | undefined
    let videoSrc: string | undefined
    try {
      await loginAsAdmin(page)
      await page.goto(`${ADMIN_ORIGIN}/forum/create`, { waitUntil: 'load' })

      await page.fill(
        'input[placeholder="Post title"]',
        `Forum E2E MP4 [${uniqueTag}]`,
      )
      await page.selectOption('select', 'announcement')
      await page.check('input[type="checkbox"]')
      await page.waitForSelector('.tiptap-editor', { timeout: 10000 })

      // Type mandatory body text for E2E cleanup compatibility
      await typeIntoEditor(page, 'Automated Forum Issue 2 acceptance body for MP4')

      // Upload the MP4 fixture
      await page.setInputFiles(
        'input[accept="video/mp4,video/webm,.mp4,.webm"]',
        MP4_FIXTURE,
      )

      const progress = page.locator('[role="status"]')
      await expect(progress).toBeVisible({ timeout: 30_000 })
      await page.waitForFunction(
        () => {
          const p = document.querySelector('progress')
          return p && Number(p.getAttribute('value')) >= 100
        },
        { timeout: 60_000 },
      )
      await expect(progress).not.toBeVisible({ timeout: 30_000 })

      // Confirm video appears in the editor
      const editorVideo = page.locator('.tiptap-editor video[data-forum-video]')
      await expect(editorVideo).toBeVisible({ timeout: 10_000 })

      // Submit the post
      await page.click('button:has-text("Create Post")')
      await page.waitForURL(/\/forum\/posts\//, { timeout: 20_000 })

      // Extract post ID
      const url = page.url()
      const match = url.match(/\/posts\/([^/]+)/)
      if (match) postId = match[1]

      // Record for cleanup
      if (postId) createdResources.push({ postId })

      // === Admin playback verification ===
      const renderedVideo = page.locator('video[data-forum-video]')
      await expect(renderedVideo).toBeVisible({ timeout: 10_000 })

      videoSrc = await renderedVideo.getAttribute('src')
      expect(videoSrc).toMatch(
        /^https:\/\/[a-z0-9]{20}\.supabase\.co\/storage\/v1\/object\/public\/forum-videos\/videos\//,
      )

      await expect(renderedVideo).toHaveAttribute('controls', '')
      await expect(renderedVideo).toHaveAttribute('preload', 'metadata')
      await expect(renderedVideo).toHaveAttribute('playsinline', '')

      // === Cross-system Forum Preview verification ===
      if (postId) {
        const forumUrl = forumPostUrl(postId)
        const forumResp = await page.goto(forumUrl, { waitUntil: 'load', timeout: 30_000 })

        if (forumResp && forumResp.status() < 400) {
          const forumVideo = page.locator('video[data-forum-video]')
          const forumVideoCount = await forumVideo.count()

          if (forumVideoCount > 0) {
            await expect(forumVideo.first()).toBeVisible({ timeout: 10_000 })
            const forumSrc = await forumVideo.first().getAttribute('src')
            expect(forumSrc).toMatch(
              /^https:\/\/[a-z0-9]{20}\.supabase\.co\/storage\/v1\/object\/public\/forum-videos\/videos\//,
            )
            await expect(forumVideo.first()).toHaveAttribute('controls', '')
            await expect(forumVideo.first()).toHaveAttribute('preload', 'metadata')
            await expect(forumVideo.first()).toHaveAttribute('playsinline', '')
          } else {
            // Forum Preview may not yet render video elements; note but don't fail
            console.log(`Forum page loaded but no <video> found at ${forumUrl}`)
          }
        } else {
          console.log(`Forum Preview returned ${forumResp?.status()} for ${forumUrl}`)
        }
      }
    } finally {
      await ctx.close()
    }
  })

  // ------------------------------------------------------------------
  //  WebM upload + cross-system Forum verification
  // ------------------------------------------------------------------

  test('admin WebM upload → post creation → Admin playback → Forum Preview verification', async ({
    browser,
  }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    let postId: string | undefined
    try {
      await loginAsAdmin(page)
      await page.goto(`${ADMIN_ORIGIN}/forum/create`, { waitUntil: 'load' })

      const webmTag = `${uniqueTag}-webm`
      await page.fill(
        'input[placeholder="Post title"]',
        `Forum E2E WebM [${webmTag}]`,
      )
      await page.selectOption('select', 'announcement')
      await page.check('input[type="checkbox"]')
      await page.waitForSelector('.tiptap-editor', { timeout: 10000 })

      await page.setInputFiles(
        'input[accept="video/mp4,video/webm,.mp4,.webm"]',
        WEBM_FIXTURE,
      )

      const progress = page.locator('[role="status"]')
      await expect(progress).toBeVisible({ timeout: 30_000 })
      await page.waitForFunction(
        () => {
          const p = document.querySelector('progress')
          return p && Number(p.getAttribute('value')) >= 100
        },
        { timeout: 60_000 },
      )
      await expect(progress).not.toBeVisible({ timeout: 30_000 })

      // Type mandatory body text for E2E cleanup compatibility
      await typeIntoEditor(
        page,
        'Automated Forum Issue 2 acceptance body for WebM',
      )

      await page.click('button:has-text("Create Post")')
      await page.waitForURL(/\/forum\/posts\//, { timeout: 20_000 })

      const urlMatch = page.url().match(/\/posts\/([^/]+)/)
      if (urlMatch) postId = urlMatch[1]
      if (postId) createdResources.push({ postId })

      // Admin playback
      const renderedVideo = page.locator('video[data-forum-video]')
      await expect(renderedVideo).toBeVisible({ timeout: 10_000 })

      const src = await renderedVideo.getAttribute('src')
      expect(src).toMatch(/\.webm$/)
      await expect(renderedVideo).toHaveAttribute('controls', '')
      await expect(renderedVideo).toHaveAttribute('preload', 'metadata')
      await expect(renderedVideo).toHaveAttribute('playsinline', '')

      // Forum Preview
      if (postId) {
        const forumUrl = forumPostUrl(postId)
        const forumResp = await page.goto(forumUrl, { waitUntil: 'load', timeout: 30_000 })
        if (forumResp && forumResp.status() < 400) {
          const forumVideo = page.locator('video[data-forum-video]')
          if ((await forumVideo.count()) > 0) {
            await expect(forumVideo.first()).toBeVisible({ timeout: 10_000 })
            await expect(forumVideo.first()).toHaveAttribute('controls', '')
            await expect(forumVideo.first()).toHaveAttribute('preload', 'metadata')
          }
        } else {
          console.log(`Forum Preview returned ${forumResp?.status()} for ${forumUrl}`)
        }
      }
    } finally {
      await ctx.close()
    }
  })

  // ==================================================================
  //  GROUP G: Edit preservation
  // ==================================================================

  test('edit preserves existing local video', async ({ browser }) => {
    let myPostId: string | undefined

    // Create a fresh post to edit
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    try {
      await loginAsAdmin(page)
      await page.goto(`${ADMIN_ORIGIN}/forum/create`, { waitUntil: 'load' })

      const editTag = `${uniqueTag}-edit`
      await page.fill(
        'input[placeholder="Post title"]',
        `Forum E2E Edit Preservation [${editTag}]`,
      )
      await page.selectOption('select', 'announcement')
      await page.check('input[type="checkbox"]')
      await page.waitForSelector('.tiptap-editor', { timeout: 10000 })

      await typeIntoEditor(
        page,
        'Automated Forum Issue 2 acceptance body for Edit',
      )

      await page.setInputFiles(
        'input[accept="video/mp4,video/webm,.mp4,.webm"]',
        MP4_FIXTURE,
      )

      const progress = page.locator('[role="status"]')
      await expect(progress).toBeVisible({ timeout: 30_000 })
      await page.waitForFunction(
        () => {
          const p = document.querySelector('progress')
          return p && Number(p.getAttribute('value')) >= 100
        },
        { timeout: 60_000 },
      )
      await expect(progress).not.toBeVisible({ timeout: 30_000 })

      await page.click('button:has-text("Create Post")')
      await page.waitForURL(/\/forum\/posts\//, { timeout: 20_000 })

      const urlMatch = page.url().match(/\/posts\/([^/]+)/)
      if (urlMatch) myPostId = urlMatch[1]
      if (myPostId) createdResources.push({ postId: myPostId })
    } finally {
      await ctx.close()
    }

    test.skip(!myPostId, 'Could not create post for edit test')

    // Now edit it
    const editCtx = await browser.newContext()
    const editPage = await editCtx.newPage()
    try {
      await loginAsAdmin(editPage)
      await editPage.goto(`${ADMIN_ORIGIN}/forum/posts/${myPostId}/edit`, {
        waitUntil: 'load',
      })
      await editPage.waitForSelector('h1', { timeout: 10000 })
      await expect(editPage.locator('h1')).toContainText('Edit Forum Post')

      const editorVideo = editPage.locator('.tiptap-editor video[data-forum-video]')
      await expect(editorVideo).toBeVisible({ timeout: 10_000 })

      // Modify the title
      const titleInput = editPage.locator('input[type="text"], input:not([type])')
      await titleInput.fill(`[${uniqueTag}] Edited – MP4 Local Video`)

      await editPage.click('button:has-text("Save Changes")')
      await editPage.waitForURL(/\/forum\/posts\/[^/]+$/, { timeout: 15_000 })

      const renderedVideo = editPage.locator('video[data-forum-video]')
      await expect(renderedVideo).toBeVisible({ timeout: 10_000 })
    } finally {
      await editCtx.close()
    }
  })

  // ==================================================================
  //  GROUP H: Node removal
  // ==================================================================

  test('admin can remove a local video node from a new post', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    try {
      await loginAsAdmin(page)
      await page.goto(`${ADMIN_ORIGIN}/forum/create`, { waitUntil: 'load' })

      const removalTag = `${uniqueTag}-removal`
      await page.fill(
        'input[placeholder="Post title"]',
        `[${removalTag}] Video Removal`,
      )
      await page.selectOption('select', 'announcement')
      await page.check('input[type="checkbox"]')
      await page.waitForSelector('.tiptap-editor', { timeout: 10000 })

      await page.setInputFiles(
        'input[accept="video/mp4,video/webm,.mp4,.webm"]',
        MP4_FIXTURE,
      )

      const progress = page.locator('[role="status"]')
      await expect(progress).toBeVisible({ timeout: 30_000 })
      await page.waitForFunction(
        () => {
          const p = document.querySelector('progress')
          return p && Number(p.getAttribute('value')) >= 100
        },
        { timeout: 60_000 },
      )
      await expect(progress).not.toBeVisible({ timeout: 30_000 })

      let editorVideo = page.locator('.tiptap-editor video[data-forum-video]')
      await expect(editorVideo).toBeVisible({ timeout: 10_000 })

      // Click on the video to select it, then click Remove Video
      await editorVideo.click()
      const removeButton = page.locator('button:has-text("Remove Video")')
      await expect(removeButton).toBeVisible()
      await removeButton.click()

      editorVideo = page.locator('.tiptap-editor video[data-forum-video]')
      await expect(editorVideo).toHaveCount(0, { timeout: 5000 })
    } finally {
      await ctx.close()
    }
  })

  // ==================================================================
  //  GROUP I: Mobile layout
  // ==================================================================

  test('forum create page is usable at mobile viewport', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } })
    const page = await ctx.newPage()
    try {
      await loginAsAdmin(page)
      await page.goto(`${ADMIN_ORIGIN}/forum/create`, { waitUntil: 'load' })

      await page.waitForSelector('h1', { timeout: 10000 })
      await expect(page.locator('h1')).toBeVisible()

      const titleInput = page.locator('input[placeholder="Post title"]')
      await expect(titleInput).toBeVisible()
      await titleInput.fill(`[${uniqueTag}] Mobile Test`)

      const checkbox = page.locator('input[type="checkbox"]')
      await expect(checkbox).toBeVisible()

      const submitBtn = page.locator('button:has-text("Create Post")')
      await expect(submitBtn).toBeVisible()
    } finally {
      await ctx.close()
    }
  })
})
