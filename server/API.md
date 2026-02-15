# SmartPill Server API

API contract for the SmartPill backend. Base URL is the server origin (e.g. `http://localhost:3000`). All JSON request/response bodies use `Content-Type: application/json` unless noted.

---

## Health

### GET /health

Unprotected. Use for liveness/readiness checks.

**Response:** `200 OK`

```json
{ "status": "ok" }
```

---

## Auth

All auth routes are under the `/auth` prefix.

### POST /auth/register

Create a new account. Email is stored normalized (trimmed, lowercased). Password is hashed with Argon2; plaintext is never stored.

**Request body:**

| Field     | Type   | Required | Notes                                      |
| --------- | ------ | -------- | ------------------------------------------ |
| `email`   | string | yes      | Must contain `@` with non-empty local part. |
| `password` | string | yes      | Minimum 8 characters.                       |

**Responses:**

- **201 Created** — Account created.

  ```json
  { "id": 1, "email": "user@example.com" }
  ```

  `id` is the numeric user ID (integer).

- **400 Bad Request** — Validation failed. Body: `{ "error": "<message>" }`.  
  Examples: `"Invalid or missing email"`, `"Password must be at least 8 characters"`, `"Invalid body"`.

- **409 Conflict** — Email already registered. Body: `{ "error": "Email already registered" }`.

---

### POST /auth/login

Authenticate and receive a JWT. Same error message for wrong email and wrong password to avoid user enumeration.

**Request body:**

| Field     | Type   | Required | Notes                |
| --------- | ------ | -------- | -------------------- |
| `email`   | string | yes      | Valid email format.   |
| `password` | string | yes      | User’s password.      |

**Responses:**

- **200 OK** — Login successful.

  ```json
  { "token": "<JWT>" }
  ```

  Use the token in the `Authorization` header for protected routes: `Authorization: Bearer <token>`.

  Token payload includes `sub` (user id) and `email`. Algorithm: HS256. Default expiry: 1 hour.

- **400 Bad Request** — Validation failed. Body: `{ "error": "<message>" }`.  
  Examples: `"Invalid or missing email"`, `"Password required"`, `"Invalid body"`.

- **401 Unauthorized** — Invalid credentials. Body: `{ "error": "Invalid email or password" }`.

---

## Protected routes

Protected routes require a valid JWT in the header:

```
Authorization: Bearer <token>
```

Invalid or missing token returns **401 Unauthorized** with body: `{ "error": "Invalid or missing token" }`.

---

### GET /hello

Authenticated “hello world” endpoint. Response message includes the authenticated user’s email when present in the token.

**Headers:** `Authorization: Bearer <token>` (required).

**Responses:**

- **200 OK**

  If the JWT payload contains `email`:

  ```json
  { "message": "Hello, <email>" }
  ```

  Otherwise:

  ```json
  { "message": "Hello, world" }
  ```

- **401 Unauthorized** — Missing or invalid token. Body: `{ "error": "Invalid or missing token" }`.

---

## Summary

| Method | Path             | Auth   | Purpose                |
| ------ | ---------------- | ------ | ---------------------- |
| GET    | /health          | no     | Health check           |
| POST   | /auth/register   | no     | Create account         |
| POST   | /auth/login      | no     | Login, get JWT         |
| GET    | /hello           | Bearer | Authenticated example  |
