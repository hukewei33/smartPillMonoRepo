#!/usr/bin/env bash
# Nuke the local dev SQLite DB. Asks for confirmation: user must type NUKE.

set -e
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_DB="${REPO_ROOT}/server/data/smartpill.db"

echo "This will DELETE the local dev database at:"
echo "  ${DEFAULT_DB}"
echo ""
echo "Type NUKE (all caps) and press Enter to confirm, or anything else to cancel."
read -r input

if [ "$input" != "NUKE" ]; then
  echo "Not NUKE — doing nothing. Bye."
  exit 0
fi

if [ -f "$DEFAULT_DB" ]; then
  rm -f "$DEFAULT_DB"
  echo "Database deleted."
else
  echo "No file at ${DEFAULT_DB} — nothing to delete."
fi
