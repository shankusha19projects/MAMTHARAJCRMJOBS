#!/usr/bin/env bash
# JobPilot CRM launcher for macOS / Linux
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js 18+ is required: https://nodejs.org"; exit 1; }
[ -d node_modules ] || npm install --no-audit --no-fund
if [ ! -f JobPilot-CRM.html ]; then (cd app && npm install --no-audit --no-fund && npm run build); fi
echo "Starting JobPilot CRM on http://localhost:4321 (Ctrl+C to stop)"
node server/server.js
