#!/usr/bin/env node
/**
 * diff-audit-runs.mjs
 *
 * Compares N audit-run JSON files and reports field-level determinism.
 *
 * Usage:
 *   node validation/diff-audit-runs.mjs --type core validation/determinism-runs/core-run*.json
 *   node validation/diff-audit-runs.mjs --type ui   validation/determinism-runs/ui-run*.json
 *
 * Output: structured JSON to stdout.
 */

import fs from 'node:fs';

const args = process.argv.slice(2);
const typeIdx = args.indexOf('--type');
const auditType = typeIdx !== -1 ? args[typeIdx + 1] : 'unknown';
const files = args.filter((a, i) => a !== '--type' && i !== typeIdx + 1);

if (files.length < 2) {
  console.error('Need at least 2 JSON files to compare.');
  process.exit(1);
}

const runs = files.map((f) => ({
  file: f,
  data: JSON.parse(fs.readFileSync(f, 'utf8')),
}));

// ── Volatile fields to document but ignore for equality ──────────────────────
const VOLATILE_FIELDS = new Set(['generatedAt', 'generatedAtISO']);

// ── Helpers ──────────────────────────────────────────────────────────────────

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

function normalize(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(normalize);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (VOLATILE_FIELDS.has(k)) continue;
    out[k] = normalize(v);
  }
  return out;
}

// ── Core audit comparison ────────────────────────────────────────────────────

function compareCoreRuns(runList) {
  const perCase = {};
  const topLevel = { caseCount: [], stableTop: true };

  for (let i = 0; i < runList.length; i++) {
    const d = runList[i].data;
    topLevel.caseCount.push(d.cases?.length ?? 0);

    for (const c of d.cases ?? []) {
      if (!perCase[c.slug]) perCase[c.slug] = [];
      perCase[c.slug].push({
        run: i + 1,
        resultStatus: c.result?.status,
        resultExpectation: c.result?.expectation,
        resultDetails: c.result?.details,
        toolingStatus: c.toolingStatus,
        toolsNorm: normalize(c.tools),
      });
    }
  }

  if (new Set(topLevel.caseCount).size > 1) topLevel.stableTop = false;

  const caseResults = {};
  for (const [slug, entries] of Object.entries(perCase)) {
    const statuses = entries.map((e) => e.resultStatus);
    const toolings = entries.map((e) => e.toolingStatus);
    const detailsStable = entries.every((e) => deepEqual(e.resultDetails, entries[0].resultDetails));
    const toolsStable = entries.every((e) => deepEqual(e.toolsNorm, entries[0].toolsNorm));

    caseResults[slug] = {
      statusStable: new Set(statuses).size === 1,
      statuses,
      toolingStable: new Set(toolings).size === 1,
      toolings,
      detailsStable,
      toolsOutputStable: toolsStable,
    };
  }

  return { topLevel, caseResults };
}

// ── UI audit comparison ──────────────────────────────────────────────────────

function compareUiRuns(runList) {
  const perCase = {};
  const topLevel = { resultCount: [], stableTop: true };

  for (let i = 0; i < runList.length; i++) {
    const d = runList[i].data;
    topLevel.resultCount.push(d.results?.length ?? 0);

    for (const r of d.results ?? []) {
      if (!perCase[r.slug]) perCase[r.slug] = [];
      const entry = {
        run: i + 1,
        error: r.error ?? null,
        checkStatus: r.check?.status ?? null,
        checkMessage: r.check?.message ?? null,
        semanticPass: r.timingSemantic?.semanticPass ?? null,
        steps: r.timingSemantic?.stepsRecorded ?? null,
        hasZPath: null,
        hasXPath: null,
        verilogMatches: r.hdl?.verilogMatches ?? null,
        vhdlMatches: r.hdl?.vhdlMatches ?? null,
        tableRowCount: r.table?.rows?.length ?? null,
        tableParagraphCount: r.table?.paragraphs?.length ?? null,
      };
      // Extract Z/X path info from findings
      if (r.timingSemantic?.findings) {
        entry.hasZPath = r.timingSemantic.findings.some((f) => /Z-path.*present/.test(f));
        entry.hasXPath = r.timingSemantic.findings.some((f) => /X-path.*present/.test(f));
      }
      perCase[r.slug].push(entry);
    }
  }

  if (new Set(topLevel.resultCount).size > 1) topLevel.stableTop = false;

  const caseResults = {};
  for (const [slug, entries] of Object.entries(perCase)) {
    const fields = {};
    const fieldNames = [
      'error', 'checkStatus', 'checkMessage', 'semanticPass',
      'steps', 'hasZPath', 'hasXPath',
      'verilogMatches', 'vhdlMatches',
      'tableRowCount', 'tableParagraphCount',
    ];
    for (const f of fieldNames) {
      const vals = entries.map((e) => e[f]);
      const unique = [...new Set(vals.map((v) => JSON.stringify(v)))];
      fields[f] = {
        stable: unique.length === 1,
        values: vals,
      };
    }
    caseResults[slug] = fields;
  }

  return { topLevel, caseResults };
}

// ── Main ─────────────────────────────────────────────────────────────────────

const result = {
  auditType,
  runCount: runs.length,
  files: files,
  volatileFieldsIgnored: [...VOLATILE_FIELDS],
};

if (auditType === 'core') {
  result.comparison = compareCoreRuns(runs);
} else if (auditType === 'ui') {
  result.comparison = compareUiRuns(runs);
} else {
  console.error('Unknown --type. Use "core" or "ui".');
  process.exit(1);
}

// Summary
const allStable = auditType === 'core'
  ? Object.values(result.comparison.caseResults).every(
    (c) => c.statusStable && c.toolingStable && c.detailsStable && c.toolsOutputStable,
  )
  : Object.values(result.comparison.caseResults).every(
    (c) => Object.values(c).every((f) => f.stable),
  );

result.verdict = allStable && result.comparison.topLevel.stableTop
  ? 'deterministic'
  : 'unstable';

console.log(JSON.stringify(result, null, 2));
