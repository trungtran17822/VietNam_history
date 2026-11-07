#!/usr/bin/env bash
# Static checks for frontend/ (Vite + React + TS) and backend/. Unit and E2E tests: npm test.
# Usage: bash scripts/check.sh   (run from anywhere; needs node >= 20.19 and `npm ci`)
set -u
cd "$(dirname "$0")/.." || exit 1

fail=0
err() { echo "FAIL: $*"; fail=1; }

# 1. TypeScript, strict.
npx --no-install tsc -p frontend/tsconfig.json || err "TypeScript errors (frontend/tsconfig.json)"

# 2. Every lesson JSON matches the v2 contract (zod schema), its file name is its id, text is NFC.
npx --no-install vitest run --config frontend/vite.config.ts --reporter=dot -t "lesson contract" >/dev/null 2>&1 \
  || err "a lesson in frontend/src/content/lessons/ fails the schema (run: npx vitest run --config frontend/vite.config.ts -t 'lesson contract')"

# 3. Content labeling (.claude/rules/content-labeling.md): the notices exist verbatim in the code.
need() { grep -rqF "$2" "$1" || err "missing required label in $1: $2"; }
need frontend/src/components/ui.tsx 'Nội dung minh họa, chưa được chuyên gia duyệt'
need frontend/src/components/ui.tsx 'ĐÂY LÀ MÔ PHỎNG DỰA TRÊN Ý KIẾN CỦA HỌC SINH VÀ SỰ KIỆN THỰC TẾ, KHÔNG PHẢI SỰ THẬT LỊCH SỬ.'
need frontend/src/routes/__root.tsx 'PROTOTYPE_NOTICE'
need frontend/src/components/StageLoop.tsx 'SIMULATION_NOTICE'
need frontend/src/scene/silk-map.ts 'Trang phục và màu sắc chỉ là minh họa, chờ chuyên gia thẩm định'

# 4. Vietnamese text in sources is NFC (composed), so search and comparisons never miss.
python3 - <<'EOF' || err "source files with non-NFC Vietnamese text (normalize them to NFC)"
import pathlib, sys, unicodedata
bad = [str(p) for p in pathlib.Path('frontend/src').rglob('*') if p.suffix in {'.ts', '.tsx', '.json', '.css', '.md'}
       and unicodedata.normalize('NFC', t := p.read_text(encoding='utf-8')) != t]
print('\n'.join(bad)); sys.exit(1 if bad else 0)
EOF

# 5. Local files referenced by frontend/index.html exist (public/ assets or src/).
for ref in $(grep -oE '(src|href)="\./[^"#:]+"' frontend/index.html | sed -E 's/^(src|href)="\.\///; s/"$//'); do
  [ -e "frontend/$ref" ] || [ -e "frontend/public/$ref" ] || err "index.html references missing file: $ref"
done

# 6. Backend Worker sources (ES modules) parse.
for f in backend/src/*.js backend/dev-server.js; do
  node --check "$f" 2>&1 || err "syntax error in $f"
done

[ "$fail" -eq 0 ] && echo "OK: all checks passed"
exit "$fail"
