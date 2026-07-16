# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Scenario 1 — Admin login and user management >> admin can search for a user
- Location: e2e\auth.spec.js:80:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Alice Admin')
Expected: visible
Error: strict mode violation: locator('text=Alice Admin') resolved to 2 elements:
    1) <div>Alice Admin</div> aka getByRole('complementary').getByText('Alice Admin')
    2) <div>Alice Admin</div> aka getByRole('table').getByText('Alice Admin')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Alice Admin')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - img [ref=e8]
          - generic [ref=e11]: DocVault
        - button "Collapse" [ref=e12] [cursor=pointer]:
          - img [ref=e13]
      - navigation [ref=e15]:
        - generic [ref=e16]: Administration
        - link "Dashboard" [ref=e17] [cursor=pointer]:
          - /url: /admin
          - img [ref=e18]
          - generic [ref=e23]: Dashboard
        - link "Users" [ref=e24] [cursor=pointer]:
          - /url: /admin/users
          - img [ref=e25]
          - generic [ref=e30]: Users
        - link "Departments" [ref=e31] [cursor=pointer]:
          - /url: /admin/departments
          - img [ref=e32]
          - generic [ref=e36]: Departments
        - link "Categories" [ref=e37] [cursor=pointer]:
          - /url: /admin/categories
          - img [ref=e38]
          - generic [ref=e41]: Categories
        - link "Documents" [ref=e42] [cursor=pointer]:
          - /url: /admin/documents
          - img [ref=e43]
          - generic [ref=e46]: Documents
      - generic [ref=e47]:
        - generic [ref=e48]:
          - generic [ref=e49]: AA
          - generic [ref=e50]:
            - generic [ref=e51]: Alice Admin
            - generic [ref=e52]: admin
        - button "Sign out" [ref=e53] [cursor=pointer]:
          - img [ref=e54]
          - generic [ref=e57]: Sign out
    - generic [ref=e58]:
      - banner [ref=e59]:
        - heading "User Management" [level=1] [ref=e60]
        - generic [ref=e61]:
          - button "Notifications" [ref=e63] [cursor=pointer]:
            - img [ref=e64]
          - generic [ref=e67]:
            - generic [ref=e68]: AA
            - generic [ref=e69]: Alice
            - generic [ref=e70]: admin
      - main [ref=e71]:
        - generic [ref=e72]:
          - generic [ref=e73]:
            - generic [ref=e74]:
              - img [ref=e75]
              - textbox "Search users…" [active] [ref=e78]: Alice
            - combobox [ref=e79] [cursor=pointer]:
              - option "All roles" [selected]
              - option "Admin"
              - option "User"
            - combobox [ref=e80] [cursor=pointer]:
              - option "All statuses" [selected]
              - option "Active"
              - option "Suspended"
            - combobox [ref=e81] [cursor=pointer]:
              - option "All departments" [selected]
              - option "Finance"
              - option "IT"
            - button "Export All" [ref=e82] [cursor=pointer]:
              - img [ref=e83]
              - text: Export All
            - button "Import CSV" [ref=e86] [cursor=pointer]:
              - img [ref=e87]
              - text: Import CSV
            - button "Add User" [ref=e90] [cursor=pointer]:
              - img [ref=e91]
              - text: Add User
          - generic [ref=e92]:
            - table [ref=e94]:
              - rowgroup [ref=e95]:
                - row "User Role Department Status Joined" [ref=e96]:
                  - columnheader [ref=e97]:
                    - checkbox [ref=e98] [cursor=pointer]
                  - columnheader "User" [ref=e99]
                  - columnheader "Role" [ref=e100]
                  - columnheader "Department" [ref=e101]
                  - columnheader "Status" [ref=e102]
                  - columnheader "Joined" [ref=e103]
                  - columnheader [ref=e104]
              - rowgroup [ref=e105]:
                - row "AA Alice Admin admin@docvault.com admin — active —" [ref=e106]:
                  - cell [ref=e107]:
                    - checkbox [ref=e108] [cursor=pointer]
                  - cell "AA Alice Admin admin@docvault.com" [ref=e109]:
                    - generic [ref=e110]:
                      - generic [ref=e111]: AA
                      - generic [ref=e112]:
                        - generic [ref=e113]: Alice Admin
                        - generic [ref=e114]: admin@docvault.com
                  - cell "admin" [ref=e115]:
                    - generic [ref=e116]: admin
                  - cell "—" [ref=e117]
                  - cell "active" [ref=e118]:
                    - generic [ref=e119]: active
                  - cell "—" [ref=e120]
                  - cell [ref=e121]:
                    - generic [ref=e122]:
                      - button "Edit" [ref=e123] [cursor=pointer]:
                        - img [ref=e124]
                      - button "Delete" [ref=e126] [cursor=pointer]:
                        - img [ref=e127]
            - generic [ref=e131]: 1 user
  - generic [ref=e132]: "9"
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
  87  |     await page.waitForSelector('[data-testid="user-search"]', { timeout: 20000 })
  88  | 
  89  |     await page.fill('[data-testid="user-search"]', 'Alice')
  90  |     await page.waitForTimeout(500)
> 91  |     await expect(page.locator('text=Alice Admin')).toBeVisible({ timeout: 5000 })
      |                                                    ^ Error: expect(locator).toBeVisible() failed
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