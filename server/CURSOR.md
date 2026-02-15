# SmartPill Server — Cursor context

This file tracks objectives and context for the server in the SmartPill monorepo so Cursor (and humans) can stay aligned.

## Language and tooling

- **Use TypeScript** for all server code. Source lives in `src/` and `test/` (`.ts`). Build with `npm run build` (output in `dist/`). Run with `npm start` (runs compiled JS) or `npm run dev` (tsx watch). Tests run against compiled code: `npm test` runs `pretest` (build) then `node --test dist/test/`.

## Objectives (current)

- **MVP for smart medication consumption tracking.** Backend lives in `./server`; web client will live in `./webClient`. This repo is JS/TS-based: Node.js backend (TypeScript), Next.js frontend (when added).
- **Auth for web, mobile, and IoT.** Use stateless JWT (Bearer token) so the same API can serve all clients. No custom security: use established libs (e.g. jsonwebtoken, express-jwt, argon2).
- **Relational DB.** SQLite via better-sqlite3 for this phase; single DB file, schema applied on startup.
- **Testability.** Tests use a clean in-memory SQLite DB per test and close it in `afterEach`. No shared DB state between tests.

## Implemented so far

1. **Bootstrap** — Express app, health route, DB module with `users` table, env (PORT, JWT_SECRET, optional DB_PATH).
2. **Auth (option A)** — jsonwebtoken + express-jwt: register, login, JWT verification middleware setting `req.user`.
3. **Endpoints** — POST `/auth/register`, POST `/auth/login`, GET `/hello` (protected).
4. **Tests** — Node `node:test` + supertest; register, login, and hello tests with clean DB and cleanup.
5. **Medications** — `medications` table (user_id, name, dose, start_date, daily_frequency, day_interval). Authenticated CRUD: GET/POST `/medications`, GET/PUT/DELETE `/medications/:id`; all scoped to `req.user.sub`. Full test coverage including user-scoping (users cannot view/update/delete other users’ medications).

## API contracts

**See [API.md](./API.md)** for the full API contract: request/response shapes, status codes, validation rules, and auth (Bearer JWT).

Quick reference:

- `GET /health` — no auth; `{ "status": "ok" }`
- `POST /auth/register` — body `{ email, password }`; 201 + `{ id, email }` or 400/409
- `POST /auth/login` — body `{ email, password }`; 200 + `{ token }` or 400/401
- `GET /hello` — `Authorization: Bearer <token>`; 200 + `{ message }` or 401

## Local dev database

- **Engine:** SQLite via better-sqlite3 (single file, no separate process).
- **Default path:** `server/data/smartpill.db`. The `data/` directory is created automatically on first run if it doesn’t exist.
- **Override:** Set `DB_PATH` in `.env` (e.g. `DB_PATH=./data/smartpill.db` or an absolute path) to use a different file.
- **Schema:** Applied on server startup in `src/db.ts`: `openDatabase()` runs the schema SQL (e.g. `CREATE TABLE IF NOT EXISTS users ...`). No migrations yet; schema is fixed in code.
- **Local env:** Copy `.env.example` to `.env` in `server/` and set `JWT_SECRET` (and optionally `PORT`, `DB_PATH`). `.env` is gitignored; use it for local dev only.

## Structure

- **models/** — Entity types and DTOs: `User`, `UserRow`, `RegisterInput`, `LoginInput`; `Medication`, `MedicationRow`, `MedicationInput`. No business logic.
- **services/** — Business logic: `auth` (register, login, validation), `medications` (CRUD + validation), `hello` (getHelloMessage). Services take `db` and other primitives; return result objects or data.
- **routes/** — HTTP only: parse request, call service, set response status/body. No DB or validation logic in routes.

## Conventions

- **TypeScript:** Use strict mode. Types for Express (e.g. `req.user`, `app.get('db')`) are in `src/types/express.d.ts`. Use `.ts` for all new server code.
- **Env:** `PORT`, `JWT_SECRET`; optional `DB_PATH`. Use `.env` and `.env.example` (no secrets in repo).
- **Tests:** `npm test` builds then runs `node --test dist/test/` with `JWT_SECRET=test-secret`. Each test gets a fresh `:memory:` DB and closes it in `afterEach`.
