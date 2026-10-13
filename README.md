# DocVault — Document Management System

DocVault is a document management application for organizing and sharing company documents. It provides separate administrator and employee experiences: administrators manage users, departments, categories, and document records, while employees browse, upload, and discuss documents.

This repository contains the web application and two ways to serve its data:

1. A lightweight local demo API, so the frontend can be run on its own.
2. A separate multi-service backend, for a fuller setup with authentication, persistent storage, file uploads, and asynchronous processing.

## What the application does

- Organizes documents with descriptions, categories, departments, tags, and status.
- Provides search, filters, pagination, and grid or list views.
- Supports document versions and comments.
- Gives administrators dashboards and tools for managing users, departments, categories, and documents.
- Includes notifications, CSV user import/export, and AI-generated document summaries in the full backend setup.

## How the pieces fit together

```text
Browser
  └── React + Vite frontend (docvault/)
        ├── Local demo mode ──> json-server (port 3001)
        └── Backend mode ─────> Spring Cloud API Gateway (port 8080)
                                  ├── Documents service
                                  ├── Comments service
                                  ├── Event/audit service
                                  └── Python AI consumer
```

The frontend uses the local demo API by default. Setting `VITE_API_BASE_URL` switches it to the backend gateway. In backend mode, the services use PostgreSQL, Cassandra, Redis, Redpanda (Kafka-compatible), and LocalStack S3; the Python consumer handles document events for AI summaries.

## Repository layout

```text
.
├── docvault/          # React frontend, Vite config, demo data and E2E tests
└── docvault-backend/  # Spring Boot services, Python consumer, infrastructure and deployment files
```

## Run the frontend in demo mode

You need Node.js and npm. From the frontend directory:

```bash
cd docvault
npm install
npm run dev
```

Open <http://localhost:5173>. The development command starts both Vite and the json-server demo API. Demo login credentials are listed in the [frontend guide](docvault/README.md).

## Run with the full backend

You need Docker Compose, Node.js, and npm. First start the backend services:

```bash
cd docvault-backend
docker compose up --build -d
```

Then, in a separate terminal, start the frontend with the gateway URL configured.

PowerShell:

```powershell
cd docvault
$env:VITE_API_BASE_URL = "http://localhost:8080"
npm install
npm run dev
```

macOS/Linux:

```bash
cd docvault
npm install
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

The frontend is at <http://localhost:5173>; the gateway is at <http://localhost:8080>. The frontend development command also starts its demo json-server, but with `VITE_API_BASE_URL` set, the app sends API requests to the backend instead.

The backend includes several infrastructure services and can take a few minutes to become ready. Its README documents service URLs, API examples, credentials, and Kubernetes deployment: [backend guide](docvault-backend/README.md).

## Tests and builds

From `docvault/`:

```bash
npm run build       # Build the frontend
npm run test:e2e    # Run Playwright end-to-end tests
```

Install Playwright browsers before running E2E tests for the first time:

```bash
npx playwright install
```

The backend is a Maven multi-module project. Build it from `docvault-backend/` with:

```bash
mvn package
```

## More information

- [Frontend guide](docvault/README.md) — frontend features, structure, demo credentials, and E2E tests.
- [Backend guide](docvault-backend/README.md) — backend architecture, local services, API examples, and Kubernetes deployment.
