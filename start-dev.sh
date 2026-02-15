#!/usr/bin/env bash
# Start both SmartPill server and web client for local development.
# Server: http://localhost:3000  |  Client: http://localhost:3001

set -e
cd "$(dirname "$0")"

# On exit or Ctrl+C, kill both child processes
trap 'kill 0' EXIT

(cd server && npm run dev) &
(cd webClient && npm run dev) &

wait
