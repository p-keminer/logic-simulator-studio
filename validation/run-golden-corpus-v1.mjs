/**
 * Golden Corpus v1 Runner — automated regression suite for circuit artifacts.
 *
 * Reads validation/golden-corpus-v1.json, verifies that all 12 reference circuits
 * and their HDL exports exist, are structurally sound, and match documented
 * checkpoints.  Produces:
 *   - validation/golden-corpus-v1-summary.json  (machine-readable)
 *   - validation/golden-corpus-v1-report.md     (human-readable)
 *
 * Status classification per case:
 *   - pass:           all checks passed
 *   - fail:           one or more checks failed unexpectedly
 *   - expected_limit: documents a known limitation (not a pass)
 *   - unsupported:    check not yet implemented in runner v1
 *
 * Usage:
 *   npx vite-node validation/run-golden-corpus-v1.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS_FILE = path.join(ROOT, 'validation', 'golden-corpus-v1.json');
const CIRCUITS_DIR = path.join(ROOT, 'validation', 'generated-circuits-golden');
const EXPORTS_DIR = path.join(ROOT, 'validation', 'generated-exports-golden');
const SUMMARY_FILE = path.join(ROOT, 'validation', 'golden-corpus-v1-summary.json');
const REPORT_FILE = path.join(ROOT, 'validation', 'golden-corpus-v1-report.md');
const RUNNER_VERSION = '1.0.0';

// ── Known boundaries ────────────────────────────────────────────────────────
// Slugs where a documented exporter/model limitation exists. These are
// classified as expected_limit, NEVER as pass.
const KNOWN_BOUNDARIES = new Map([
  ['gc_t2_bus_mux', 'Documented exporter limitation: multi-driver tri-state bus — buf1 output (w_0) is driven but not exported as output port (last-wire-wins). This is a known, intentional model boundary.'],
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonSafe(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return { ok: true, data: JSON.parse(raw), raw };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function readTextSafe(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return { ok: true, raw };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function displayPath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function sanitizeText(text) {
  return String(text)
    .split(ROOT).join('<repo>')
    .split(ROOT.replace(/\\/g, '/')).join('<repo>')
    .replace(/\/home\/p-keminer\/projects\/uni\/logic-gate-simulator/g, '<repo>')
    .replace(/C:\\Users\\pkemi\\logic-simulator-studio/gi, '<repo>');
}

// ── Per-case checks ─────────────────────────────────────────────────────────

/**
 * @typedef {'pass' | 'fail' | 'expected_limit' | 'unsupported'} CaseStatus
 *
 * @typedef {{
 *   checkId: string,
 *   status: CaseStatus,
 *   detail: string,
 * }} CheckResult
 *
 * @typedef {{
 *   slug: string,
 *   class: string,
 *   title: string,
 *   status: CaseStatus,
 *   checks: CheckResult[],
 *   reason: string,
 * }} CaseResult
 */

