#!/bin/bash
set -euo pipefail

echo "==> Contract Runner v1"
npm run contract:test

echo "==> Validate contract-runner summary"
node <<'EOF'
const fs = require('node:fs');

const summary = JSON.parse(fs.readFileSync('validation/contract-runner-summary.json', 'utf8'));

// Invariant: totalCases = passed + failed + unsupported
const total = summary.totalCases;
const sum = summary.passed + summary.failed + summary.unsupported;
if (total !== sum) {
  console.error(`Invariant violated: totalCases(${total}) != passed(${summary.passed}) + failed(${summary.failed}) + unsupported(${summary.unsupported}) = ${sum}`);
  process.exit(1);
}

if (summary.failed > 0) {
  console.error(`Contract runner: ${summary.failed} failure(s)`);
  process.exit(1);
}

console.log(`Contract runner green: ${summary.passed} pass, ${summary.failed} fail, ${summary.unsupported} unsupported, ${total} total`);
EOF
