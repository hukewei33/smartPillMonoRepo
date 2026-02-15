# smartPillMonoRepo

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