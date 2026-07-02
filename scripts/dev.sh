#!/usr/bin/env bash
# Dev server tuned for macOS + projects in Documents/iCloud (slow file watcher).
set -e
cd "$(dirname "$0")/.."

echo "→ Stopping old Next processes…"
pkill -f "next dev" 2>/dev/null || true
pkill -f "next build" 2>/dev/null || true
sleep 1

echo "→ Clearing .next cache…"
rm -rf .next

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=6144}"
export WATCHPACK_POLLING="${WATCHPACK_POLLING:-true}"
export CHOKIDAR_USEPOLLING="${CHOKIDAR_USEPOLLING:-1}"
export NEXT_TELEMETRY_DISABLED=1

# Let .env.local win over stale shell exports (common after key rotation).
unset PERPLEXITY_API_KEY OPENAI_API_KEY ANTHROPIC_API_KEY GOOGLE_API_KEY

echo "→ Starting Next.js on http://127.0.0.1:3000 …"
echo "   (first start can take 1–3 min in Documents/iCloud — wait for Ready)"
exec npx next dev -p 3000 -H 127.0.0.1
