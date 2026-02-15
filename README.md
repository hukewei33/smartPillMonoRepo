# smartPillMonoRepo

## Setup (first-time / noob-friendly)

You need **Node.js** (v18+) and **npm** installed. Then:

1. **Clone the repo** (if you haven’t already):
   ```bash
   git clone <repo-url>
   cd smartPillMonoRepo
   ```

2. **Install server dependencies**:
   ```bash
   cd server
   npm i
   cd ..
   ```

3. **Install client dependencies**:
   ```bash
   cd webClient
   npm i
   cd ..
   ```

4. **Configure the server** (required for auth):
   - Copy `server/.env.example` to `server/.env`
   - Set `JWT_SECRET` to a long random string (e.g. 32+ characters)

That’s it. You can now start the app (see [Development](#development)).

---

## Development

From the repo root, start both the API server and the Next.js client in one go:

```bash
./start-dev.sh
```

- **Server** (API): http://localhost:3000  
- **Client** (web UI): http://localhost:3001  

Open the client URL to sign up, log in, or use the app. Stop with `Ctrl+C`; both processes will exit.

To run only one side:

- `cd server && npm run dev` — API only  
- `cd webClient && npm run dev` — client only (expects API on port 3000)

---

## Nuking the local dev database

To wipe the local SQLite database and start fresh (e.g. after testing or schema changes), run from the repo root:

```bash
./nuke-db.sh
```

The script will ask for confirmation: **you must type `NUKE`** (all caps) and press Enter. If the input matches, it deletes the dev DB file at `server/data/smartpill.db`. If you use a custom `DB_PATH` in `server/.env`, that path is not used by this script; delete that file manually if needed.

---

## Taking the MVP for a spin

End-to-end flow to try the app:

1. **Create an account and log in**  
   Open http://localhost:3001, sign up with an email and password, then log in.

2. **Create a medication**  
   Use the form to add a medication. Fill in name, dosage, and frequency . Save it.

3. **Log consumption**  
   Record that you took the medication (in production this would be done by the IoT device). Use the UI to log a consumption for the medication you created.

4. **View the 7-day consumption report**  
   Open the consumption report for the last 7 days. You should see the medication and the consumption you just logged for that period.

This mirrors the real flow: user and meds in the system, device (or manual) consumption logging, and reporting over a 7-day window.
