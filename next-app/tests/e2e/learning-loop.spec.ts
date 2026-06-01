import { expect, test } from '@playwright/test'

test('home page opens', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
})

test('/lessons shows 1-50 lessons', async ({ page }) => {
  await page.goto('/lessons')
  const hasText = await page.getByText(/(第\s*50\s*课|Lesson\s*50)/).count()
  if (hasText > 0) {
    await expect(page.getByText(/(第\s*50\s*课|Lesson\s*50)/).first()).toBeVisible()
    return
  }
  const lessonLinks = page.locator('a[href^="/lessons/"]')
  const total = await lessonLinks.count()
  expect(total).toBeGreaterThanOrEqual(50)
})

test('/lessons/1 favorite toggle add/remove and verify in /favorites', async ({ page }) => {
  await page.goto('/lessons/1')
  await expect(page).toHaveURL(/\/lessons\/1/)

  const starBtn = page.getByTestId('favorite-toggle').first()
  await expect(starBtn).toBeVisible()
  await starBtn.click()

  await page.goto('/favorites')
  await expect(page).toHaveURL(/\/favorites/)
  await expect(page.getByText(/(已收藏\s*1|Saved\s*1)/)).toBeVisible()

  await page.getByRole('button', { name: /(移除|Remove)/ }).first().click()
  await expect(page.getByText(/(已收藏\s*0|Saved\s*0)/)).toBeVisible()
})

test('/favorites opens', async ({ page }) => {
  await page.goto('/favorites')
  await expect(page).toHaveURL(/\/favorites/)
})

test('/mistakes opens', async ({ page }) => {
  await page.goto('/mistakes')
  await expect(page).toHaveURL(/\/mistakes/)
})

test('/toolbox opens', async ({ page }) => {
  await page.goto('/toolbox')
  await expect(page).toHaveURL(/\/toolbox/)
})

test('/me opens', async ({ page }) => {
  await page.goto('/me')
  await expect(page).toHaveURL(/\/me/)
})

test('non-admin access to /admin is denied', async ({ page }) => {
  const response = await page.goto('/admin')
  if (response && response.status() >= 400) {
    expect(response.status()).toBeGreaterThanOrEqual(400)
    return
  }
  await expect(page.getByText(/(无权限|没有管理员权限|请先登录|do not have admin access|sign in)/i)).toBeVisible()
})

test('admin can access /admin when cookie provided', async ({ browser, baseURL }) => {
  const cookieHeader = process.env.E2E_ADMIN_COOKIE || ''
  if (!cookieHeader) {
    test.info().annotations.push({ type: 'info', description: 'E2E_ADMIN_COOKIE not set; admin access assertion skipped by design.' })
    return
  }

  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: {
      Cookie: cookieHeader
    }
  })
  const page = await context.newPage()
  await page.goto('/admin')
  await expect(page.getByText(/(管理员后台|Admin \(Read-only\)|课程数据审计|Lesson Data Audit)/)).toBeVisible()
  await context.close()
})

test('non-admin access to /admin/drafts is denied', async ({ page }) => {
  const response = await page.goto('/admin/drafts')
  if (response && response.status() >= 400) {
    expect(response.status()).toBeGreaterThanOrEqual(400)
    return
  }
  await expect(page.getByText(/(无权限|没有管理员权限|请先登录|do not have admin access|sign in)/i)).toBeVisible()
})

test('admin can access /admin/drafts when cookie provided', async ({ browser, baseURL }) => {
  const cookieHeader = process.env.E2E_ADMIN_COOKIE || ''
  if (!cookieHeader) {
    test.info().annotations.push({ type: 'info', description: 'E2E_ADMIN_COOKIE not set; admin drafts assertion skipped by design.' })
    return
  }

  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: {
      Cookie: cookieHeader
    }
  })
  const page = await context.newPage()
  await page.goto('/admin/drafts')
  await expect(page.getByText(/(Draft 列表|草稿列表|draft)/i)).toBeVisible()
  await context.close()
})

test('membership request flow: user apply vip1 then admin approve', async ({ browser, baseURL }) => {
  const adminCookie = process.env.E2E_ADMIN_COOKIE || ''
  const userCookie = process.env.E2E_MEMBER_COOKIE || ''
  if (!adminCookie || !userCookie) {
    test.info().annotations.push({
      type: 'info',
      description: 'E2E_ADMIN_COOKIE or E2E_MEMBER_COOKIE not set; membership flow test skipped by design.',
    })
    return
  }

  const token = Date.now()
  const reason = `E2E VIP1 request ${token}`

  const userContext = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { Cookie: userCookie },
  })
  const userPage = await userContext.newPage()
  await userPage.goto('/me')
  await expect(userPage.getByTestId('membership-current-level')).toContainText('free')
  await userPage.getByTestId('membership-requested-level').selectOption('vip1')
  await userPage.getByTestId('membership-reason').fill(reason)
  await userPage.getByTestId('membership-submit').click()
  await expect(userPage.getByText(/最近申请状态：pending/)).toBeVisible()
  await expect(userPage.getByTestId('membership-flowchart')).toContainText('管理员审批 ⏳')

  const adminContext = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { Cookie: adminCookie },
  })
  const adminPage = await adminContext.newPage()
  await adminPage.goto('/admin/membership-requests')
  const row = adminPage.locator('tr', { hasText: reason }).first()
  await expect(row).toBeVisible()
  await expect(row).toContainText('free')
  await expect(row).toContainText('vip1')
  await expect(row).toContainText('pending')
  await row.getByRole('button', { name: '通过' }).click()

  await userPage.goto('/me')
  await expect(userPage.getByTestId('membership-current-level')).toContainText('vip1')
  await expect(userPage.getByText(/free\s*->\s*vip1\s*·\s*approved/)).toBeVisible()
  await expect(userPage.getByTestId('membership-flowchart')).toContainText('管理员审批 ✅')
  await expect(userPage.getByTestId('membership-flowchart')).toContainText('通过结束 ✅')

  await adminContext.close()
  await userContext.close()
})

test('membership pending limit blocks duplicate submission', async ({ browser, baseURL }) => {
  const userCookie = process.env.E2E_MEMBER_COOKIE || ''
  if (!userCookie) {
    test.info().annotations.push({
      type: 'info',
      description: 'E2E_MEMBER_COOKIE not set; pending-limit test skipped by design.',
    })
    return
  }

  const token = Date.now()
  const userContext = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { Cookie: userCookie },
  })
  const page = await userContext.newPage()
  await page.goto('/me')

  // Try create first pending request (for current level, allowed option is first option)
  const firstOption = await page.getByTestId('membership-requested-level').inputValue()
  await page.getByTestId('membership-reason').fill(`E2E pending #1 ${token}`)
  await page.getByTestId('membership-submit').click()

  await page.goto('/me')
  await expect(page.getByText(/最近申请状态：pending/)).toBeVisible()

  // Second submission should be blocked while pending exists
  await page.getByTestId('membership-reason').fill(`E2E pending #2 ${token}`)
  if (firstOption === 'vip2') {
    await page.getByTestId('membership-requested-level').selectOption('vip3')
  }
  await page.getByTestId('membership-submit').click()
  await expect(page.getByText(/已有 pending 申请|已有申请正在审批中/)).toBeVisible()

  await userContext.close()
})