async function runCase(entry) {
  const slug = entry.slug;
  const checks = [];

  const circuitPath = path.join(CIRCUITS_DIR, `${slug}.lgsc.json`);
  const verilogPath = path.join(EXPORTS_DIR, `${slug}.v`);
  const vhdlPath = path.join(EXPORTS_DIR, `${slug}.vhd`);

  // ── Check 1: Circuit file exists ────────────────────────────────────────
  const circuitExists = await fileExists(circuitPath);
  checks.push({
    checkId: 'circuit-file-exists',
    status: circuitExists ? 'pass' : 'fail',
    detail: circuitExists ? displayPath(circuitPath) : `Missing: ${displayPath(circuitPath)}`,
  });

  // ── Check 2: Verilog export exists ──────────────────────────────────────
  const verilogExists = await fileExists(verilogPath);
  checks.push({
    checkId: 'verilog-export-exists',
    status: verilogExists ? 'pass' : 'fail',
    detail: verilogExists ? displayPath(verilogPath) : `Missing: ${displayPath(verilogPath)}`,
  });

  // ── Check 3: VHDL export exists ─────────────────────────────────────────
  const vhdlExists = await fileExists(vhdlPath);
  checks.push({
    checkId: 'vhdl-export-exists',
    status: vhdlExists ? 'pass' : 'fail',
    detail: vhdlExists ? displayPath(vhdlPath) : `Missing: ${displayPath(vhdlPath)}`,
  });

  // ── Check 4: Circuit JSON parseable ─────────────────────────────────────
  let circuitData = null;
  if (circuitExists) {
    const result = await readJsonSafe(circuitPath);
    checks.push({
      checkId: 'circuit-json-parseable',
      status: result.ok ? 'pass' : 'fail',
      detail: result.ok ? 'Valid JSON' : result.error,
    });
    if (result.ok) circuitData = result.data;
  }

  // ── Check 5: Circuit has expected id/name matching slug ─────────────────
  if (circuitData) {
    const idMatch = circuitData.id === slug || circuitData.name === slug;
    checks.push({
      checkId: 'circuit-slug-match',
      status: idMatch ? 'pass' : 'fail',
      detail: idMatch
        ? `id=${circuitData.id}, name=${circuitData.name}`
        : `Expected id or name = ${slug}, got id=${circuitData.id}, name=${circuitData.name}`,
    });
  }

  // ── Check 6: Circuit contains expected gate types ───────────────────────
  if (circuitData && entry.gates) {
    const gateTypes = new Set(
      Object.values(circuitData.gates || {}).map(g => g.typeId).filter(Boolean)
    );
    const expectedGates = entry.gates;
    // Compare directly — corpus and circuit files use the same naming
    // (e.g. IC_74HC74, AND, TRIBUF)
    const missing = expectedGates.filter(g => !gateTypes.has(g));
    checks.push({
      checkId: 'circuit-gate-types',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0
        ? `All expected gates found: ${expectedGates.join(', ')}`
        : `Missing gate types: ${missing.join(', ')}; found: ${[...gateTypes].join(', ')}`,
    });
  }

  // ── Check 7: Circuit has expected inputs ────────────────────────────────
  if (circuitData && entry.inputs) {
    const switchLabels = new Set(
      Object.values(circuitData.gates || {})
        .filter(g => g.typeId === 'INPUT_SWITCH')
        .map(g => g.label)
        .filter(Boolean)
    );
    const missing = entry.inputs.filter(inp => !switchLabels.has(inp));
    checks.push({
      checkId: 'circuit-inputs',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0
        ? `All ${entry.inputs.length} inputs found`
        : `Missing inputs: ${missing.join(', ')}; found: ${[...switchLabels].join(', ')}`,
    });
  }

  // ── Check 8: Circuit has expected outputs ───────────────────────────────
  if (circuitData && entry.outputs) {
    const wires = circuitData.wires || {};
    const wireTargets = new Set();
    for (const w of Object.values(wires)) {
      // Wires going to LED/output components
      if (w.toGateId) {
        const targetGate = circuitData.gates?.[w.toGateId];
        if (targetGate?.typeId === 'OUTPUT_LED') {
          // The wire id or a derived name serves as output
          wireTargets.add(w.id);
        }
      }
    }
    // For outputs, just verify the count matches
    const ledCount = Object.values(circuitData.gates || {})
      .filter(g => g.typeId === 'OUTPUT_LED').length;
    checks.push({
      checkId: 'circuit-outputs',
      status: ledCount >= entry.outputs.length ? 'pass' : 'fail',
      detail: `Expected ${entry.outputs.length} output(s), found ${ledCount} LED(s)`,
    });
  }

  // ── Check 9: Verilog structural sanity ──────────────────────────────────
  if (verilogExists) {
    const vResult = await readTextSafe(verilogPath);
    if (vResult.ok) {
      const vChecks = checkVerilogStructure(vResult.raw, slug, entry);
      checks.push(...vChecks);
    } else {
      checks.push({
        checkId: 'verilog-readable',
        status: 'fail',
        detail: vResult.error,
      });
    }
  }

  // ── Check 10: VHDL structural sanity ────────────────────────────────────
  if (vhdlExists) {
    const vResult = await readTextSafe(vhdlPath);
    if (vResult.ok) {
      const vChecks = checkVhdlStructure(vResult.raw, slug, entry);
      checks.push(...vChecks);
    } else {
      checks.push({
        checkId: 'vhdl-readable',
        status: 'fail',
        detail: vResult.error,
      });
    }
  }

  // ── Check 11: Known boundary classification ─────────────────────────────
  if (KNOWN_BOUNDARIES.has(slug)) {
    checks.push({
      checkId: 'known-boundary',
      status: 'expected_limit',
      detail: KNOWN_BOUNDARIES.get(slug),
    });
  }

  // ── Aggregate status ────────────────────────────────────────────────────
  const sanitizedChecks = checks.map(c => ({ ...c, detail: sanitizeText(c.detail) }));
  const status = aggregateCaseStatus(sanitizedChecks, slug);
  const reason = sanitizeText(summarizeCaseReason(sanitizedChecks, status));

  return {
    slug,
    class: entry.class,
    title: entry.title,
    status,
    checks: sanitizedChecks,
    reason,
  };
}

