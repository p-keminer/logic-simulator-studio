#!/bin/bash
set -euo pipefail

echo "==> Golden Corpus v1 Runner"
npm run golden:test

echo "==> Validate golden-corpus summary"
node <<'EOF'
const fs = require('node:fs');

const summary = JSON.parse(fs.readFileSync('validation/golden-corpus-v1-summary.json', 'utf8'));

// Invariant: totalCases = passed + failed + expectedLimit + unsupported
const total = summary.totalCases;
const sum = summary.passed + summary.failed + summary.expectedLimit + summary.unsupported;
if (total !== sum) {
  console.error(`Invariant violated: totalCases(${total}) != passed(${summary.passed}) + failed(${summary.failed}) + expectedLimit(${summary.expectedLimit}) + unsupported(${summary.unsupported}) = ${sum}`);
  process.exit(1);
}

if (summary.failed > 0) {
  console.error(`Golden corpus: ${summary.failed} failure(s)`);
  process.exit(1);
}

// expected_limit is NOT a failure -- it documents known boundaries
if (summary.expectedLimit > 0) {
  console.log(`Golden corpus: ${summary.expectedLimit} expected limit(s) -- documented, not failure`);
}

console.log(`Golden corpus green: ${summary.passed} pass, ${summary.failed} fail, ${summary.expectedLimit} expected_limit, ${summary.unsupported} unsupported, ${total} total`);
EOF
