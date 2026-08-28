#!/bin/bash
set -euo pipefail

echo "==> Golden Corpus v1 Runner"
npm run golden:test

echo "==> Validate golden-corpus summary"
node <<'EOF'
const fs = require('node:fs');

const summary = JSON.parse(fs.readFileSync('.artifacts/validation/golden-corpus/summary.json', 'utf8'));

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

const expectedExternalChecks = {
  'verilog-iverilog-syntax': 30,
  'verilog-verilator-lint': 30,
  'verilog-yosys-read': 30,
  'vhdl-ghdl-analyze': 30,
  'verilog-external-sim': 28,
  'vhdl-external-sim': 28,
};

for (const [checkId, expectedCount] of Object.entries(expectedExternalChecks)) {
  const checks = summary.results
    .flatMap(result => result.checks ?? [])
    .filter(check => check.checkId === checkId);
  const unsuccessful = checks.filter(check => check.status !== 'pass');

  if (checks.length !== expectedCount) {
    console.error(`${checkId}: expected ${expectedCount} checks, found ${checks.length}`);
    process.exit(1);
  }
  if (unsuccessful.length > 0) {
    console.error(`${checkId}: ${unsuccessful.length} non-passing check(s)`);
    for (const check of unsuccessful) {
      console.error(`- ${check.slug ?? 'unknown'}: ${check.status ?? 'missing'}`);
    }
    process.exit(1);
  }
}

// expected_limit is NOT a failure -- it documents known boundaries
if (summary.expectedLimit > 0) {
  console.log(`Golden corpus: ${summary.expectedLimit} expected limit(s) -- documented, not failure`);
}

console.log(`Golden corpus green: ${summary.passed} pass, ${summary.failed} fail, ${summary.expectedLimit} expected_limit, ${summary.unsupported} unsupported, ${total} total, 176 external HDL checks pass`);
EOF