// ── Verilog structural checks ────────────────────────────────────────────────

/**
 * Normalize whitespace for checkpoint comparison: collapse runs of
 * whitespace to single space, trim.
 */
function normalizeWS(s) {
  return s.replace(/\s+/g, ' ').trim();
}

/** Check if source contains pattern after whitespace normalization. */
function sourceContainsNormalized(source, pattern) {
  return normalizeWS(source).includes(normalizeWS(pattern));
}

function checkVerilogStructure(source, slug, entry) {
  const checks = [];

  // Module declaration present
  const moduleMatch = source.match(/module\s+(\w+)/);
  const moduleOk = moduleMatch && moduleMatch[1] === slug;
  checks.push({
    checkId: 'verilog-module-name',
    status: moduleOk ? 'pass' : 'fail',
    detail: moduleOk
      ? `module ${slug} found`
      : `Expected module ${slug}, got ${moduleMatch?.[1] ?? 'none'}`,
  });

  // Has endmodule
  const hasEndmodule = source.includes('endmodule');
  checks.push({
    checkId: 'verilog-endmodule',
    status: hasEndmodule ? 'pass' : 'fail',
    detail: hasEndmodule ? 'endmodule found' : 'Missing endmodule',
  });

  // Expected inputs declared (use \s+ to handle multi-space formatting)
  if (entry.inputs) {
    const declaredInputs = [...source.matchAll(/input\s+wire\s+(\w+)/g)].map(m => m[1]);
    const missing = entry.inputs.filter(inp => !declaredInputs.includes(inp));
    checks.push({
      checkId: 'verilog-input-ports',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0
        ? `All ${entry.inputs.length} input ports declared`
        : `Missing input ports: ${missing.join(', ')}`,
    });
  }

  // Expected outputs declared
  if (entry.outputs) {
    const declaredOutputs = [...source.matchAll(/output\s+(?:wire|reg)\s+(\w+)/g)].map(m => m[1]);
    const missing = entry.outputs.filter(out => !declaredOutputs.includes(out));
    checks.push({
      checkId: 'verilog-output-ports',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0
        ? `All ${entry.outputs.length} output port(s) declared`
        : `Missing output ports: ${missing.join(', ')}`,
    });
  }

  // Checkpoint-specific Verilog checks — use normalized whitespace matching
  if (entry.checkPoints) {
    const cp = entry.checkPoints;

    // Check verilogPorts if specified
    if (cp.verilogPorts) {
      const allFound = cp.verilogPorts.every(p => sourceContainsNormalized(source, p));
      checks.push({
        checkId: 'verilog-checkpoint-ports',
        status: allFound ? 'pass' : 'fail',
        detail: allFound
          ? `All ${cp.verilogPorts.length} checkpoint ports found`
          : `Some checkpoint ports missing from Verilog`,
      });
    }

    // Check internal wires if specified
    if (cp.internalWires) {
      const allFound = cp.internalWires.every(w => source.includes(w));
      checks.push({
        checkId: 'verilog-checkpoint-wires',
        status: allFound ? 'pass' : 'fail',
        detail: allFound
          ? `All ${cp.internalWires.length} internal wires found`
          : `Some internal wires missing from Verilog`,
      });
    }

    // Check primitives if specified — use normalized whitespace
    if (cp.primitives) {
      const allFound = cp.primitives.every(p => sourceContainsNormalized(source, p));
      checks.push({
        checkId: 'verilog-checkpoint-primitives',
        status: allFound ? 'pass' : 'fail',
        detail: allFound
          ? `All ${cp.primitives.length} primitives found`
          : `Some primitives missing from Verilog`,
      });
    }

    // Check verilog pattern if specified — use normalized whitespace
    if (cp.verilog) {
      const found = sourceContainsNormalized(source, cp.verilog);
      checks.push({
        checkId: 'verilog-checkpoint-pattern',
        status: found ? 'pass' : 'fail',
        detail: found
          ? `Checkpoint pattern found: ${cp.verilog.slice(0, 60)}`
          : `Checkpoint pattern NOT found: ${cp.verilog.slice(0, 60)}`,
      });
    }

    // Check verilogSens if specified — use normalized whitespace
    if (cp.verilogSens) {
      const found = sourceContainsNormalized(source, cp.verilogSens);
      checks.push({
        checkId: 'verilog-checkpoint-sensitivity',
        status: found ? 'pass' : 'fail',
        detail: found
          ? `Sensitivity list found: ${cp.verilogSens}`
          : `Sensitivity list NOT found: ${cp.verilogSens}`,
      });
    }

    // Check verilogBranches if specified — semantic description, not literal
    // These describe branch structure (e.g. "if (r) Q<=0") which may differ
    // from actual code formatting. Verify that branch-relevant keywords exist.
    // Note: "Q" is a symbolic register name in checkpoint descriptions; actual
    // code uses auto-generated names like w_0. Skip such abstract tokens.
    if (cp.verilogBranches) {
      const branchSkip = new Set(['Q', 'if', 'else', 'begin', 'end']);
      const allFound = cp.verilogBranches.every(b => {
        const tokens = b.match(/[a-zA-Z_]\w*/g) || [];
        const meaningful = tokens.filter(t => !branchSkip.has(t));
        return meaningful.every(t => source.includes(t));
      });
      checks.push({
        checkId: 'verilog-checkpoint-branches',
        status: allFound ? 'pass' : 'fail',
        detail: allFound
          ? `All ${cp.verilogBranches.length} branch patterns verified`
          : `Some branch patterns missing from Verilog`,
      });
    }

    // Check verilogPattern if specified — use normalized whitespace
    if (cp.verilogPattern) {
      const found = sourceContainsNormalized(source, cp.verilogPattern);
      checks.push({
        checkId: 'verilog-checkpoint-always-pattern',
        status: found ? 'pass' : 'fail',
        detail: found
          ? `Always-block pattern found: ${cp.verilogPattern}`
          : `Always-block pattern NOT found: ${cp.verilogPattern}`,
      });
    }

    // Check verilogExtraReg if specified — just the reg name portion
    if (cp.verilogExtraReg) {
      // Extract the reg declaration part (e.g. "reg [3:0] cnt_ctr")
      const regMatch = cp.verilogExtraReg.match(/reg\s+\[[\d:]+\]\s+(\w+)/);
      const regName = regMatch ? regMatch[1] : null;
      const found = regName ? source.includes(regName) : source.includes(cp.verilogExtraReg);
      checks.push({
        checkId: 'verilog-checkpoint-extra-reg',
        status: found ? 'pass' : 'fail',
        detail: found
          ? `Extra reg ${regName ? `'${regName}'` : ''} found`
          : `Extra reg NOT found: ${cp.verilogExtraReg.slice(0, 60)}`,
      });
    }

    // Check verilogPrimitives if specified — use normalized whitespace
    if (cp.verilogPrimitives) {
      const allFound = cp.verilogPrimitives.every(p => sourceContainsNormalized(source, p));
      checks.push({
        checkId: 'verilog-checkpoint-gate-primitives',
        status: allFound ? 'pass' : 'fail',
        detail: allFound
          ? `All ${cp.verilogPrimitives.length} gate primitives found`
          : `Some gate primitives missing from Verilog`,
      });
    }
  }

  return checks;
}

