# DocVault — Document Management System

A full-featured Document Management System built with React + Vite + React Router + Context/useReducer + json-server.

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the app (API + Dev server together)

```bash
npm run dev
```

This runs:
- **json-server** on `http://localhost:3001` (fake REST API)
- **Vite dev server** on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

---

## 🔑 Login Credentials

| Role  | Email                  | Password  |
|-------|------------------------|-----------|
| Admin | admin@docvault.com     | admin123  |
| User  | bob@docvault.com       | user123   |
| User  | carol@docvault.com     | user123   |

---

## 🧪 Running E2E Tests

Install Playwright browsers (first time only):
```bash
npx playwright install
```

Run tests:
```bash
npm run test:e2e
```

View the test report:
```bash
npx playwright show-report
```

---

## 📁 Project Structure

```
docvault/
├── db.json                    # json-server database
├── vite.config.js             # Vite config with API proxy
├── playwright.config.js       # Playwright E2E config
│
├── src/
│   ├── main.jsx               # Entry point
│   ├── App.jsx                # Routes & auth guards
│   ├── index.css              # Global design system styles
│   │
│   ├── context/
│   │   └── AppContext.jsx     # Global state (useReducer)
│   │
│   ├── utils/
│   │   ├── api.js             # API service layer
│   │   └── helpers.js         # Formatters & utilities
│   │
│   ├── components/
│   │   └── shared/
│   │       ├── Sidebar.jsx    # Navigation sidebar
│   │       ├── Header.jsx     # Top header + notifications
│   │       ├── Toast.jsx      # Toast notifications
│   │       └── Pagination.jsx # Pagination component
│   │
│   └── pages/
│       ├── LoginPage.jsx      # Login with role detection
│       ├── admin/
│       │   ├── AdminLayout.jsx
│       │   ├── AdminDashboard.jsx   # Stats + charts
│       │   ├── UsersPage.jsx        # CRUD + multiselect + CSV import
│       │   ├── DepartmentsPage.jsx  # Dept management + user assignment
│       │   ├── CategoriesPage.jsx   # Category CRUD
│       │   └── AdminDocsPage.jsx    # Document oversight
│       └── user/
│           ├── UserLayout.jsx
│           ├── UserDashboard.jsx    # Welcome + recent docs
│           ├── DocumentsPage.jsx    # List + search + filters + upload modal
│           └── DocumentDetailPage.jsx # Metadata + versions + comments
│
└── tests/
    └── e2e.spec.js            # Playwright E2E tests
```

---

## ✨ Features

### End-User View
- 📄 **Document List** — grid/list view, full-text search, category/department/type filters, pagination
- 📤 **Upload Modal** — drag & drop zone, metadata form, tag input
- 📋 **Document Detail** — tabbed interface with Overview, Versions, Comments
  - Overview: description, tags, metadata sidebar, **AI summary (extra feature)**
  - Versions: timeline with changelog, create new version
  - Comments: multi-user discussion, resolve/delete, real-time update
- 🔔 **Notifications** — bell icon with unread count, click to navigate

### Admin View
- 📊 **Dashboard** — live stats, bar chart (recharts), recent docs/users
- 👥 **User Management** — table with pagination, multi-select, bulk suspend, bulk export, CSV import wizard (3 steps with validation)
- 🏢 **Department Management** — card grid, member assignment modal with checkboxes
- 🏷️ **Category Management** — color picker, doc count, progress bars
- 📄 **Document Oversight** — full table with status toggle

### Extra Innovative Features
1. 🤖 **AI Document Summary** — auto-generated contextual summary on document detail page
2. 🌗 **Collapsible Sidebar** — smooth animated collapse to icon-only mode
3. 🎨 **Design System** — full CSS variable token system, dark theme, Syne + DM Sans typography
4. 📊 **Interactive Charts** — recharts BarChart on admin dashboard with highlighted latest bar
5. 🔔 **Notification Center** — in-header dropdown with read/unread tracking persisted to API
6. 🔍 **Smart Filters Panel** — animated collapsible filter bar with active filter count badge
7. 📋 **Grid/List Toggle** — instant switch between card grid and table view for documents
8. 📤 **CSV Import Wizard** — 3-step wizard (upload → validate with error highlighting → confirm import)
9. 🎯 **Multi-select Bulk Actions** — checkbox select with bulk suspend + export operations
10. 🏷️ **Tag System** — documents tagged for search and display

---

## 🛠️ Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| React Router v6 | Client-side routing |
| Context + useReducer | Global state management |
| json-server | Fake REST API |
| Vite | Build tool + dev server |
| lucide-react | Icons |
| recharts | Charts |
| papaparse | CSV parsing |
| Playwright | E2E testing |
