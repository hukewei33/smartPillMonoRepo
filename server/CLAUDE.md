# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # tsx watch with hot reload
npm run build     # Compile TypeScript → dist/
npm start         # Run compiled dist/src/index.js
npm test          # Build then run node --test dist/test/
```

Run a single test file (after building):
```bash
node --test dist/test/medications.test.js
```

Set required env before running tests manually:
```bash
JWT_SECRET=test-secret node --test dist/test/auth.test.js
```

## API Contract

**Full API reference is in [API.md](./API.md).** Read it before adding or modifying any endpoint. It documents request/response shapes, validation rules, status codes, and auth requirements for every route.

Quick endpoint summary:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | /health | no | Liveness check |
| POST | /auth/register | no | Create account |
| POST | /auth/login | no | Get JWT |
| GET | /hello | Bearer | Auth smoke test |
| GET /POST | /medications | Bearer | List / create |
| GET /PUT /DELETE | /medications/:id | Bearer | Single medication CRUD |
| POST | /medications/:id/consumptions | Bearer | Log intake |
| GET | /consumption-report?start_date= | Bearer | 7-day report |

## Test Validation Loop

**Every new feature or change must ship with tests.** This is the required workflow:

1. Write or update the service and route code
2. Write tests in `test/` covering the happy path, validation errors, and auth/ownership edge cases
3. Run `npm test` — it builds first, then runs all tests
4. Fix failures, repeat until green
5. Do not consider a feature done until `npm test` passes cleanly

**What tests must cover for any new endpoint or service function:**
- Happy path with valid input
- All validation error cases (missing fields, wrong types, out-of-range values)
- Auth rejection (missing or invalid token → 401)
- User-scoping (user A cannot access user B's resources → 404, not 403)

Reference the existing test files for patterns — they all use a fresh in-memory DB per test and clean up in `afterEach`.

## Architecture

### Layer Rules

```
Routes  →  Services  →  Database
```

- **routes/**: HTTP only. Parse request body/params, call one service function, set status and response body. No validation logic, no direct DB access.
- **services/**: All validation, business rules, and SQL. Return result objects or throw with meaningful messages. Take `db` as a parameter — never import the DB module directly in services.
- **models/**: TypeScript interfaces and DTOs only. No logic.
- **middleware/auth.ts**: express-jwt middleware. Sets `req.user` on protected routes; user ID is `req.user.sub`.

### Database

- SQLite via `better-sqlite3` (synchronous API — no `await` needed)
- Schema defined in `src/db.ts` via `openDatabase()` with `CREATE TABLE IF NOT EXISTS`
- No migration system; schema changes require wiping and recreating the DB (`./nuke-db.sh` from repo root)
- Tests pass `:memory:` to `openDatabase()` for an isolated, disposable DB per test

### Auth

- JWT: HS256, 1-hour expiry, payload `{ sub: userId, email }`
- Passwords hashed with Argon2 — never store or log plaintext passwords
- `JWT_SECRET` must be set in `.env` (copy `.env.example`); tests set it via environment variable

### TypeScript

- Strict mode. All new server code in `.ts`.
- Express type augmentations (e.g. `req.user`, `app.get('db')`) live in `src/types/express.d.ts` — add new augmentations there, not inline.

### Conventions

- Medications and consumptions are always scoped to `req.user.sub` — services receive `userId` as a parameter and filter by it
- Date format: `YYYY-MM-DD`; time format: `HH:MM` or `HH:MM:SS` — validate in service layer
- Error responses always use `{ "error": "<message>" }` shape
- Use the same vague error message for both wrong-email and wrong-password login to prevent user enumeration
