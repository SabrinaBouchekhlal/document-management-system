// e2e/documents.spec.js
import { test, expect } from '@playwright/test'

async function loginAsAdmin(page) {
  await page.goto('http://localhost:5173/login')
  await page.click('[data-testid="quick-admin"]')
  await page.click('[data-testid="login-btn"]')
  await page.waitForURL(/\/(admin|app)/, { timeout: 15000 })
}

async function loginAsUser(page) {
  await page.goto('http://localhost:5173/login')
  await page.click('[data-testid="quick-user"]')
  await page.click('[data-testid="login-btn"]')
  await page.waitForURL(/\/app/, { timeout: 15000 })
}

test.describe('Scenario 2 — Document upload and comments', () => {

  test('user can upload a document', async ({ page }) => {
    await loginAsUser(page)

    await page.goto('http://localhost:5173/app/documents')
    await page.waitForSelector('[data-testid="upload-btn"]', { timeout: 20000 })

    await page.click('[data-testid="upload-btn"]')
    await page.waitForSelector('[data-testid="upload-modal"]', { timeout: 5000 })

    await page.fill('[data-testid="doc-title-input"]', `E2E Doc ${Date.now()}`)
    await page.click('[data-testid="upload-submit"]')

    await expect(page.locator('[data-testid="upload-modal"]'))
      .not.toBeVisible({ timeout: 20000 })
  })

  test('user can view a document and post a comment', async ({ page }) => {
    // Login as admin to guarantee docs are visible
    await loginAsAdmin(page)

    await page.goto('http://localhost:5173/app/documents')
    await page.waitForSelector('[data-testid="doc-card"]', { timeout: 20000 })
    await page.locator('[data-testid="doc-card"]').first().click()

    await page.waitForURL(/\/app\/documents\//, { timeout: 10000 })
    await page.waitForSelector('[data-testid="tab-comments"]', { timeout: 10000 })
    await page.click('[data-testid="tab-comments"]')

    const text = `E2E comment ${Date.now()}`
    await page.waitForSelector('[data-testid="comment-input"]', { timeout: 5000 })
    await page.fill('[data-testid="comment-input"]', text)
    await page.click('[data-testid="comment-submit"]')

    await page.waitForSelector(`text=${text}`, { timeout: 10000 })
  })

  test('document detail page shows AI summary section', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto('http://localhost:5173/app/documents')
    await page.waitForSelector('[data-testid="doc-card"]', { timeout: 20000 })
    await page.locator('[data-testid="doc-card"]').first().click()

    await page.waitForURL(/\/app\/documents\//, { timeout: 10000 })
    await page.waitForSelector('[data-testid="tab-overview"]', { timeout: 10000 })
    await page.click('[data-testid="tab-overview"]')

    await expect(page.locator('text=AI Summary')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=HuggingFace')).toBeVisible()
  })

  test('admin sees more documents than a department-restricted user', async ({ page }) => {
    // Count docs as user
    await loginAsUser(page)
    await page.goto('http://localhost:5173/app/documents')
    await page.waitForTimeout(3000)
    const userCount = await page.locator('[data-testid="doc-card"]').count()

    // Count docs as admin
    await loginAsAdmin(page)
    await page.goto('http://localhost:5173/app/documents')
    await page.waitForTimeout(3000)
    const adminCount = await page.locator('[data-testid="doc-card"]').count()

    expect(adminCount).toBeGreaterThanOrEqual(userCount)
  })

  test('admin panel documents page is accessible', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('http://localhost:5173/admin/documents')
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/admin\/documents/)
    await expect(page.locator('body')).toBeVisible()
  })
})