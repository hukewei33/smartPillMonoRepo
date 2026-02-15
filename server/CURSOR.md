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

## API contracts

**See [API.md](./API.md)** for the full API contract: request/response shapes, status codes, validation rules, and auth (Bearer JWT).

Quick reference:

- `GET /health` — no auth; `{ "status": "ok" }`
- `POST /auth/register` — body `{ email, password }`; 201 + `{ id, email }` or 400/409
- `POST /auth/login` — body `{ email, password }`; 200 + `{ token }` or 400/401
- `GET /hello` — `Authorization: Bearer <token>`; 200 + `{ message }` or 401

## Conventions

- **TypeScript:** Use strict mode. Types for Express (e.g. `req.user`, `app.get('db')`) are in `src/types/express.d.ts`. Use `.ts` for all new server code.
- **Env:** `PORT`, `JWT_SECRET`; optional `DB_PATH`. Use `.env` and `.env.example` (no secrets in repo).
- **Tests:** `npm test` builds then runs `node --test dist/test/` with `JWT_SECRET=test-secret`. Each test gets a fresh `:memory:` DB and closes it in `afterEach`.
