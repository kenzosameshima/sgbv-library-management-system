# SGBv Frontend

Frontend single-page application for the SGBv Library Management System.

## Overview

This React + TypeScript application consumes the SGBv backend API and provides workflows for authentication, catalog browsing, circulation, reservations, and administrative operations.

## Technology

- React
- TypeScript
- Vite
- React Router
- React Toastify

## Main Features

- Authentication and session handling
- Catalog search with title, author, and category filters
- Loan and return workflows
- Reservation flow for unavailable books
- Loan history view
- Administrative pages for users, books, fines, and reports
- Pagination, modal forms, and toast notifications

## SPA Routes

- /login
- /
- /catalog
- /loans
- /reservations
- /history
- /admin/users
- /admin/books
- /admin/fines
- /admin/reports

## Configuration

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Required variable:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## Development

```bash
npm install
npm run dev
```

## Quality and Build

```bash
npm run lint
npm run build
```