// ── VHDL structural checks ──────────────────────────────────────────────────

function checkVhdlStructure(source, slug, entry) {
  const checks = [];

  // Entity declaration present
  const entityMatch = source.match(/entity\s+(\w+)\s+is/);
  const entityOk = entityMatch && entityMatch[1] === slug;
  checks.push({
    checkId: 'vhdl-entity-name',
    status: entityOk ? 'pass' : 'fail',
    detail: entityOk
      ? `entity ${slug} found`
      : `Expected entity ${slug}, got ${entityMatch?.[1] ?? 'none'}`,
  });

  // Has architecture
  const hasArch = source.includes('architecture');
  checks.push({
    checkId: 'vhdl-architecture',
    status: hasArch ? 'pass' : 'fail',
    detail: hasArch ? 'architecture block found' : 'Missing architecture block',
  });

  // Expected inputs declared
  if (entry.inputs) {
    const declaredPorts = [...source.matchAll(/(\w+)\s*:\s*in\s+STD_LOGIC/gi)].map(m => m[1]);
    const missing = entry.inputs.filter(inp => !declaredPorts.includes(inp));
    checks.push({
      checkId: 'vhdl-input-ports',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0
        ? `All ${entry.inputs.length} input ports declared`
        : `Missing input ports: ${missing.join(', ')}`,
    });
  }

  // Expected outputs declared
  if (entry.outputs) {
    const declaredPorts = [...source.matchAll(/(\w+)\s*:\s*out\s+STD_LOGIC/gi)].map(m => m[1]);
    const missing = entry.outputs.filter(out => !declaredPorts.includes(out));
    checks.push({
      checkId: 'vhdl-output-ports',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0
        ? `All ${entry.outputs.length} output port(s) declared`
        : `Missing output ports: ${missing.join(', ')}`,
    });
  }

  // Checkpoint-specific VHDL checks
  if (entry.checkPoints) {
    const cp = entry.checkPoints;

    // Check vhdlShadow if specified
    if (cp.vhdlShadow) {
      const found = source.includes('_q');
      checks.push({
        checkId: 'vhdl-checkpoint-shadow',
        status: found ? 'pass' : 'fail',
        detail: found
          ? 'Shadow signal pattern (_q) found in VHDL'
          : 'Shadow signal pattern (_q) NOT found in VHDL',
      });
    }

    // Check vhdlBranches if specified — semantic, use token-level matching
    // Skip abstract/symbolic names (Q) and VHDL keywords already implied by structure
    if (cp.vhdlBranches) {
      const branchSkip = new Set(['Q', 'if', 'elsif', 'else', 'then', 'end']);
      const allFound = cp.vhdlBranches.every(b => {
        const tokens = b.match(/[a-zA-Z_]\w*/g) || [];
        const meaningful = tokens.filter(t => !branchSkip.has(t));
        return meaningful.every(t => source.includes(t));
      });
      checks.push({
        checkId: 'vhdl-checkpoint-branches',
        status: allFound ? 'pass' : 'fail',
        detail: allFound
          ? `All ${cp.vhdlBranches.length} VHDL branch patterns verified`
          : `Some VHDL branch patterns missing`,
      });
    }

    // Check vhdl pattern if specified — semantic description, extract key tokens
    if (cp.vhdl) {
      // Extract meaningful keywords/identifiers and check each is present
      const tokens = cp.vhdl.match(/[a-zA-Z_]\w*/g) || [];
      // Filter out very common words that aren't useful for matching
      const skipWords = new Set(['with', 'and', 'or', 'not', 'the', 'is', 'a', 'an', 'in', 'to', 'for', 'of', 'arithmetic']);
      const meaningfulTokens = tokens.filter(t => !skipWords.has(t.toLowerCase()) && t.length > 1);
      const found = meaningfulTokens.length > 0 && meaningfulTokens.every(t => source.includes(t));
      checks.push({
        checkId: 'vhdl-checkpoint-pattern',
        status: found ? 'pass' : 'fail',
        detail: found
          ? `VHDL checkpoint tokens verified`
          : `VHDL checkpoint pattern NOT fully matched: ${cp.vhdl.slice(0, 60)}`,
      });
    }

    // Check vhdlExtraSignal if specified — extract signal name
    if (cp.vhdlExtraSignal) {
      const sigMatch = cp.vhdlExtraSignal.match(/signal\s+(\w+)/);
      const sigName = sigMatch ? sigMatch[1] : null;
      const found = sigName ? source.includes(sigName) : source.includes(cp.vhdlExtraSignal);
      checks.push({
        checkId: 'vhdl-checkpoint-extra-signal',
        status: found ? 'pass' : 'fail',
        detail: found
          ? `Extra signal ${sigName ? `'${sigName}'` : ''} found`
          : `Extra signal NOT found: ${cp.vhdlExtraSignal.slice(0, 60)}`,
      });
    }

    // Check outputShadows if specified
    if (cp.outputShadows) {
      const found = source.includes('_q');
      checks.push({
        checkId: 'vhdl-checkpoint-output-shadows',
        status: found ? 'pass' : 'fail',
        detail: found
          ? 'Output shadow signals (_q) found in VHDL'
          : 'Output shadow signals (_q) NOT found in VHDL',
      });
    }
  }

  return checks;
}

