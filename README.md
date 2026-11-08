# SGBv - Library Management System (MVP)

Production-oriented MVP for library operations, including secure authentication, borrowing workflows, reservations, fines, and role-based administration.

## Overview

SGBv is a full-stack application designed to manage a small to medium library catalog and circulation flow. The project prioritizes security-first API design and maintainable architecture.

## Tech Stack

- Backend: Node.js, TypeScript, Express, PostgreSQL
- Frontend: React, TypeScript, Vite
- Security: Helmet, rate limiting, CSRF protection, HttpOnly cookies, strict input validation

## Core Features

- Book catalog management (ADMIN)
- Search and filtering by title, author, and category
- Loan lifecycle with due date rules and return processing
- Automatic fine calculation for late returns
- FIFO reservation queue for unavailable books
- User and fine administration (ADMIN)
- Role-based access control (USER, ADMIN)

## Security Features

- Cookie-based session model using HttpOnly cookies
- CSRF validation for state-changing methods
- Access and refresh token lifecycle with revocation on logout
- Strict schema validation with Zod and payload sanitization
- Route-specific rate limiting policies
- Hardened HTTP headers with CSP and HSTS in production
- Standardized error handling without leaking internal stack traces
- Optional PostgreSQL TLS and database hardening SQL script

## API Summary

Authentication:

- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- GET /api/v1/auth/me
- POST /api/v1/auth/logout

Users:

- POST /api/v1/users
- GET /api/v1/users/:id/fines
- POST /api/v1/users/fines/pay

Books:

- GET /api/v1/books
- POST /api/v1/books
- PUT /api/v1/books/:id
- DELETE /api/v1/books/:id

Loans and returns:

- POST /api/v1/loans
- POST /api/v1/returns
- GET /api/v1/loans/history/:userId

Reservations:

- POST /api/v1/reservations

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm

### Backend

1. Install dependencies:

```bash
npm install
```

2. Create local environment file:

```powershell
Copy-Item .env.example .env
```

3. Create the database and apply the migrations (works on any OS, no `psql` needed):

```bash
createdb sgb_mvp
npm run db:migrate
```

4. Start backend development server (restarts on change):

```bash
npm run dev
```

Health check endpoint (returns `503` when the database is unreachable):

- GET http://localhost:3000/health

### Docker

Runs PostgreSQL, applies the migrations, then starts the API on http://localhost:3000:

```bash
docker compose up --build
```

The compose file ships development-only defaults. Set `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET` and `CORS_ALLOWED_ORIGINS` in your environment for anything beyond local use.
The image runs with `NODE_ENV=production`, so session cookies are `Secure`.

### Frontend

1. Go to frontend directory:

```bash
cd frontend
```

2. Create local environment file:

```powershell
Copy-Item .env.example .env
```

3. Install and run:

```bash
npm install
npm run dev
```

Default Vite URL:

- http://localhost:5173

## npm Scripts

| Script | What it does |
| --- | --- |
| `npm run setup` | Install backend and frontend dependencies from the lockfiles |
| `npm run dev` | Start the API with automatic restart |
| `npm run build` / `npm start` | Compile to `dist/` and run the compiled server |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint (also forbids `console.*`; use the logger) |
| `npm test` | Run the test suite |
| `npm run check` | Typecheck, lint, tests and the frontend build in one go |
| `npm run db:migrate` | Apply pending migrations (`db:migrate:prod` runs the compiled CLI) |
| `npm run docs:openapi` | Regenerate `docs/openapi.json` |

## Database Migrations

Schema changes live in `migrations/` as numbered SQL files (`001_initial_schema.sql`, `002_...`).
`npm run db:migrate` applies the ones that have not run yet, in order, each in its own transaction, and
records them in the `schema_migrations` table. Concurrent runs are serialised with an advisory lock.

- Add a new file for every change; never edit one that has been applied. The runner stores a checksum
  and refuses to continue if an applied file changed.
- The tests build their schema from the same files, so migrations are exercised on every test run.

## Testing

```bash
npm test
```

Tests run the real SQL against an in-process PostgreSQL (PGlite), so no database server is needed. They
cover the loan, return, fine and reservation rules (including concurrent requests), authentication,
CSRF, validation, rate limiting, migrations and the OpenAPI document. PGlite runs a single connection, so
row-level locking is not exercised against a real PostgreSQL server.

The manual acceptance scenarios are listed in `tests/TEST_CASES.md`.

## API Reference

The OpenAPI 3 description is in [`docs/openapi.json`](docs/openapi.json). Request bodies are generated
from the same zod schemas the API validates with, and a test fails if a route is added, removed or
changed without regenerating the file:

```bash
npm run docs:openapi
```

## Logging

The API logs structured JSON with [pino](https://getpino.io) (pretty-printed in development). Set
`LOG_LEVEL` (`trace` to `fatal`, or `silent`) to change verbosity; it defaults to `info`, and to `silent`
under `NODE_ENV=test`. On `SIGTERM`/`SIGINT` the server stops accepting connections, finishes in-flight
requests and closes the database pool (forced exit after 10 seconds).

## Environment Variables

See .env.example for complete reference.

Backend required values:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/sgb_mvp
DATABASE_SSL=false
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
JWT_ACCESS_SECRET=change-this-access-secret
JWT_REFRESH_SECRET=change-this-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN_DAYS=7
AUTH_ACCESS_COOKIE_NAME=sgb_at
AUTH_REFRESH_COOKIE_NAME=sgb_rt
AUTH_CSRF_COOKIE_NAME=sgb_csrf
AUTH_COOKIE_DOMAIN=
LOG_LEVEL=info
```

Frontend required value:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## Operational Scripts

Backup retention:

```powershell
.\scripts\ops\backup_retention.ps1 -DatabaseUrl "postgres://..." -BackupDir "C:\backups" -KeepDailyDays 30 -KeepWeeklyWeeks 12
```

Restore test:

```powershell
.\scripts\ops\restore_test.ps1 -DatabaseUrl "postgres://..." -BackupFile "C:\backups\sgb_daily_YYYYMMDD.sql.gz"
```

Database hardening:

```powershell
psql $env:DATABASE_URL -f config/security/db_hardening.sql
```

## Project Structure

```text
.
|- src/
|  |- controllers/
|  |- services/
|  |- repositories/
|  |- routes/
|  |- middlewares/
|  |- utils/
|  |- config/
|  |- db/                   migration runner and CLI
|  |- openapi/              OpenAPI document builder
|  |- schemas/              request validation schemas (zod)
|  |- models/
|  \- types/
|- migrations/              numbered SQL migrations
|- config/
|  \- security/db_hardening.sql
|- docs/openapi.json        generated API description
|- Dockerfile, docker-compose.yml
|- scripts/ops/
|  |- backup_retention.ps1
|  \- restore_test.ps1
\- frontend/
```

## Quality Checks

Everything CI runs, in one command:

```bash
npm run check
```

Individual steps:

```bash
npm run typecheck
npm run lint
npm test
npm --prefix frontend run lint
npm --prefix frontend run build
```

CI (`.github/workflows/ci.yml`) also audits production dependencies with `npm audit`, and Dependabot
opens weekly update pull requests for npm packages (backend and frontend) and GitHub Actions.

## Roadmap

- End-to-end browser tests and a real-PostgreSQL CI job
- Deployment (CD) pipeline
- Metrics and tracing on top of the structured logs
- Reservation expiration automation
- Optional 2FA for admin accounts

## License

This project is provided for educational and portfolio purposes.
