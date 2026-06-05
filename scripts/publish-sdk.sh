#!/usr/bin/env bash
# Publish @marketwatch/sdk to npm with safety checks.
#
# Usage:
#   scripts/publish-sdk.sh [--dry-run] [--tag <dist-tag>] [--otp <code>]
#   scripts/publish-sdk.sh patch|minor|major [--dry-run]   # bump first, then publish
#
# Requires: npm login (or NPM_TOKEN env var) with publish rights on @marketwatch scope.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK_DIR="$(cd "$SCRIPT_DIR/../packages/marketwatch-sdk" && pwd)"

DRY_RUN=0
DIST_TAG="latest"
OTP=""
BUMP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --tag) DIST_TAG="$2"; shift 2 ;;
    --otp) OTP="$2"; shift 2 ;;
    patch|minor|major) BUMP="$1"; shift ;;
    -h|--help)
      sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

cd "$SDK_DIR"

log() { printf "\033[1;36m[publish-sdk]\033[0m %s\n" "$*"; }

# 1. Auth check (skip in dry-run)
if [[ $DRY_RUN -eq 0 ]]; then
  if [[ -z "${NPM_TOKEN:-}" ]]; then
    if ! npm whoami >/dev/null 2>&1; then
      echo "Not logged in to npm. Run 'npm login' or set NPM_TOKEN." >&2
      exit 1
    fi
  fi
fi

# 2. Clean working tree check (warn only)
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if [[ -n "$(git status --porcelain "$SDK_DIR")" ]]; then
    log "WARNING: uncommitted changes in $SDK_DIR"
  fi
fi

# 3. Install deps
log "Installing dependencies..."
npm install --silent --no-audit --no-fund

# 4. Typecheck
log "Typechecking..."
npm run typecheck

# 5. Build
log "Building..."
npm run build

# 6. Verify build output
if [[ ! -f "dist/index.js" || ! -f "dist/index.d.ts" ]]; then
  echo "Build did not produce dist/index.js or dist/index.d.ts" >&2
  exit 1
fi
log "Build verified: dist/index.js + dist/index.d.ts"

# 7. Version bump (optional)
if [[ -n "$BUMP" ]]; then
  log "Bumping version: $BUMP"
  npm version "$BUMP" --no-git-tag-version
fi

VERSION=$(node -p "require('./package.json').version")
NAME=$(node -p "require('./package.json').name")
log "Package: $NAME@$VERSION  (tag: $DIST_TAG)"

# 8. Check version is not already published
if npm view "$NAME@$VERSION" version >/dev/null 2>&1; then
  echo "Version $VERSION is already published on npm. Bump first." >&2
  exit 1
fi

# 9. Pack preview
log "Pack preview:"
npm pack --dry-run 2>&1 | tail -n 30

# 10. Publish
PUBLISH_ARGS=(--access public --tag "$DIST_TAG")
[[ -n "$OTP" ]] && PUBLISH_ARGS+=(--otp "$OTP")

if [[ $DRY_RUN -eq 1 ]]; then
  log "DRY RUN — would run: npm publish ${PUBLISH_ARGS[*]}"
  npm publish --dry-run "${PUBLISH_ARGS[@]}"
else
  log "Publishing to npm..."
  npm publish "${PUBLISH_ARGS[@]}"
  log "Published $NAME@$VERSION"
fi