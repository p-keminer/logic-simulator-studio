#!/bin/bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1 && [ -d "${HOME:-}/.nvm/versions/node" ]; then
  latest_nvm_bin="$(find "${HOME}/.nvm/versions/node" -maxdepth 2 -type d -name bin 2>/dev/null | sort | tail -n 1 || true)"
  if [ -n "${latest_nvm_bin:-}" ]; then
    export PATH="${latest_nvm_bin}:$PATH"
  fi
fi

echo "==> Focused-nine core audit"
./node_modules/.bin/vite-node validation/focused-nine-audit.mjs

echo "==> Validate focused-nine summary"
node <<'EOF'
const fs = require('node:fs');

const summary = JSON.parse(fs.readFileSync('validation/focused-nine-summary.json', 'utf8'));
const failures = [];

if ((summary.codeAudit?.hardBlockers ?? []).length > 0) {
  failures.push(`hardBlockers=${summary.codeAudit.hardBlockers.length}`);
}

if ((summary.codeAudit?.mediumRisks ?? []).length > 0) {
  failures.push(`mediumRisks=${summary.codeAudit.mediumRisks.length}`);
}

for (const entry of summary.cases ?? []) {
  if (entry.result?.status !== 'pass') {
    failures.push(`${entry.slug}:result=${entry.result?.status ?? 'missing'}`);
  }
  if (entry.toolingStatus !== 'pass') {
    failures.push(`${entry.slug}:tooling=${entry.toolingStatus ?? 'missing'}`);
  }
}

if (failures.length > 0) {
  console.error('Focused-nine core audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Focused-nine core audit green: ${(summary.cases ?? []).length} cases pass.`);
EOF
