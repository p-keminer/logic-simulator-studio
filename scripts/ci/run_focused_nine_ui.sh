#!/bin/bash
# CI wrapper for the focused-nine UI audit.
#
# 1. Starts a Vite dev server in the background.
# 2. Waits until the server is reachable.
# 3. Runs the UI audit (puppeteer) against the dev server.
# 4. Validates the summary: any fail, warn, or semantic warn fails the job.
# 5. Shuts down the dev server.
set -euo pipefail

# ── Start dev server ───────────────────────────────────────────────────────────
# Use a fixed port to avoid collisions with other services.
export LOGICSIM_PORT=4173
export LOGICSIM_BASE_URL="http://127.0.0.1:${LOGICSIM_PORT}"
VITE_LOG="$(mktemp)"

if curl -fsS -o /dev/null "${LOGICSIM_BASE_URL}" 2>/dev/null; then
  echo "ERROR: Port ${LOGICSIM_PORT} is already serving content before wrapper startup"
  exit 1
fi

echo "==> Starting Vite dev server on port ${LOGICSIM_PORT}"
npx vite --port "${LOGICSIM_PORT}" --strictPort >"${VITE_LOG}" 2>&1 &
VITE_PID=$!

# Ensure the server is killed on exit, regardless of success or failure.
cleanup() {
  echo "==> Stopping Vite dev server (pid ${VITE_PID})"
  kill "${VITE_PID}" 2>/dev/null || true
  wait "${VITE_PID}" 2>/dev/null || true
  rm -f "${VITE_LOG}"
}
trap cleanup EXIT

# ── Wait for server readiness ──────────────────────────────────────────────────
echo "==> Waiting for dev server at ${LOGICSIM_BASE_URL}"
MAX_WAIT=60
WAITED=0
until curl -fsS -o /dev/null "${LOGICSIM_BASE_URL}" 2>/dev/null; do
  if ! kill -0 "${VITE_PID}" 2>/dev/null; then
    echo "ERROR: Vite dev server exited before becoming reachable"
    echo "--- Vite log ---"
    cat "${VITE_LOG}" || true
    exit 1
  fi
  sleep 1
  WAITED=$((WAITED + 1))
  if [ "${WAITED}" -ge "${MAX_WAIT}" ]; then
    echo "ERROR: Dev server did not become reachable within ${MAX_WAIT}s"
    echo "--- Vite log ---"
    cat "${VITE_LOG}" || true
    exit 1
  fi
done
echo "==> Dev server ready after ${WAITED}s"

# ── Run UI audit ──────────────────────────────────────────────────────────────
echo "==> Running focused-nine UI audit"
node validation/focused-nine-ui-audit.mjs

# ── Validate summary ─────────────────────────────────────────────────────────
echo "==> Validating focused-nine UI summary"
node <<'EOF'
const fs = require('node:fs');

const summary = JSON.parse(fs.readFileSync('validation/focused-nine-ui-summary.json', 'utf8'));
const results = summary.results ?? [];
const failures = [];

// Check for infrastructure errors (circuit load failures, puppeteer crashes)
const errors = results.filter(r => r.error);
if (errors.length > 0) {
  failures.push(`${errors.length} infrastructure error(s): ${errors.map(e => e.slug).join(', ')}`);
}

// Check for UI check failures
const failChecks = results.filter(r => r.check?.status === 'fail');
if (failChecks.length > 0) {
  failures.push(`${failChecks.length} UI check failure(s): ${failChecks.map(f => f.slug).join(', ')}`);
}

// Check for UI check warnings — current baseline is 0 WARN, so any WARN is a regression
const warnChecks = results.filter(r => r.check?.status === 'warn');
if (warnChecks.length > 0) {
  failures.push(`${warnChecks.length} UI check warning(s): ${warnChecks.map(w => w.slug).join(', ')}`);
}

// Check for semantic timing failures — current baseline is 5 PASS, 0 WARN
const semanticResults = results.filter(r => r.timingSemantic);
const semanticWarns = semanticResults.filter(r => !r.timingSemantic.semanticPass);
if (semanticWarns.length > 0) {
  failures.push(`${semanticWarns.length} semantic timing warning(s): ${semanticWarns.map(w => w.slug).join(', ')}`);
}

// Check for HDL mismatch (UI modal shows different HDL than exported files)
const hdlMismatch = results.filter(r => r.hdl && (!r.hdl.verilogMatches || !r.hdl.vhdlMatches));
if (hdlMismatch.length > 0) {
  failures.push(`${hdlMismatch.length} HDL mismatch(es): ${hdlMismatch.map(h => h.slug).join(', ')}`);
}

if (failures.length > 0) {
  console.error('Focused-nine UI audit FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

const smokePass = results.filter(r => r.check?.status === 'pass').length;
const semPass = semanticResults.filter(r => r.timingSemantic.semanticPass).length;
console.log(`Focused-nine UI audit green: ${smokePass} smoke PASS, ${semPass} semantic PASS, ${results.length} total`);
EOF
