# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Scenario 1 — Admin login and user management >> admin can search for a user
- Location: e2e\auth.spec.js:80:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 20000ms exceeded.
Call log:
  - waiting for locator('[data-testid="user-search"]') to be visible

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - img [ref=e7]
    - generic [ref=e10]: DocVault
    - generic [ref=e11]: Document Management System
  - generic [ref=e12]:
    - heading "Sign in" [level=1] [ref=e13]
    - paragraph [ref=e14]: Enter your credentials to access your workspace
    - generic [ref=e15]:
      - generic [ref=e16]: Quick access
      - generic [ref=e17]:
        - button "Admin" [ref=e18] [cursor=pointer]:
          - img [ref=e19]
          - text: Admin
        - button "End User" [ref=e22] [cursor=pointer]:
          - img [ref=e23]
          - text: End User
    - generic [ref=e30]: or sign in manually
    - generic [ref=e32]:
      - generic [ref=e33]:
        - generic [ref=e34]: Email address
        - textbox "you@company.com" [ref=e35]
      - generic [ref=e36]:
        - generic [ref=e37]: Password
        - generic [ref=e38]:
          - textbox "••••••••" [ref=e39]
          - button [ref=e40] [cursor=pointer]:
            - img [ref=e41]
      - button "Sign in" [ref=e44] [cursor=pointer]:
        - generic [ref=e45]: Sign in
        - img [ref=e46]
  - generic [ref=e49]:
    - generic [ref=e50]:
      - text: "Admin:"
      - strong [ref=e51]: admin123
    - generic [ref=e52]: "|"
    - generic [ref=e53]:
      - text: "User:"
      - strong [ref=e54]: user123
```

# Test source

```ts
  1   | // e2e/auth.spec.js
  2   | import { test, expect } from '@playwright/test'
  3   | 
  4   | const BASE = 'http://localhost:8080'
  5   | 
  6   | // Login via API and inject token into browser localStorage
  7   | async function loginAs(page, email, password) {
  8   |   // 1. Get token from backend
  9   |   const res = await page.request.post(`${BASE}/auth/login`, {
  10  |     data: { email, password },
  11  |     headers: { 'Content-Type': 'application/json' },
  12  |   })
  13  |   const json = await res.json()
  14  |   const token = json.data.accessToken
  15  |   const user  = json.data.user
  16  | 
  17  |   // 2. Go to app first so localStorage is available on the right origin
  18  |   await page.goto('http://localhost:5173/')
  19  |   
  20  |   // 3. Inject token + user into localStorage (same keys the app uses)
  21  |   await page.evaluate(({ token, user }) => {
  22  |     localStorage.setItem('docvault_token', token)
  23  |     // Also store user in sessionStorage if the app reads it from there
  24  |   }, { token, user })
  25  | 
  26  |   return { token, user }
  27  | }
  28  | 
  29  | test.describe('Scenario 1 — Admin login and user management', () => {
  30  | 
  31  |   test('admin can log in via UI and reach dashboard', async ({ page }) => {
  32  |     await page.goto('http://localhost:5173/login')
  33  |     await page.fill('[data-testid="email-input"]', 'admin@docvault.com')
  34  |     await page.fill('[data-testid="password-input"]', 'admin123')
  35  |     await page.click('[data-testid="login-btn"]')
  36  |     await page.waitForURL(/\/(admin|app)/, { timeout: 15000 })
  37  |     await expect(page.locator('text=DocVault')).toBeVisible({ timeout: 10000 })
  38  |   })
  39  | 
  40  |   test('quick login buttons pre-fill credentials', async ({ page }) => {
  41  |     await page.goto('http://localhost:5173/login')
  42  |     await page.click('[data-testid="quick-admin"]')
  43  |     const val = await page.inputValue('[data-testid="email-input"]')
  44  |     expect(val).toBe('admin@docvault.com')
  45  |   })
  46  | 
  47  |   test('invalid credentials shows error', async ({ page }) => {
  48  |     await page.goto('http://localhost:5173/login')
  49  |     await page.fill('[data-testid="email-input"]', 'nobody@example.com')
  50  |     await page.fill('[data-testid="password-input"]', 'wrongpass')
  51  |     await page.click('[data-testid="login-btn"]')
  52  |     await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 8000 })
  53  |   })
  54  | 
  55  |   test('admin can create a new user', async ({ page }) => {
  56  |     // Login via UI (most reliable approach)
  57  |     await page.goto('http://localhost:5173/login')
  58  |     await page.click('[data-testid="quick-admin"]')
  59  |     await page.click('[data-testid="login-btn"]')
  60  |     await page.waitForURL(/\/(admin|app)/, { timeout: 15000 })
  61  | 
  62  |     // Now navigate — token is in localStorage from the real login
  63  |     await page.goto('http://localhost:5173/admin/users')
  64  |     await page.waitForSelector('[data-testid="create-user-btn"]', { timeout: 20000 })
  65  | 
  66  |     await page.click('[data-testid="create-user-btn"]')
  67  |     await page.waitForSelector('[data-testid="user-modal"]', { timeout: 5000 })
  68  | 
  69  |     const ts = Date.now()
  70  |     const email = `test${ts}@ensia.dz`
  71  |     await page.fill('input[placeholder="Jane Smith"]', `Test ${ts}`)
  72  |     await page.fill('input[type="email"]', email)
  73  |     await page.fill('input[placeholder="••••••••"]', 'test1234')
  74  |     await page.click('[data-testid="user-modal-save"]')
  75  | 
  76  |     await expect(page.locator('[data-testid="user-modal"]')).not.toBeVisible({ timeout: 10000 })
  77  |     await page.waitForSelector(`text=${email}`, { timeout: 10000 })
  78  |   })
  79  | 
  80  |   test('admin can search for a user', async ({ page }) => {
  81  |     await page.goto('http://localhost:5173/login')
  82  |     await page.click('[data-testid="quick-admin"]')
  83  |     await page.click('[data-testid="login-btn"]')
  84  |     await page.waitForURL(/\/(admin|app)/, { timeout: 15000 })
  85  | 
  86  |     await page.goto('http://localhost:5173/admin/users')
> 87  |     await page.waitForSelector('[data-testid="user-search"]', { timeout: 20000 })
      |                ^ TimeoutError: page.waitForSelector: Timeout 20000ms exceeded.
  88  | 
  89  |     await page.fill('[data-testid="user-search"]', 'Alice')
  90  |     await page.waitForTimeout(500)
  91  |     await expect(page.locator('text=Alice Admin')).toBeVisible({ timeout: 5000 })
  92  |     await expect(page.locator('text=Bob Builder')).not.toBeVisible()
  93  |   })
  94  | 
  95  |   test('non-admin cannot access admin pages', async ({ page }) => {
  96  |     await page.goto('http://localhost:5173/login')
  97  |     await page.click('[data-testid="quick-user"]')
  98  |     await page.click('[data-testid="login-btn"]')
  99  |     await page.waitForURL(/\/app/, { timeout: 15000 })
  100 | 
  101 |     await page.goto('http://localhost:5173/admin/users')
  102 |     await page.waitForTimeout(1500)
  103 |     await expect(page).not.toHaveURL(/\/admin\/users/)
  104 |   })
  105 | })
```