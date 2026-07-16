// e2e/auth.spec.js
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:8080'

// Login via API and inject token into browser localStorage
async function loginAs(page, email, password) {
  // 1. Get token from backend
  const res = await page.request.post(`${BASE}/auth/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  })
  const json = await res.json()
  const token = json.data.accessToken
  const user  = json.data.user

  // 2. Go to app first so localStorage is available on the right origin
  await page.goto('http://localhost:5173/')
  
  // 3. Inject token + user into localStorage (same keys the app uses)
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('docvault_token', token)
    // Also store user in sessionStorage if the app reads it from there
  }, { token, user })

  return { token, user }
}

test.describe('Scenario 1 — Admin login and user management', () => {

  test('admin can log in via UI and reach dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173/login')
    await page.fill('[data-testid="email-input"]', 'admin@docvault.com')
    await page.fill('[data-testid="password-input"]', 'admin123')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL(/\/(admin|app)/, { timeout: 15000 })
    await expect(page.locator('text=DocVault')).toBeVisible({ timeout: 10000 })
  })

  test('quick login buttons pre-fill credentials', async ({ page }) => {
    await page.goto('http://localhost:5173/login')
    await page.click('[data-testid="quick-admin"]')
    const val = await page.inputValue('[data-testid="email-input"]')
    expect(val).toBe('admin@docvault.com')
  })

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('http://localhost:5173/login')
    await page.fill('[data-testid="email-input"]', 'nobody@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpass')
    await page.click('[data-testid="login-btn"]')
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 8000 })
  })

  test('admin can create a new user', async ({ page }) => {
    // Login via UI (most reliable approach)
    await page.goto('http://localhost:5173/login')
    await page.click('[data-testid="quick-admin"]')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL(/\/(admin|app)/, { timeout: 15000 })

    // Now navigate — token is in localStorage from the real login
    await page.goto('http://localhost:5173/admin/users')
    await page.waitForSelector('[data-testid="create-user-btn"]', { timeout: 20000 })

    await page.click('[data-testid="create-user-btn"]')
    await page.waitForSelector('[data-testid="user-modal"]', { timeout: 5000 })

    const ts = Date.now()
    const email = `test${ts}@ensia.dz`
    await page.fill('input[placeholder="Jane Smith"]', `Test ${ts}`)
    await page.fill('input[type="email"]', email)
    await page.fill('input[placeholder="••••••••"]', 'test1234')
    await page.click('[data-testid="user-modal-save"]')

    await expect(page.locator('[data-testid="user-modal"]')).not.toBeVisible({ timeout: 10000 })
    await page.waitForSelector(`text=${email}`, { timeout: 10000 })
  })

  test('admin can search for a user', async ({ page }) => {
    await page.goto('http://localhost:5173/login')
    await page.click('[data-testid="quick-admin"]')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL(/\/(admin|app)/, { timeout: 15000 })

    await page.goto('http://localhost:5173/admin/users')
    await page.waitForSelector('[data-testid="user-search"]', { timeout: 20000 })

    await page.fill('[data-testid="user-search"]', 'Alice')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Alice Admin')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Bob Builder')).not.toBeVisible()
  })

  test('non-admin cannot access admin pages', async ({ page }) => {
    await page.goto('http://localhost:5173/login')
    await page.click('[data-testid="quick-user"]')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL(/\/app/, { timeout: 15000 })

    await page.goto('http://localhost:5173/admin/users')
    await page.waitForTimeout(1500)
    await expect(page).not.toHaveURL(/\/admin\/users/)
  })
})