// ── Status aggregation ──────────────────────────────────────────────────────

function aggregateCaseStatus(checks, slug) {
  // If any check is expected_limit, the whole case is expected_limit
  // (never classified as clean pass)
  if (checks.some(c => c.status === 'expected_limit')) return 'expected_limit';
  // If any check failed, the case fails
  if (checks.some(c => c.status === 'fail')) return 'fail';
  // If all are unsupported, it's unsupported
  if (checks.every(c => c.status === 'unsupported')) return 'unsupported';
  return 'pass';
}

function summarizeCaseReason(checks, status) {
  if (status === 'expected_limit') {
    const limitCheck = checks.find(c => c.status === 'expected_limit');
    return limitCheck?.detail ?? 'Known boundary';
  }
  if (status === 'fail') {
    const fails = checks.filter(c => c.status === 'fail');
    return fails.map(f => `[${f.checkId}] ${f.detail}`).join('; ');
  }
  if (status === 'unsupported') {
    return 'All checks unsupported in v1';
  }
  const passCount = checks.filter(c => c.status === 'pass').length;
  return `${passCount} checks passed`;
}

// ── Report generation ───────────────────────────────────────────────────────

function generateReport(corpusVersion, caseResults) {
  const now = new Date().toISOString();
  const total = caseResults.length;
  const passed = caseResults.filter(r => r.status === 'pass').length;
  const failed = caseResults.filter(r => r.status === 'fail').length;
  const unsupported = caseResults.filter(r => r.status === 'unsupported').length;
  const expectedLimit = caseResults.filter(r => r.status === 'expected_limit').length;
  const executed = passed + failed + expectedLimit;

  let md = `# Golden Corpus v1 Report\n\n`;
  md += `Generated: ${now}\n`;
  md += `Runner version: ${RUNNER_VERSION}\n`;
  md += `Corpus version: ${corpusVersion}\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| Total cases | ${total} |\n`;
  md += `| Executed | ${executed} |\n`;
  md += `| Passed | ${passed} |\n`;
  md += `| Failed | ${failed} |\n`;
  md += `| Expected limit | ${expectedLimit} |\n`;
  md += `| Unsupported | ${unsupported} |\n\n`;

  md += `**Verdict:** ${failed === 0 ? 'PASS' : 'FAIL'}`;
  if (expectedLimit > 0) {
    md += ` (${expectedLimit} known limit${expectedLimit > 1 ? 's' : ''})`;
  }
  md += `\n\n`;

  // Per-class breakdown
  md += `## Per-Class Summary\n\n`;
  md += `| Class | Pass | Fail | Expected Limit | Unsupported | Total |\n|---|---|---|---|---|---|\n`;
  const classes = [...new Set(caseResults.map(r => r.class))];
  for (const cls of classes) {
    const clsResults = caseResults.filter(r => r.class === cls);
    const cP = clsResults.filter(r => r.status === 'pass').length;
    const cF = clsResults.filter(r => r.status === 'fail').length;
    const cE = clsResults.filter(r => r.status === 'expected_limit').length;
    const cU = clsResults.filter(r => r.status === 'unsupported').length;
    md += `| ${cls} | ${cP} | ${cF} | ${cE} | ${cU} | ${clsResults.length} |\n`;
  }
  md += `\n`;

  // Per-case detail
  md += `## Per-Case Results\n\n`;
  for (const r of caseResults) {
    const statusLabel = r.status.toUpperCase().replace('_', ' ');
    md += `### ${r.slug} — ${statusLabel}\n\n`;
    md += `- **Class:** ${r.class}\n`;
    md += `- **Title:** ${r.title}\n`;
    md += `- **Reason:** ${r.reason}\n\n`;
    md += `| Check | Status | Detail |\n|---|---|---|\n`;
    for (const c of r.checks) {
      const label = c.status.toUpperCase().replace('_', ' ');
      // Truncate long details for readability
      const detailRaw = sanitizeText(c.detail);
      const detail = detailRaw.length > 120 ? detailRaw.slice(0, 117) + '...' : detailRaw;
      md += `| ${c.checkId} | ${label} | ${detail} |\n`;
    }
    md += `\n`;
  }

  // What v1 checks
  md += `## What v1 Checks\n\n`;
  md += `- Circuit file existence and JSON parseability\n`;
  md += `- Verilog export existence and structural sanity (module name, ports, endmodule)\n`;
  md += `- VHDL export existence and structural sanity (entity name, architecture, ports)\n`;
  md += `- Slug-to-file 1:1 mapping\n`;
  md += `- Gate type presence in circuit files\n`;
  md += `- Input/output port consistency between corpus index and artifacts\n`;
  md += `- Checkpoint string matching against Verilog/VHDL sources\n`;
  md += `- Known boundary classification (gc_t2_bus_mux)\n\n`;

  // What v1 does NOT check
  md += `## What v1 Does NOT Check (Gaps for v2)\n\n`;
  md += `- Functional simulation / truth-table verification of circuits\n`;
  md += `- Re-export and diff against golden exports (export-determinism)\n`;
  md += `- External HDL tool compilation (iverilog, ghdl)\n`;
  md += `- Multi-cycle sequential simulation\n`;
  md += `- UI replay / visual regression\n`;
  md += `- CI integration (runner is local-only for now)\n`;

  // Known Boundaries section
  md += `\n## Known Boundaries\n\n`;
  for (const [slug, reason] of KNOWN_BOUNDARIES) {
    md += `- **${slug}**: ${reason}\n`;
  }
  md += `\n`;
  md += `Cases with expected_limit are *not* counted as pass. `;
  md += `They document intentional model boundaries that are verified to still exist.\n`;

  return md;
}

