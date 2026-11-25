#!/usr/bin/env bash
# Repository self-test. Does not contact the network.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pass=0
fail=0

ok() {
  printf 'PASS %s\n' "$1"
  pass=$((pass + 1))
}

bad() {
  printf 'FAIL %s\n' "$1"
  fail=$((fail + 1))
}

echo "## syntax"
if node scripts/syntax_check.mjs >/tmp/bwr-syntax.out 2>&1; then
  ok "syntax check"
else
  cat /tmp/bwr-syntax.out
  bad "syntax check"
fi

echo "## package"
if node scripts/check_package.mjs >/tmp/bwr-package.out 2>&1; then
  ok "package check"
else
  cat /tmp/bwr-package.out
  bad "package check"
fi

echo "## privacy"
if node scripts/privacy_scan.mjs . >/tmp/bwr-privacy.out 2>&1; then
  ok "privacy scan"
else
  cat /tmp/bwr-privacy.out
  bad "privacy scan"
fi

echo "## fixtures and tests"
for file in fixtures/har/sample.json fixtures/sourcemap.map fixtures/response.example.json tests/redact_har.test.mjs; do
  if [ -s "$file" ]; then ok "$file"; else bad "missing $file"; fi
done
if node --test tests/*.test.mjs >/tmp/bwr-tests.out 2>&1; then
  ok "node tests"
else
  cat /tmp/bwr-tests.out
  bad "node tests"
fi

echo "## skill references"
for file in references/checklist.md references/observation.md references/frontend-restore.md references/api-contracts.md references/security-model.md references/sign-and-crypto.md references/framework-recipes.md references/reconstruction.md; do
  if [ -s "$file" ]; then ok "$file"; else bad "missing $file"; fi
done

echo "## script inventory"
listed="$(grep -oE 'scripts/[A-Za-z0-9_.-]+\.(sh|mjs)' SKILL.md | sort -u)"
disk="$(find scripts -maxdepth 1 -type f \( -name '*.sh' -o -name '*.mjs' \) | sort)"
if [ "$listed" = "$disk" ]; then
  ok "SKILL.md script inventory matches disk"
else
  printf 'listed:\n%s\ndisk:\n%s\n' "$listed" "$disk"
  bad "SKILL.md script inventory mismatch"
fi

printf '\nPASS=%s FAIL=%s\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
