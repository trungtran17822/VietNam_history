#!/usr/bin/env bash
# Static checks for the prototype (no build step or test suite exists).
# Usage: bash scripts/check.sh   (run from anywhere)
set -u
cd "$(dirname "$0")/../prototype" || exit 1

fail=0
err() { echo "FAIL: $*"; fail=1; }

# 1. Syntax-check our own JS (vendor/ is third-party).
for f in js/*.js; do
  node --check "$f" 2>&1 || err "syntax error in $f"
done

# 2. JSON data files must parse.
for f in data/*.json; do
  python3 -c "import json,sys; json.load(open(sys.argv[1], encoding='utf-8'))" "$f" 2>/dev/null \
    || err "invalid JSON: $f"
done

# 3. Every local <script src> / <link href> in index.html must exist.
for ref in $(grep -oE '(src|href)="[^"#:]+"' index.html | sed -E 's/^(src|href)="//; s/"$//'); do
  [ -e "$ref" ] || err "index.html references missing file: $ref"
done

# 4. Each js/*.js should be loaded, except the known legacy renderer.
for f in js/*.js; do
  name=$(basename "$f")
  [ "$name" = "scene3d.js" ] && continue
  grep -q "js/$name" index.html || err "$f is not loaded by index.html (add it, or delete it)"
done

[ "$fail" -eq 0 ] && echo "OK: all checks passed"
exit "$fail"
