# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SmartPill is a medication tracking monorepo: a Node.js/Express + SQLite backend (`server/`) and a Next.js frontend (`webClient/`). The system tracks medication schedules and logs consumption, with 7-day reporting.

## Development Commands

### Start Everything
```bash
./start-dev.sh    # Starts server (port 3000) and client (port 3001) concurrently
```

### Server (`cd server`)
```bash
npm run dev       # tsx watch (hot reload)
npm run build     # Compile TypeScript → dist/
npm start         # Run compiled dist/src/index.js
npm test          # Build then run node --test on dist/test/
```

### Client (`cd webClient`)
```bash
npm run dev       # Next.js dev server on port 3001
npm run build     # Production build
npm run lint      # ESLint
```

### Database Reset
```bash
./nuke-db.sh      # Wipe dev DB; must type NUKE to confirm
```

### First-Time Setup
```bash
cd server && npm i && cd ..
cd webClient && npm i && cd ..
cp server/.env.example server/.env   # Then set JWT_SECRET (32+ chars)
```

## API Contract

**Full API reference: [`server/API.md`](./server/API.md).** Read it before touching any route, service validation, or request/response shape. It is the source of truth for all endpoint contracts.

**Keep it in sync:** Any change to a route path, HTTP method, request field, response field, status code, or validation rule **must** be reflected in `server/API.md` in the same commit/PR. Do not mark a feature done if the code and `server/API.md` disagree.

## Architecture

### Server Layer Pattern
```
Routes (HTTP only: parse req, call service, set response)
  ↓
Services (business logic + validation)
  ↓
Database (SQLite via better-sqlite3, sync API)
```

- **models/** — TypeScript interfaces and DTOs only; no logic
- **services/** — All validation, business rules, and DB queries
- **routes/** — No validation or DB access; just wires HTTP to services
- **middleware/auth.ts** — express-jwt sets `req.user` on protected routes; user ID is `req.user.sub`

### Database
- SQLite file at `server/data/smartpill.db` (auto-created on startup)
- Schema applied in `server/src/db.ts` via `openDatabase()` using `CREATE TABLE IF NOT EXISTS`
- No migrations; schema changes require dropping and recreating tables
- Tests use in-memory `:memory:` DB, fresh per test, closed in `afterEach`

### Auth
- Stateless JWT (HS256, 1-hour expiry) via jsonwebtoken + express-jwt
- Passwords hashed with Argon2
- Token payload: `{ sub: userId, email: string }`
- All protected routes require `Authorization: Bearer <token>`

### Key Schema
```sql
users(id, email, password_hash, created_at)
medications(id, user_id, name, dose, start_date, times, day_interval, created_at)
medication_consumptions(id, medication_id, date, time, created_at)
```
`times` is stored as a JSON array of `HH:MM` strings (e.g. `'["08:00","14:00"]'`).
Medications and consumptions are user-scoped — services always filter by `req.user.sub`.

### Frontend
- **`lib/api.ts`** — All API calls; uses `NEXT_PUBLIC_API_URL` (default `http://localhost:3000`)
- **`lib/SessionContext.tsx`** — React context for auth state; validates token on mount via `GET /hello`
- **`lib/session.ts`** — JWT stored in localStorage under `smartpill_token`
- **`app/page.tsx`** — Login/register (redirects to `/home` if logged in)
- **`app/home/page.tsx`** — Main dashboard with Radix UI tabs: Medications, Add Medication, Report

### CORS
Server is currently hardcoded to allow `localhost:3001`. Update in `server/src/app.ts` when deploying.

## Testing Conventions

- Tests are server-only (no client tests)
- Each test file imports `createApp()` and creates a fresh in-memory DB
- `test/helpers.ts` contains shared setup utilities
- Run a single test file: build first with `npm run build`, then `node --test dist/test/auth.test.js`

## TypeScript Notes

- Server: strict mode; Express type augmentations in `src/types/express.d.ts`
- Client: strict mode; `@/*` path alias maps to `webClient/`
- Server compiled to CommonJS (`"module": "commonjs"`); client uses Next.js bundler
