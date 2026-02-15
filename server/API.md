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

## Medications

All medication routes are under `/medications`. They require a valid JWT. **Medications are scoped to the authenticated user:** users can only create, view, update, and delete their own medications. Accessing another user’s medication by ID returns **404 Not Found**.

### GET /medications

List all medications for the authenticated user.

**Headers:** `Authorization: Bearer <token>` (required).

**Responses:**

- **200 OK**

  ```json
  {
    "medications": [
      {
        "id": 1,
        "name": "Aspirin",
        "dose": "100mg",
        "start_date": "2025-01-01",
        "daily_frequency": 2,
        "day_interval": 1,
        "created_at": "2025-01-01T12:00:00.000Z"
      }
    ]
  }
  ```

- **401 Unauthorized** — Missing or invalid token.

---

### POST /medications

Create a new medication for the authenticated user.

**Headers:** `Authorization: Bearer <token>` (required).

**Request body:**

| Field             | Type   | Required | Notes                        |
| ----------------- | ------ | -------- | ---------------------------- |
| `name`            | string | yes      | Medication name.             |
| `dose`            | string | yes      | e.g. `"100mg"`, `"2000 IU"`. |
| `start_date`      | string | yes      | ISO date (e.g. `YYYY-MM-DD`). |
| `daily_frequency` | number | yes      | Positive integer (times/day). |
| `day_interval`   | number | yes      | Positive integer (e.g. 1 = daily, 2 = every 2 days). |

**Responses:**

- **201 Created** — Medication created. Body is the created medication object (same shape as list items, including `id` and `created_at`).
- **400 Bad Request** — Validation failed. Body: `{ "error": "<message>" }`.
- **401 Unauthorized** — Missing or invalid token.

---

### GET /medications/:id

Get a single medication by ID. Returns 404 if the medication does not exist or does not belong to the authenticated user.

**Headers:** `Authorization: Bearer <token>` (required).

**Responses:**

- **200 OK** — Medication object (same shape as list items).
- **400 Bad Request** — Invalid `id`. Body: `{ "error": "Invalid medication id" }`.
- **401 Unauthorized** — Missing or invalid token.
- **404 Not Found** — Medication not found or not owned by user. Body: `{ "error": "Medication not found" }`.

---

### PUT /medications/:id

Update a medication. Returns 404 if the medication does not exist or does not belong to the authenticated user.

**Headers:** `Authorization: Bearer <token>` (required).

**Request body:** Same as POST /medications (all fields required).

**Responses:**

- **200 OK** — Updated medication object.
- **400 Bad Request** — Validation failed or invalid `id`.
- **401 Unauthorized** — Missing or invalid token.
- **404 Not Found** — Medication not found or not owned by user.

---

### DELETE /medications/:id

Delete a medication. Returns 404 if the medication does not exist or does not belong to the authenticated user.

**Headers:** `Authorization: Bearer <token>` (required).

**Responses:**

- **204 No Content** — Medication deleted.
- **400 Bad Request** — Invalid `id`.
- **401 Unauthorized** — Missing or invalid token.
- **404 Not Found** — Medication not found or not owned by user.

---

### POST /medications/:id/consumptions

Log a medication consumption for the given medication. The medication must belong to the authenticated user (returns 404 otherwise).

**Headers:** `Authorization: Bearer <token>` (required).

**Request body:**

| Field  | Type   | Required | Notes                          |
| ------ | ------ | -------- | ------------------------------ |
| `date` | string | yes      | Date of consumption (YYYY-MM-DD). |
| `time` | string | yes      | Time of consumption (HH:MM or HH:MM:SS). |

**Responses:**

- **201 Created** — Consumption logged.

  ```json
  {
    "id": 1,
    "medication_id": 1,
    "date": "2025-02-15",
    "time": "08:30",
    "created_at": "2025-02-15T12:00:00.000Z"
  }
  ```

- **400 Bad Request** — Validation failed or invalid medication `id`. Body: `{ "error": "<message>" }`.
- **401 Unauthorized** — Missing or invalid token.
- **404 Not Found** — Medication not found or not owned by user. Body: `{ "error": "Medication not found" }`.

---

## Summary

| Method | Path               | Auth   | Purpose                    |
| ------ | ------------------ | ------ | -------------------------- |
| GET    | /health            | no     | Health check               |
| POST   | /auth/register     | no     | Create account             |
| POST   | /auth/login        | no     | Login, get JWT             |
| GET    | /hello             | Bearer | Authenticated example      |
| GET    | /medications       | Bearer | List user’s medications   |
| POST   | /medications       | Bearer | Create medication          |
| GET    | /medications/:id   | Bearer | Get one medication        |
| PUT    | /medications/:id   | Bearer | Update medication          |
| DELETE | /medications/:id   | Bearer | Delete medication          |
| POST   | /medications/:id/consumptions | Bearer | Log medication consumption |
