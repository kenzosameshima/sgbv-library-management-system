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

3. Create the database and apply schema:

```bash
createdb sgb_mvp
npm run db:init
```

4. Start backend development server:

```bash
npm run dev
```

Health check endpoint:

- GET http://localhost:3000/health

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
|  |- models/
|  \- types/
|- config/
|  |- schema.sql
|  \- security/db_hardening.sql
|- scripts/ops/
|  |- backup_retention.ps1
|  \- restore_test.ps1
\- frontend/
```

## Quality Checks

Backend:

```bash
npm run lint
```

Frontend:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Roadmap

- Automated tests (unit/integration/e2e)
- CI/CD pipeline
- Structured observability and monitoring
- Reservation expiration automation
- Optional 2FA for admin accounts
- OpenAPI documentation

## License

This project is provided for educational and portfolio purposes.
