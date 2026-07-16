# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: documents.spec.js >> Scenario 2 — Document upload and comments >> admin panel documents page is accessible
- Location: e2e\documents.spec.js:87:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/admin\/documents/
Received string:  "http://localhost:5173/login"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    13 × unexpected value "http://localhost:5173/login"

```

```yaml
- img
- text: DocVault Document Management System
- heading "Sign in" [level=1]
- paragraph: Enter your credentials to access your workspace
- text: Quick access
- button "Admin":
  - img
  - text: Admin
- button "End User":
  - img
  - text: End User
- text: or sign in manually Email address
- textbox "you@company.com"
- text: Password
- textbox "••••••••"
- button:
  - img
- button "Sign in":
  - text: Sign in
  - img
- text: "Admin:"
- strong: admin123
- text: "| User:"
- strong: user123
```

# Test source

```ts
  1  | // e2e/documents.spec.js
  2  | import { test, expect } from '@playwright/test'
  3  | 
  4  | async function loginAsAdmin(page) {
  5  |   await page.goto('http://localhost:5173/login')
  6  |   await page.click('[data-testid="quick-admin"]')
  7  |   await page.click('[data-testid="login-btn"]')
  8  |   await page.waitForURL(/\/(admin|app)/, { timeout: 15000 })
  9  | }
  10 | 
  11 | async function loginAsUser(page) {
  12 |   await page.goto('http://localhost:5173/login')
  13 |   await page.click('[data-testid="quick-user"]')
  14 |   await page.click('[data-testid="login-btn"]')
  15 |   await page.waitForURL(/\/app/, { timeout: 15000 })
  16 | }
  17 | 
  18 | test.describe('Scenario 2 — Document upload and comments', () => {
  19 | 
  20 |   test('user can upload a document', async ({ page }) => {
  21 |     await loginAsUser(page)
  22 | 
  23 |     await page.goto('http://localhost:5173/app/documents')
  24 |     await page.waitForSelector('[data-testid="upload-btn"]', { timeout: 20000 })
  25 | 
  26 |     await page.click('[data-testid="upload-btn"]')
  27 |     await page.waitForSelector('[data-testid="upload-modal"]', { timeout: 5000 })
  28 | 
  29 |     await page.fill('[data-testid="doc-title-input"]', `E2E Doc ${Date.now()}`)
  30 |     await page.click('[data-testid="upload-submit"]')
  31 | 
  32 |     await expect(page.locator('[data-testid="upload-modal"]'))
  33 |       .not.toBeVisible({ timeout: 20000 })
  34 |   })
  35 | 
  36 |   test('user can view a document and post a comment', async ({ page }) => {
  37 |     // Login as admin to guarantee docs are visible
  38 |     await loginAsAdmin(page)
  39 | 
  40 |     await page.goto('http://localhost:5173/app/documents')
  41 |     await page.waitForSelector('[data-testid="doc-card"]', { timeout: 20000 })
  42 |     await page.locator('[data-testid="doc-card"]').first().click()
  43 | 
  44 |     await page.waitForURL(/\/app\/documents\//, { timeout: 10000 })
  45 |     await page.waitForSelector('[data-testid="tab-comments"]', { timeout: 10000 })
  46 |     await page.click('[data-testid="tab-comments"]')
  47 | 
  48 |     const text = `E2E comment ${Date.now()}`
  49 |     await page.waitForSelector('[data-testid="comment-input"]', { timeout: 5000 })
  50 |     await page.fill('[data-testid="comment-input"]', text)
  51 |     await page.click('[data-testid="comment-submit"]')
  52 | 
  53 |     await page.waitForSelector(`text=${text}`, { timeout: 10000 })
  54 |   })
  55 | 
  56 |   test('document detail page shows AI summary section', async ({ page }) => {
  57 |     await loginAsAdmin(page)
  58 | 
  59 |     await page.goto('http://localhost:5173/app/documents')
  60 |     await page.waitForSelector('[data-testid="doc-card"]', { timeout: 20000 })
  61 |     await page.locator('[data-testid="doc-card"]').first().click()
  62 | 
  63 |     await page.waitForURL(/\/app\/documents\//, { timeout: 10000 })
  64 |     await page.waitForSelector('[data-testid="tab-overview"]', { timeout: 10000 })
  65 |     await page.click('[data-testid="tab-overview"]')
  66 | 
  67 |     await expect(page.locator('text=AI Summary')).toBeVisible({ timeout: 5000 })
  68 |     await expect(page.locator('text=HuggingFace')).toBeVisible()
  69 |   })
  70 | 
  71 |   test('admin sees more documents than a department-restricted user', async ({ page }) => {
  72 |     // Count docs as user
  73 |     await loginAsUser(page)
  74 |     await page.goto('http://localhost:5173/app/documents')
  75 |     await page.waitForTimeout(3000)
  76 |     const userCount = await page.locator('[data-testid="doc-card"]').count()
  77 | 
  78 |     // Count docs as admin
  79 |     await loginAsAdmin(page)
  80 |     await page.goto('http://localhost:5173/app/documents')
  81 |     await page.waitForTimeout(3000)
  82 |     const adminCount = await page.locator('[data-testid="doc-card"]').count()
  83 | 
  84 |     expect(adminCount).toBeGreaterThanOrEqual(userCount)
  85 |   })
  86 | 
  87 |   test('admin panel documents page is accessible', async ({ page }) => {
  88 |     await loginAsAdmin(page)
  89 |     await page.goto('http://localhost:5173/admin/documents')
  90 |     await page.waitForTimeout(2000)
> 91 |     await expect(page).toHaveURL(/\/admin\/documents/)
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  92 |     await expect(page.locator('body')).toBeVisible()
  93 |   })
  94 | })
```