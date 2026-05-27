#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Checking for legacy version links in docs/ ..."
FILES=(
  docs/minna-app.html
  docs/minna-app.js
  docs/minna-path.html
  docs/minna-path.js
  docs/minna-toolbox.html
  docs/minna-favorites.html
  docs/minna-favorites-page.js
  docs/minna-app-shell.js
  docs/minna-app-lessons.html
  docs/minna-app-favorites.html
  docs/minna-pwa-manifest.json
)
if rg -n "v=20\\.|v=21\\.|minna-app\\.html\\?v=22\\.0|v=1\\.10|v=1\\.9|v=1\\.0" "${FILES[@]}"; then
  echo
  echo "Found legacy links above. Please fix before release."
  exit 1
fi

echo "Checking required v22.1 anchors ..."
rg -n "minna-version\\.js\\?v=22\\.1|start_url\": \"\\./minna-app\\.html\\?v=22\\.1|minna-sw-register\\.js\\?v=22\\.1" \
  docs/minna-app.html docs/minna-path.html docs/minna-pwa-manifest.json docs/minna-toolbox.html docs/minna-favorites.html docs/minna-app-lessons.html docs/minna-app-favorites.html >/dev/null

echo "Release link check passed."