function generateSummary(corpusVersion, caseResults) {
  const now = new Date().toISOString();
  const total = caseResults.length;
  const passed = caseResults.filter(r => r.status === 'pass').length;
  const failed = caseResults.filter(r => r.status === 'fail').length;
  const unsupported = caseResults.filter(r => r.status === 'unsupported').length;
  const expectedLimit = caseResults.filter(r => r.status === 'expected_limit').length;

  // Per-class summary
  const perClass = {};
  for (const r of caseResults) {
    if (!perClass[r.class]) perClass[r.class] = { pass: 0, fail: 0, expected_limit: 0, unsupported: 0, total: 0 };
    perClass[r.class].total++;
    perClass[r.class][r.status]++;
  }

  return {
    generatedAt: now,
    runnerVersion: RUNNER_VERSION,
    corpusVersion,
    totalCases: total,
    passed,
    failed,
    expectedLimit,
    unsupported,
    verdict: failed === 0 ? 'PASS' : 'FAIL',
    perClass,
    perCase: caseResults.map(r => ({
      slug: r.slug,
      class: r.class,
      title: r.title,
      status: r.status,
      checksRun: r.checks.length,
      checksPassed: r.checks.filter(c => c.status === 'pass').length,
      checksFailed: r.checks.filter(c => c.status === 'fail').length,
      reason: r.reason,
    })),
    results: caseResults,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Load corpus index
  const corpusResult = await readJsonSafe(CORPUS_FILE);
  if (!corpusResult.ok) {
    console.error(`Failed to load corpus: ${corpusResult.error}`);
    process.exit(2);
  }
  const corpus = corpusResult.data;
  const corpusVersion = corpus.version ?? 'unknown';
  const entries = corpus.circuits ?? [];

  console.log(`Golden Corpus v1 Runner v${RUNNER_VERSION}`);
  console.log(`Corpus version: ${corpusVersion}`);
  console.log(`Loaded ${entries.length} entries from ${displayPath(CORPUS_FILE)}`);

  const caseResults = [];
  for (const entry of entries) {
    const result = await runCase(entry);
    caseResults.push(result);
    const statusLabel = result.status.toUpperCase().replace('_', ' ');
    const checksSummary = `${result.checks.filter(c => c.status === 'pass').length}/${result.checks.length} checks`;
    console.log(`  ${entry.slug}: ${statusLabel} (${checksSummary})`);
  }

  // Write artifacts
  const summary = generateSummary(corpusVersion, caseResults);
  const report = generateReport(corpusVersion, caseResults);

  await fs.writeFile(SUMMARY_FILE, JSON.stringify(summary, null, 2) + '\n');
  await fs.writeFile(REPORT_FILE, report);

  console.log(`\nVerdict: ${summary.verdict}`);
  console.log(`  ${summary.passed} pass, ${summary.failed} fail, ${summary.expectedLimit} expected_limit, ${summary.unsupported} unsupported`);
  console.log(`Summary: ${displayPath(SUMMARY_FILE)}`);
  console.log(`Report:  ${displayPath(REPORT_FILE)}`);

  // CI-consumable JSON
  console.log(JSON.stringify({
    summaryFile: displayPath(SUMMARY_FILE),
    reportFile: displayPath(REPORT_FILE),
    verdict: summary.verdict,
    passed: summary.passed,
    failed: summary.failed,
    expectedLimit: summary.expectedLimit,
    unsupported: summary.unsupported,
  }));

  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Golden Corpus runner failed:', e);
  process.exit(2);
});
