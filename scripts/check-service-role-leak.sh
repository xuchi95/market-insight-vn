#!/usr/bin/env bash
# Fail the build if the service-role key (or any server-only Supabase admin
# module) leaks into the client bundle.
#
# Defences this script verifies are still in place:
#   1. `src/integrations/supabase/client.server.ts` uses the `.server.ts`
#      extension — Vite import-protection blocks any client import of it.
#   2. The service role key is read via `process.env.SUPABASE_SERVICE_ROLE_KEY`
#      only (never `import.meta.env.*`), so Vite cannot inline it into a
#      client chunk.
#   3. No source file under `src/` references the service-role key outside of
#      `*.server.ts` modules.
#
# Run after `vite build` (or `bun run build`). Also runnable standalone — it
# auto-detects the client output directory.
#
# Usage:
#   scripts/check-service-role-leak.sh                  # auto-detect
#   scripts/check-service-role-leak.sh dist/client      # explicit
#
# Exits non-zero on any finding so CI fails loudly.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { printf "${GREEN}[leak-check]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[leak-check]${NC} %s\n" "$*"; }
fail() { printf "${RED}[leak-check] FAIL:${NC} %s\n" "$*" >&2; exit 1; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

###############################################################################
# 1. Source-code guards (run even without a build directory)
###############################################################################
log "Source-code guards…"

# 1a. Service role key must never be read via Vite's import.meta.env (which
#     bakes values into the client bundle at build time).
if rg -n --no-heading "import\.meta\.env\.[A-Z_]*SERVICE_ROLE" src/ 2>/dev/null; then
  fail "SUPABASE_SERVICE_ROLE_KEY is read via import.meta.env — Vite would inline it into the client bundle."
fi

# 1b. Service role key references must only appear in server-only modules
#     (*.server.ts/tsx, *.functions.ts/tsx, src/routes/api/**, src/routes/lovable/**).
leaked_sources=$(rg -l --no-heading "SUPABASE_SERVICE_ROLE_KEY|supabaseAdmin" src/ 2>/dev/null \
  | grep -Ev '\.server\.(ts|tsx)$' \
  | grep -Ev '\.functions\.(ts|tsx)$' \
  | grep -Ev '^src/routes/api/' \
  | grep -Ev '^src/routes/lovable/' \
  || true)
if [[ -n "$leaked_sources" ]]; then
  printf "%s\n" "$leaked_sources" >&2
  fail "Files above reference the service role key or admin client outside server-only modules."
fi

# 1c. The admin client module itself must keep the `.server.ts` extension so
#     Vite import-protection refuses any client import.
if [[ ! -f src/integrations/supabase/client.server.ts ]]; then
  fail "Expected src/integrations/supabase/client.server.ts to exist (its .server.ts extension is what blocks client imports)."
fi
if rg -nq "import\.meta\.env" src/integrations/supabase/client.server.ts; then
  fail "client.server.ts must read the service role key from process.env, never import.meta.env."
fi

log "Source guards passed."

###############################################################################
# 2. Client bundle scan
###############################################################################
CANDIDATE_DIRS=(
  "${1:-}"
  "dist/client"
  ".output/public"
  "dist/public"
  "dist"
  ".vite/build/client"
)

CLIENT_DIR=""
for d in "${CANDIDATE_DIRS[@]}"; do
  [[ -z "$d" ]] && continue
  if [[ -d "$d" ]]; then
    # Prefer dirs that look like client assets (contain js/css/html).
    if find "$d" -maxdepth 4 -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -print -quit | grep -q .; then
      CLIENT_DIR="$d"
      break
    fi
  fi
done

if [[ -z "$CLIENT_DIR" ]]; then
  warn "No client build output found — skipping bundle scan. Run 'vite build' first to enable it."
  log "OK (source-only)."
  exit 0
fi

log "Scanning client bundle: $CLIENT_DIR"

# Patterns that must never appear in shipped client assets.
PATTERNS=(
  'SUPABASE_SERVICE_ROLE_KEY'
  'service_role'
  'supabaseAdmin'
  'client\.server'
  'createSupabaseAdminClient'
)

found=0
for pat in "${PATTERNS[@]}"; do
  matches=$(rg -l --no-heading -e "$pat" "$CLIENT_DIR" 2>/dev/null || true)
  if [[ -n "$matches" ]]; then
    warn "Pattern '$pat' found in:"
    printf "  %s\n" $matches >&2
    found=1
  fi
done

# Match the actual JWT value of the service role key if exposed via env at
# CI time (e.g. SUPABASE_SERVICE_ROLE_KEY set on the runner).
if [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  # JWT first segment is enough — full key avoids false hits but stays unique.
  key_prefix="${SUPABASE_SERVICE_ROLE_KEY:0:48}"
  if rg -l --no-heading -F "$key_prefix" "$CLIENT_DIR" >/dev/null 2>&1; then
    warn "Actual service-role key value found in client bundle!"
    rg -l --no-heading -F "$key_prefix" "$CLIENT_DIR" >&2
    found=1
  fi
fi

if [[ "$found" -ne 0 ]]; then
  fail "Service-role key or admin client leaked into the client bundle."
fi

log "Client bundle clean — no service-role leak detected."