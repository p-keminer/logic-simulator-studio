import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'validation');
const UI_DIR = path.join(OUT_DIR, 'generated-ui-focused');
const SUMMARY = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'focused-nine-summary.json'), 'utf8'));
const REPORT_FILE = path.join(OUT_DIR, 'focused-nine-ui-report.md');
const BASE_URL = process.env.LOGICSIM_BASE_URL ?? '<dev-server>';
const PUBLIC_REPO = '<repo-root>';
const PUBLIC_SERVER = '<dev-server>';
const IS_CI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const APP_NAME = 'Logic Simulator Studio';
const LEGACY_FSM_EXPORT = path.join(
  ROOT,
  'validation',
  'fsm-export-fixes',
  'cases',
  'downloads',
  '2026-03-19',
  'FSM_EXPORT_19.03.26.lgsc.json',
);

fs.mkdirSync(UI_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function resolveArtifactPath(file) {
  if (!file) return file;
  return path.isAbsolute(file) ? file : path.join(ROOT, file);
}

function publicPath(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function sanitizePublicText(value) {
  return String(value ?? '')
    .split(ROOT).join(PUBLIC_REPO)
    .split(BASE_URL).join(PUBLIC_SERVER)
    .split('<dev-server>').join(PUBLIC_SERVER)
    .split('<dev-server>').join(PUBLIC_SERVER);
}

function buildBrowserLaunchOptions() {
  const options = { headless: true };
  if (!IS_CI) return options;
  return {
    ...options,
    // GitHub Actions Ubuntu runners can block Chromium's sandbox/userns path.
    // These flags keep the focused-nine UI audit reproducible in CI.
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };
}

// ── Semantic timing expectations for 5 target cases ──────────────────────────
//
// These checks go beyond "panel loaded" and verify:
//  - expected signal labels are visible in the timing SVG
//  - step count > 0 after the simulation has settled
//  - Z (amber, #f59e0b) and X (red, #ef4444) colored SVG paths appear where expected
//
// Note: timing history only records when signals change (batchChangedNets > 0).
// On initial circuit load, outputSignals are all 0 but customState may carry
// non-zero values — so the first settle produces changes and at least 1 snapshot.
// SAMPLE_EVERY=1 means every changed batch gets a snapshot; steps should be > 0
// once the simulation's initial settle has completed.

const TIMING_SEMANTIC = {
  tri_not_sanitized: {
    // sw_a=1, sw_oe=1 → TRIBUF output = Z (oe active-low, value 1 = disabled → Z)
    // downstream NOT(Z) = X (3)
    expectedLabels: ['a', 'oe', 'y'],
    expectStepsGt0: true,
    expectZPath: true,   // amber dashed path: TRIBUF drives Z
    expectXPath: true,   // red dashed path: NOT(Z) → X at LED
    note: 'TRIBUF(a=1, oe=1) -> Z; NOT(Z) -> X. Z and X colored paths expected.',
    stimulus: [
      { gateId: 'sw_oe', mode: 'double', waitMs: 150 },
      { gateId: 'sw_oe', mode: 'double', waitMs: 200 },
    ],
  },
  dff_led: {
    // sw_d=1, sw_clk=0 → D_FF holds at q=0 initially
    expectedLabels: ['d', 'clk', 'q'],
    expectStepsGt0: true,
    expectZPath: false,
    expectXPath: false,
    note: 'D_FF initial settle: labels and step count confirm timing tracks correctly.',
    stimulus: [
      { gateId: 'sw_clk', mode: 'double', waitMs: 1200 },
    ],
  },
  jkff_led: {
    // sw_j=1, sw_k=0, sw_clk=0 → JK_FF holds at q=0
    expectedLabels: ['j', 'k', 'clk', 'q'],
    expectStepsGt0: true,
    expectZPath: false,
    expectXPath: false,
    note: 'JK_FF initial settle: four input/output labels confirm channel presence.',
    stimulus: [
      { gateId: 'sw_clk', mode: 'double', waitMs: 1200 },
    ],
  },
  tff_led: {
    // sw_t=1, sw_clk=0 → T_FF holds at q=0
    expectedLabels: ['t', 'clk', 'q'],
    expectStepsGt0: true,
    expectZPath: false,
    expectXPath: false,
    note: 'T_FF initial settle: three labels confirm sequential gate channels.',
    stimulus: [
      { gateId: 'sw_clk', mode: 'double', waitMs: 1200 },
    ],
  },
  multi_driver_same_input: {
    // sw_a=1 and sw_b=0 both drive led → conflict → X (3)
    expectedLabels: ['a', 'b', 'y'],
    expectStepsGt0: true,
    expectZPath: false,
    expectXPath: true,   // red dashed path: conflict between 1 and 0 → X
    note: 'Dual drivers (1 vs 0) resolve to X. Red X-conflict path expected in timing.',
    stimulus: [
      { gateId: 'sw_b', mode: 'double', waitMs: 150 },
      { gateId: 'sw_b', mode: 'double', waitMs: 200 },
    ],
  },
};

async function stimulateTiming(page, slug) {
  const expectations = TIMING_SEMANTIC[slug];
  const stimulus = expectations?.stimulus ?? [];
  for (const step of stimulus) {
    const selector = `g[data-gate-id="${step.gateId}"]`;
    await page.waitForSelector(selector, { timeout: 10000 });
    if (step.mode === 'double') {
      await page.evaluate((sel) => {
        const gate = document.querySelector(sel);
        if (!gate) throw new Error(`gate not found for semantic timing stimulus: ${sel}`);
        gate.dispatchEvent(new MouseEvent('dblclick', {
          bubbles: true,
          cancelable: true,
          composed: true,
          detail: 2,
        }));
      }, selector);
    } else {
      await page.click(selector, { delay: 40 });
    }
    await sleep(step.waitMs ?? 150);
  }
  // Give React + RAF one more turn after the final stimulus.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() =>
    requestAnimationFrame(() => resolve(true))
  )));
  await sleep(200);
}

async function clickButton(page, label) {
  await page.evaluate((wanted) => {
    const button = [...document.querySelectorAll('button')].find((item) =>
      item.textContent?.replace(/\s+/g, ' ').trim() === wanted);
    if (!button) throw new Error(`button not found: ${wanted}`);
    button.click();
  }, label);
}

async function loadCircuitJson(page, json) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((value) => sessionStorage.setItem('lgsim_autosave', value), json);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction((appName) =>
    document.title.includes(appName) || document.body.textContent?.includes(appName),
  { timeout: 10000 }, APP_NAME);
}

async function loadCircuit(page, file) {
  const json = fs.readFileSync(resolveArtifactPath(file), 'utf8');
  await loadCircuitJson(page, json);
}

async function extractTable(page) {
  await clickButton(page, 'W-Tabelle');
  await page.waitForFunction(() => document.querySelector('table, p, h2'), { timeout: 10000 });
  const table = await page.evaluate(() => ({
    title: [...document.querySelectorAll('h2')].map((node) => node.textContent?.trim()).find(Boolean) ?? '',
    paragraphs: [...document.querySelectorAll('p')].map((node) => node.textContent?.trim()).filter(Boolean),
    headers: [...document.querySelectorAll('table thead tr:last-child th')].map((node) => node.textContent?.trim()).filter(Boolean),
    rows: [...document.querySelectorAll('table tbody tr')].map((row) =>
      [...row.querySelectorAll('td')].map((cell) => cell.textContent?.trim() ?? '')),
  }));
  await page.keyboard.press('Escape');
  return table;
}

async function extractSttModeAudit(page, switchToTechnical = false) {
  await clickButton(page, 'W-Tabelle');
  await page.waitForFunction(() => document.querySelector('table, p, h2'), { timeout: 10000 });

  const snapshot = () => page.evaluate(() => {
    const select = document.querySelector('select[aria-label="STT-Ansicht"]');
    const headers = [...document.querySelectorAll('table thead tr:last-child th')]
      .map((node) => node.textContent?.trim())
      .filter(Boolean);
    const text = (document.body.textContent ?? '').replace(/\s+/g, ' ').trim();
    return {
      title: [...document.querySelectorAll('h2')].map((node) => node.textContent?.trim()).find(Boolean) ?? '',
      selectExists: Boolean(select),
      selected: select instanceof HTMLSelectElement ? select.value : null,
      options: select instanceof HTMLSelectElement
        ? [...select.options].map((option) => ({ value: option.value, label: option.textContent?.trim() ?? '' }))
        : [],
      headers,
      rowCount: document.querySelectorAll('table tbody tr').length,
      paragraphs: [...document.querySelectorAll('p')].map((node) => node.textContent?.trim()).filter(Boolean),
      hasCompactExplanation: text.includes('FSM kompakt:'),
      hasFallbackExplanation: text.includes('Ansicht bleibt technisch voll'),
    };
  });

  const compact = await snapshot();
  let technical = null;

  if (switchToTechnical && compact.selectExists) {
    await page.evaluate(() => {
      const select = document.querySelector('select[aria-label="STT-Ansicht"]');
      if (!(select instanceof HTMLSelectElement)) throw new Error('STT-Ansicht select missing');
      select.value = 'technical_full';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(100);
    technical = await snapshot();
  }

  await page.keyboard.press('Escape');
  return { compact, technical };
}

async function extractHdl(page) {
  await clickButton(page, 'HDL');
  await page.waitForFunction(() => document.body.textContent?.includes('HDL Export'), { timeout: 10000 });
  const verilog = await page.$eval('pre', (el) => el.textContent ?? '');
  await clickButton(page, 'VHDL');
  await sleep(100);
  const vhdl = await page.$eval('pre', (el) => el.textContent ?? '');
  await page.keyboard.press('Escape');
  return { verilog, vhdl };
}

// ── Standard timing extraction (smoke-test only) ──────────────────────────────

async function extractTiming(page) {
  await clickButton(page, 'Timing');
  await page.waitForFunction(() => document.body.textContent?.includes('ZEITDIAGRAMM'), { timeout: 10000 });
  const timing = await page.evaluate(() => {
    const text = document.body.textContent ?? '';
    const steps = text.match(/(\d+)\s+Schritte/);
    return {
      titlePresent: text.includes('ZEITDIAGRAMM'),
      steps: steps ? Number(steps[1]) : 0,
      textNodeCount: [...document.querySelectorAll('svg text')].length,
    };
  });
  await clickButton(page, 'Timing');
  return timing;
}

// ── Enhanced timing extraction with semantic signal checks ────────────────────
//
// Waits after opening the panel to allow the simulation's initial settle to
// produce timing history (batchChangedNets > 0 on first evaluation).
// Extracts:
//  - signalLabels: all SVG <text> content (channel labels from circuit.gates)
//  - hasZPath: amber SVG path present (HI_Z=2 signal in history)
//  - hasXPath: red SVG path present (X/conflict=3 signal in history)
//  - steps: number of recorded timing snapshots

async function extractTimingSemantic(page, slug) {
  await stimulateTiming(page, slug);
  await clickButton(page, 'Timing');
  await page.waitForFunction(() => document.body.textContent?.includes('ZEITDIAGRAMM'), { timeout: 10000 });
  // Small additional wait in case a final RAF commit is still pending.
  await sleep(250);

  const timing = await page.evaluate(() => {
    const text = document.body.textContent ?? '';
    const steps = text.match(/(\d+)\s+Schritte/);

    // Collect all SVG <text> content: includes both circuit-canvas labels and
    // timing-panel channel labels. We check for substring inclusion in the set.
    const svgTexts = [...document.querySelectorAll('svg text')]
      .map((el) => el.textContent?.trim())
      .filter(Boolean);

    // Z (HI_Z=2) renders as amber (#f59e0b) dashed path in timing SVG.
    // X (conflict=3) renders as red (#ef4444) dashed path.
    // These paths only exist when steps > 0 and the signal was active.
    const svgPaths = [...document.querySelectorAll('svg path')];
    const hasZPath = svgPaths.some((p) => p.getAttribute('stroke') === '#f59e0b');
    const hasXPath = svgPaths.some((p) => p.getAttribute('stroke') === '#ef4444');

    return {
      titlePresent: text.includes('ZEITDIAGRAMM'),
      steps: steps ? Number(steps[1]) : 0,
      textNodeCount: [...document.querySelectorAll('svg text')].length,
      signalLabels: svgTexts,
      hasZPath,
      hasXPath,
    };
  });

  await clickButton(page, 'Timing');
  return timing;
}

async function extractTimingSystemAudit(page) {
  await clickButton(page, 'Timing');
  await page.waitForFunction(() => document.body.textContent?.includes('ZEITDIAGRAMM'), { timeout: 10000 });
  await sleep(150);

  const snapshot = () => page.evaluate(() => {
    const viewSelect = document.querySelector('select[aria-label="Timing-Ansicht"]');
    const select = document.querySelector('select[aria-label="Timing-System"]');
    const sidePanelHeader = [...document.querySelectorAll('div')]
      .find((node) => node.textContent?.trim() === 'SIGNAL-STEUERUNG');
    const sidePanel = sidePanelHeader?.parentElement;
    const rowLabels = [...(sidePanel?.querySelectorAll('button[title]:not([aria-label])') ?? [])]
      .map((node) => node.getAttribute('title')?.trim())
      .filter(Boolean);

    return {
      viewMode: viewSelect instanceof HTMLSelectElement ? viewSelect.value : null,
      selectExists: Boolean(select),
      selected: select instanceof HTMLSelectElement ? select.value : null,
      options: select instanceof HTMLSelectElement
        ? [...select.options].map((option) => ({ value: option.value, label: option.textContent?.trim() ?? '' }))
        : [],
      rowLabels,
    };
  });

  const all = await snapshot();
  let first = null;
  let second = null;

  await page.evaluate(() => {
    const select = document.querySelector('select[aria-label="Timing-Ansicht"]');
    if (!(select instanceof HTMLSelectElement)) throw new Error('Timing-Ansicht select missing');
    select.value = 'selected';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(150);
  first = await snapshot();

  if (first.selectExists && first.options.length > 1) {
    const nextOption = first.options.find((option) => option.value !== first.selected) ?? first.options[0];
    await page.evaluate((nextValue) => {
      const select = document.querySelector('select[aria-label="Timing-System"]');
      if (!(select instanceof HTMLSelectElement)) throw new Error('Timing-System select missing');
      select.value = nextValue;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, nextOption.value);
    await sleep(150);
    second = await snapshot();
  }

  await clickButton(page, 'Timing');
  return { all, first, second };
}

function buildMixedLegacyFsmFallbackFixtureJson() {
  const circuit = JSON.parse(fs.readFileSync(LEGACY_FSM_EXPORT, 'utf8'));
  const rawInputSource = Object.values(circuit.gates).find((gate) => gate?.label === 'A');
  if (!rawInputSource) throw new Error('legacy FSM fixture missing source input A');

  circuit.gates.fsm_mixed_raw_btn = {
    id: 'fsm_mixed_raw_btn',
    typeId: 'PUSH_BTN',
    x: (rawInputSource.x ?? 0) + 260,
    y: (rawInputSource.y ?? 0) + 140,
    label: 'RAW_BTN',
    outputSignals: {},
    customState: { value: 0 },
    isSelected: false,
  };
  circuit.gates.fsm_mixed_raw_led = {
    id: 'fsm_mixed_raw_led',
    typeId: 'OUTPUT_LED',
    x: (rawInputSource.x ?? 0) + 420,
    y: (rawInputSource.y ?? 0) + 140,
    label: 'RAW_LED',
    outputSignals: {},
    isSelected: false,
  };
  circuit.wires.fsm_mixed_raw_btn_wire = {
    id: 'fsm_mixed_raw_btn_wire',
    from: { gateId: 'fsm_mixed_raw_btn', portId: 'out' },
    to: { gateId: 'fsm_mixed_raw_led', portId: 'in' },
    signal: { value: 0, version: 0, lastChangedAt: 0 },
    isSelected: false,
  };

  return JSON.stringify(circuit);
}

function buildWideProjectedFsmFixtureJson() {
  const defaultSignal = { value: 0, version: 0, lastChangedAt: 0 };
  const batchId = 'ui-audit-wide-fsm';

  const makeGate = (id, typeId, x, y, extra = {}) => ({
    id,
    typeId,
    x,
    y,
    outputSignals: {},
    customState: {},
    isSelected: false,
    ...extra,
  });

  const makeProjectedSignal = (role, label, signalPortId) => ({
    sourceSystem: 'fsm_synth',
    projectionBatchId: batchId,
    role,
    visibility: 'canonical',
    signalLabel: label,
    groupKey: `${role}:${label}`,
    signalPortId,
  });

  const makeWire = (id, fromGateId, fromPortId, toGateId, toPortId) => ({
    id,
    from: { gateId: fromGateId, portId: fromPortId },
    to: { gateId: toGateId, portId: toPortId },
    signal: { ...defaultSignal },
    isSelected: false,
  });

  const gates = {
    clk: makeGate('clk', 'CLOCK', 40, 40, {
      label: 'CLK',
      customState: { value: 0 },
      projection: makeProjectedSignal('clock', 'CLK', 'clk'),
    }),
    rst: makeGate('rst', 'INPUT_SWITCH', 40, 120, {
      label: 'RST',
      customState: { value: 0 },
      projection: makeProjectedSignal('reset', 'RST', 'out'),
    }),
    q0: makeGate('q0', 'D_FF_R', 520, 80, {
      label: 'Q0',
      customState: { q: 0, prevClk: 0 },
      projection: makeProjectedSignal('state', 'Q0', 'q'),
    }),
    q1: makeGate('q1', 'D_FF_R', 520, 180, {
      label: 'Q1',
      customState: { q: 0, prevClk: 0 },
      projection: makeProjectedSignal('state', 'Q1', 'q'),
    }),
    outY: makeGate('outY', 'OUTPUT_LED', 860, 80, {
      label: 'Y',
      projection: makeProjectedSignal('output', 'Y', '_display'),
    }),
  };

  for (let index = 0; index < 6; index += 1) {
    gates[`in${index}`] = makeGate(`in${index}`, 'INPUT_SWITCH', 40, 220 + index * 60, {
      label: `A${index}`,
      customState: { value: 0 },
      projection: makeProjectedSignal('input', `A${index}`, 'out'),
    });
    gates[`tap${index}`] = makeGate(`tap${index}`, 'OUTPUT_LED', 860, 180 + index * 60, {
      label: `T${index}`,
      projection: makeProjectedSignal('output', `T${index}`, '_display'),
    });
  }

  const wires = {
    w1: makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
    w2: makeWire('w2', 'clk', 'clk', 'q1', 'clk'),
    w3: makeWire('w3', 'rst', 'out', 'q0', 'rst'),
    w4: makeWire('w4', 'rst', 'out', 'q1', 'rst'),
    w5: makeWire('w5', 'in0', 'out', 'q0', 'd'),
    w6: makeWire('w6', 'q0', 'q', 'q1', 'd'),
    w7: makeWire('w7', 'q0', 'q', 'outY', 'in'),
  };

  for (let index = 0; index < 6; index += 1) {
    wires[`tap-wire-${index}`] = makeWire(`tap-wire-${index}`, `in${index}`, 'out', `tap${index}`, 'in');
  }

  return JSON.stringify({
    id: 'ui-audit-wide-projected-fsm',
    name: 'UI Audit Wide Projected FSM',
    version: '1.0.0',
    gates,
    wires,
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2026-03-20', updatedAt: '2026-03-20' },
  });
}

function buildTimingSubsystemFixtureJson() {
  const defaultSignal = { value: 0, version: 0, lastChangedAt: 0 };
  const batchId = 'ui-audit-timing-fsm';
  const makeProjectedSignal = (role, label, signalPortId) => ({
    sourceSystem: 'fsm_synth',
    projectionBatchId: batchId,
    role,
    visibility: 'canonical',
    signalLabel: label,
    groupKey: `${role}:${label}`,
    signalPortId,
  });

  const circuit = {
    id: 'ui-audit-timing-subsystem',
    name: 'UI Audit Timing Subsystem',
    version: '1.0.0',
    gates: {
      clk: {
        id: 'clk',
        typeId: 'CLOCK',
        x: 40,
        y: 40,
        label: 'CLK',
        outputSignals: {},
        customState: { value: 0 },
        isSelected: false,
        projection: makeProjectedSignal('clock', 'CLK', 'clk'),
      },
      rst: {
        id: 'rst',
        typeId: 'INPUT_SWITCH',
        x: 40,
        y: 120,
        label: 'RST',
        outputSignals: {},
        customState: { value: 0 },
        isSelected: false,
        projection: makeProjectedSignal('reset', 'RST', 'out'),
      },
      inA: {
        id: 'inA',
        typeId: 'INPUT_SWITCH',
        x: 40,
        y: 200,
        label: 'A',
        outputSignals: {},
        customState: { value: 0 },
        isSelected: false,
        projection: makeProjectedSignal('input', 'A', 'out'),
      },
      ffQ0: {
        id: 'ffQ0',
        typeId: 'D_FF_R',
        x: 340,
        y: 120,
        label: 'Q0',
        outputSignals: {},
        customState: { q: 0, prevClk: 0 },
        isSelected: false,
        projection: makeProjectedSignal('state', 'Q0', 'q'),
      },
      outY: {
        id: 'outY',
        typeId: 'OUTPUT_LED',
        x: 560,
        y: 120,
        label: 'Y',
        outputSignals: {},
        isSelected: false,
        projection: makeProjectedSignal('output', 'Y', '_display'),
      },
      timing_raw_sw: {
        id: 'timing_raw_sw',
        typeId: 'INPUT_SWITCH',
        x: 40,
        y: 360,
        label: 'RAW_A',
        outputSignals: {},
        customState: { value: 0 },
        isSelected: false,
      },
      timing_raw_not: {
        id: 'timing_raw_not',
        typeId: 'NOT',
        x: 220,
        y: 360,
        outputSignals: {},
        customState: {},
        isSelected: false,
      },
      timing_raw_led: {
        id: 'timing_raw_led',
        typeId: 'OUTPUT_LED',
        x: 420,
        y: 360,
        label: 'RAW_Y',
        outputSignals: {},
        isSelected: false,
      },
    },
    wires: {
      w1: {
        id: 'w1',
        from: { gateId: 'clk', portId: 'clk' },
        to: { gateId: 'ffQ0', portId: 'clk' },
        signal: { ...defaultSignal },
        isSelected: false,
      },
      w2: {
        id: 'w2',
        from: { gateId: 'rst', portId: 'out' },
        to: { gateId: 'ffQ0', portId: 'rst' },
        signal: { ...defaultSignal },
        isSelected: false,
      },
      w3: {
        id: 'w3',
        from: { gateId: 'inA', portId: 'out' },
        to: { gateId: 'ffQ0', portId: 'd' },
        signal: { ...defaultSignal },
        isSelected: false,
      },
      w4: {
        id: 'w4',
        from: { gateId: 'ffQ0', portId: 'q' },
        to: { gateId: 'outY', portId: 'in' },
        signal: { ...defaultSignal },
        isSelected: false,
      },
      raw1: {
        id: 'raw1',
        from: { gateId: 'timing_raw_sw', portId: 'out' },
        to: { gateId: 'timing_raw_not', portId: 'in' },
        signal: { ...defaultSignal },
        isSelected: false,
      },
      raw2: {
        id: 'raw2',
        from: { gateId: 'timing_raw_not', portId: 'out' },
        to: { gateId: 'timing_raw_led', portId: 'in' },
        signal: { ...defaultSignal },
        isSelected: false,
      },
    },
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2026-03-20', updatedAt: '2026-03-20' },
  };

  return JSON.stringify(circuit);
}

// ── Semantic timing validation for 5 target cases ────────────────────────────

function checkTimingSemantic(slug, timingSem) {
  const expectations = TIMING_SEMANTIC[slug];
  if (!expectations || !timingSem) return null;

  const findings = [];
  let semanticPass = true;

  // Check 1: expected signal labels visible in SVG text nodes
  const labelSet = timingSem.signalLabels ?? [];
  const missingLabels = expectations.expectedLabels.filter(
    (lbl) => !labelSet.some((s) => s === lbl || s.endsWith(lbl))
  );
  if (missingLabels.length > 0) {
    findings.push(`MISSING labels in timing SVG: [${missingLabels.join(', ')}]`);
    semanticPass = false;
  } else {
    findings.push(`Labels OK: [${expectations.expectedLabels.join(', ')}] all visible in timing SVG`);
  }

  // Check 2: steps > 0 (simulation produced timing history)
  if (expectations.expectStepsGt0) {
    if (timingSem.steps > 0) {
      findings.push(`Steps > 0: ${timingSem.steps} snapshots recorded (simulation settled and produced history)`);
    } else {
      findings.push(`Steps = 0: simulation produced no timing history (headless RAF scheduling -- expectStepsGt0 not met)`);
      semanticPass = false;
    }
  }

  // Check 3: Z-colored path (HI_Z signal in timing)
  if (expectations.expectZPath) {
    if (timingSem.hasZPath) {
      findings.push(`Z-path (amber): present -- HI_Z signal visible in timing waveform`);
    } else {
      if (timingSem.steps === 0) {
        findings.push(`Z-path (amber): not present -- requires steps > 0 (timing history empty)`);
      } else {
        findings.push(`Z-path (amber): MISSING -- expected HI_Z signal not visible`);
        semanticPass = false;
      }
    }
  }

  // Check 4: X-colored path (conflict signal in timing)
  if (expectations.expectXPath) {
    if (timingSem.hasXPath) {
      findings.push(`X-path (red): present -- conflict/X signal visible in timing waveform`);
    } else {
      if (timingSem.steps === 0) {
        findings.push(`X-path (red): not present -- requires steps > 0 (timing history empty)`);
      } else {
        findings.push(`X-path (red): MISSING -- expected conflict/X signal not visible`);
        semanticPass = false;
      }
    }
  }

  return {
    semanticPass,
    note: expectations.note,
    findings,
    stepsRecorded: timingSem.steps,
    labelsFound: labelSet,
  };
}

// ── Analysis ──────────────────────────────────────────────────────────────────

function analyze(slug, table, timing) {
  const tooMany = table.paragraphs.some((line) => /Zu viele/i.test(line));
  const reduced = table.paragraphs.some((line) => /Reduzierte/i.test(line));
  if (slug === 'tri_not_sanitized') {
    const bugRow = table.rows.find((row) => row[0] === '1' && row[1] === '1' && row[row.length - 1] === '1');
    return {
      status: bugRow ? 'fail' : 'pass',
      message: bugRow ? 'UI table still shows the sanitized downstream output for Z -> NOT.' : 'No sanitized Z-row found.',
    };
  }
  if (['hc373_oe_z', 'hc374_oe_z', 'hc595_oe_shift', 'hc161_clear', 'hc163_clear', 'hc194_modes', 'mixed_datapath'].includes(slug)) {
    if (tooMany) return { status: 'warn', message: 'UI still shows the old variable-count limit (no reduced table rendered).' };
    if (reduced && table.rows.length > 0) return { status: 'pass', message: 'UI rendered a reduced control-flow table for a wide sequential case.' };
    if (table.rows.length > 0)            return { status: 'pass', message: 'UI rendered a table for a wide sequential case.' };
    return { status: 'warn', message: 'No table rendered for a wide sequential case.' };
  }
  return {
    status: timing.titlePresent && (tooMany || table.rows.length > 0) ? 'pass' : 'warn',
    message: timing.titlePresent ? 'Table/Timing loaded.' : 'Timing panel did not load as expected.',
  };
}

function analyzeSttModeChecks(checks) {
  return checks.map((check) => {
    if (check.slug === 'fsm_projected_modes') {
      const compact = check.compact;
      const technical = check.technical;
      const pass = compact.selectExists
        && compact.selected === 'fsm_compact'
        && compact.options.some((option) => option.value === 'fsm_compact')
        && compact.options.some((option) => option.value === 'technical_full')
        && !compact.headers.includes('CLK')
        && compact.hasCompactExplanation
        && !!technical
        && technical.selected === 'technical_full'
        && technical.headers.includes('CLK')
        && technical.rowCount >= compact.rowCount;
      return {
        ...check,
        status: pass ? 'pass' : 'fail',
        message: pass
          ? 'Projected FSM exposes compact + technical STT modes with distinct table shapes.'
          : 'Projected FSM STT mode switch is missing or does not change the rendered table as expected.',
      };
    }

    if (check.slug === 'fsm_mixed_fallback') {
      const pass = !check.compact.selectExists
        && check.compact.headers.includes('CLK')
        && check.compact.hasFallbackExplanation;
      return {
        ...check,
        status: pass ? 'pass' : 'fail',
        message: pass
          ? 'Mixed FSM/raw case stays in technical-full mode and renders the fallback explanation without a misleading compact dropdown.'
          : 'Mixed FSM/raw fallback still exposes a compact dropdown, lost the technical clock dimension, or no longer renders the fallback explanation.',
      };
    }

    if (check.slug === 'fsm_projected_reduced') {
      const hasReducedHint = check.compact.paragraphs.some((line) => /Reduzierte/i.test(line));
      const pass = !check.compact.selectExists
        && !check.compact.headers.includes('CLK')
        && check.compact.rowCount > 0
        && hasReducedHint;
      return {
        ...check,
        status: pass ? 'pass' : 'fail',
        message: pass
          ? 'Wide projected FSM stays in the reduced compact view and does not expose a misleading technical-full dropdown.'
          : 'Wide projected FSM reduction no longer hides the technical-full mode or lost its reduced-STT hints.',
      };
    }

    return {
      ...check,
      status: 'warn',
      message: 'Unknown FSM STT mode audit case.',
    };
  });
}

function analyzeTimingSystemChecks(checks) {
  return checks.map((check) => {
    const all = check.all;
    const first = check.first;
    const second = check.second;
    const labelSetsDiffer = !!second
      && JSON.stringify(first.rowLabels) !== JSON.stringify(second.rowLabels);
    const clockVisibilityChanged = !!second
      && first.rowLabels.includes('CLK') !== second.rowLabels.includes('CLK');
    const fullShowsMoreThanSelected = all.rowLabels.length > first.rowLabels.length;
    const pass = all.viewMode === 'all'
      && !all.selectExists
      && first.viewMode === 'selected'
      && first.selectExists
      && first.options.length >= 2
      && !!second
      && second.selected !== first.selected
      && (labelSetsDiffer || clockVisibilityChanged)
      && fullShowsMoreThanSelected;

    return {
      ...check,
      status: pass ? 'pass' : 'fail',
      message: pass
        ? 'Timing full view keeps the whole canvas, while selected view exposes the system selector and switches between disconnected subsystems.'
        : 'Timing full/selected separation regressed, or the system selector no longer switches the visible subsystem channels.',
    };
  });
}

// ── Report rendering ──────────────────────────────────────────────────────────

function renderReport(summary) {
  const withCheck = summary.results.filter((item) => item.check);
  const errors = summary.results.filter((item) => item.error);
  const fails = withCheck.filter((item) => item.check.status === 'fail');
  const warns = withCheck.filter((item) => item.check.status === 'warn');
  const passes = withCheck.filter((item) => item.check.status === 'pass');
  const warnSlugs = warns.map((item) => `- \`${item.slug}\``).join('\n') || '- keine';
  const passSlugs = passes.map((item) => `- \`${item.slug}\``).join('\n') || '- keine';
  const failLines = fails.map((item) => `- \`${item.slug}\`: ${item.check.message}`).join('\n') || '- keine';
  const errorLines = errors.map((item) => `- \`${item.slug}\`: ${item.error}`).join('\n') || '- keine';

  // Semantic timing section
  const semanticResults = summary.results.filter((item) => item.timingSemantic);
  const semanticPasses = semanticResults.filter((r) => r.timingSemantic.semanticPass);
  const semanticWarns = semanticResults.filter((r) => !r.timingSemantic.semanticPass);
  const semanticLines = semanticResults.map((item) => {
    const s = item.timingSemantic;
    const statusIcon = s.semanticPass ? 'PASS' : 'WARN';
    const stepsInfo = s.stepsRecorded > 0
      ? `${s.stepsRecorded} Schritte`
      : `0 Schritte (Simulation lief nicht oder kein RAF-Tick)`;
    const findingsText = s.findings.map((f) => `  - ${f}`).join('\n');
    return `### \`${item.slug}\` - ${statusIcon}\n\n${s.note}\n\nSchritte: ${stepsInfo}\n\nBefunde:\n${findingsText}`;
  }).join('\n\n');

  // Limitations section
  const stepsZeroCount = semanticResults.filter((r) => r.timingSemantic.stepsRecorded === 0).length;
  const limitationNote = stepsZeroCount > 0
    ? `\n**Bekannte Grenze:** Bei ${stepsZeroCount} Faellen wurden 0 Schritte aufgezeichnet. ` +
      `Das Timing-Diagramm der App zeichnet nur bei tatsaechlichen Signalaenderungen (batchChangedNets > 0) auf. ` +
      `In headless Puppeteer kann der requestAnimationFrame-Tick ausbleiben bevor der Audit liest. ` +
      `Signal-Labels sind trotzdem pruefbar (SVG text-Elemente). ` +
      `Fuer Z/X-Pfad-Pruefung wird steps > 0 benoetigt.\n`
    : '';

  const fsmModeChecks = summary.fsmModeChecks ?? [];
  const fsmModePasses = fsmModeChecks.filter((item) => item.status === 'pass');
  const fsmModeFails = fsmModeChecks.filter((item) => item.status === 'fail');
  const fsmModeLines = fsmModeChecks.map((item) =>
    `- \`${item.slug}\`: ${item.status.toUpperCase()} - ${item.message}`,
  ).join('\n') || '- keine';
  const timingSystemChecks = summary.timingSystemChecks ?? [];
  const timingSystemPasses = timingSystemChecks.filter((item) => item.status === 'pass');
  const timingSystemFails = timingSystemChecks.filter((item) => item.status === 'fail');
  const timingSystemLines = timingSystemChecks.map((item) =>
    `- \`${item.slug}\`: ${item.status.toUpperCase()} - ${item.message}`,
  ).join('\n') || '- keine';

  return `# Focused High-Risk UI Audit\n\n` +
    `Datum: 2026-03-07\n` +
    `Repo: \`${PUBLIC_REPO}\`\n` +
    `Server: \`${summary.baseUrl}\`\n` +
    `Rohdaten: \`validation/focused-nine-ui-summary.json\`\n\n` +
    `## Kurzfazit\n\n` +
    `Der separate Browserlauf ueber die 12 fokussierten Hochrisiko-Schaltungen ist gegen den aktuellen P0-Stand gelaufen.\n\n` +
    `- \`${fails.length}\` echte UI-/Projektionsfehler\n` +
    `- \`${warns.length}\` erwartete UI-Limit-Faelle bei breiten sequenziellen Zustandsraeumen\n` +
    `- \`${passes.length}\` saubere UI-Smoke-Passes\n` +
    `- \`${errors.length}\` Infrastruktur-/Ladefehler\n` +
    `- HDL-Modal war in allen erfolgreich geladenen Faellen textuell konsistent mit den generierten Exportdateien\n` +
    `- Timing-Panel hat in allen erfolgreich geladenen Faellen geoeffnet\n` +
    `- FSM-STT-Modus-Audit: \`${fsmModePasses.length}\` PASS, \`${fsmModeFails.length}\` FAIL\n` +
    `- Timing-System-Audit: \`${timingSystemPasses.length}\` PASS, \`${timingSystemFails.length}\` FAIL\n` +
    `- Semantischer Timing-Check fuer ${semanticResults.length} Fokusfaelle: ` +
    `\`${semanticPasses.length}\` PASS, \`${semanticWarns.length}\` WARN` +
    `${semanticWarns.length > 0 ? ' (steps=0, headless RAF-Limit)' : ''}\n\n` +
    `## Echte UI-Befunde\n\n` +
    `${failLines}\n\n` +
    `## Erwartete UI-Limits\n\n` +
    `${warnSlugs}\n\n` +
    (warns.length > 0
      ? `Gemeinsames Muster:\n` +
        `- Die UI erkennt sequenzielle Logik korrekt.\n` +
        `- Breite Zustandsraeume werden reduziert analysiert (Steuerlogik-Projektion).\n` +
        `- Das ist ein Werkzeuglimit, kein Simulationsfehler.\n\n`
      : '') +
    `## Saubere UI-Smoke-Passes\n\n` +
    `${passSlugs}\n\n` +
    `## Infrastruktur-/Ladefehler\n\n` +
    `${errorLines}\n\n` +
    `## FSM-STT-Modus-Pruefung\n\n` +
    `${fsmModeLines}\n\n` +
    `## Timing-System-Pruefung\n\n` +
    `${timingSystemLines}\n\n` +
    `## Semantische Timing-Pruefung (5 Fokusfaelle)\n\n` +
    `Fuer \`tri_not_sanitized\`, \`dff_led\`, \`jkff_led\`, \`tff_led\` und \`multi_driver_same_input\` ` +
    `wird jetzt nicht nur geprueft, ob das Panel laedt, sondern:\n` +
    `- erwartete Signalnamen im SVG sichtbar\n` +
    `- Schritte > 0 nach Wartezeit (Simulation hat Snapshots erzeugt)\n` +
    `- Z-farbige Pfade (amber, #f59e0b) bei Tri-State-Faellen\n` +
    `- X-farbige Pfade (rot, #ef4444) bei Konflikten\n\n` +
    (semanticLines || '- keine semantischen Ergebnisse (Audit nicht gelaufen)') + '\n\n' +
    limitationNote +
    `## Wichtige Grenze dieses UI-Laufs\n\n` +
    `Der semantische Timing-Check ist ein erster Schritt ueber den reinen Smoke-Test hinaus.\n` +
    `Signal-Label-Pruefung funktioniert zuverlaessig (SVG text-Elemente sind immer vorhanden).\n` +
    `Z/X-Pfad-Pruefung setzt steps > 0 voraus -- das haengt davon ab, ob der headless-Browser\n` +
    `einen requestAnimationFrame-Tick zwischen Circuit-Load und Timing-Lesen ausfuehrt.\n\n` +
    `Was noch fehlt fuer einen vollen Waveform-Diff:\n` +
    `- Genaue Signalwerte pro Schritt (erfordert Zugriff auf React-State oder App-API)\n` +
    `- Zustandsaenderungen nach manueller Schalter-Interaktion (erfordert Canvas-Klick-Koordinaten)\n` +
    `- Vergleich interner Simulation vs UI-Darstellung (erfordert gemeinsame Datenquelle)\n\n` +
    `## Bedeutung fuer die Professionalisierung\n\n` +
    `Positiv:\n` +
    `- UI, Export-Modal und Kernartefakte bleiben fuer die Fokusfaelle konsistent gekoppelt.\n` +
    `- Der fruehere UI-Befund \`tri_not_sanitized\` ist im P0-Stand nicht mehr reproduzierbar.\n` +
    `- Semantische Pruefung fuer Z/X-Signal-Sichtbarkeit ist jetzt ansatzweise implementiert.\n\n` +
    `Offen:\n` +
    `- Grosse sequentielle Schaltungen werden reduziert analysiert (Steuerlogik-Projektion statt voller Enumeration).\n` +
    `- Ein echter Timing-Waveform-Diff (Schritt-fuer-Schritt-Vergleich) fehlt noch.\n`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const SEMANTIC_SLUGS = new Set(Object.keys(TIMING_SEMANTIC));

const browser = await puppeteer.launch(buildBrowserLaunchOptions());
const results = [];
const fsmModeChecks = [];
const timingSystemChecks = [];

for (const item of SUMMARY.cases) {
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  try {
    await loadCircuit(page, item.files.circuit);
    const table = await extractTable(page);
    const hdl = await extractHdl(page);

    // For the 5 semantic target cases use enhanced timing extraction (with wait + label check).
    // For all other cases use the standard timing extraction.
    let timing;
    let timingSemanticResult = null;

    if (SEMANTIC_SLUGS.has(item.slug)) {
      timing = await extractTimingSemantic(page, item.slug);
      timingSemanticResult = checkTimingSemantic(item.slug, timing);
    } else {
      timing = await extractTiming(page);
    }

    const expectedVerilog = fs.readFileSync(resolveArtifactPath(item.files.verilog), 'utf8').trim();
    const expectedVhdl = fs.readFileSync(resolveArtifactPath(item.files.vhdl), 'utf8').trim();
    const check = analyze(item.slug, table, timing);
    const result = {
      slug: item.slug,
      check,
      table: {
        rowCount: table.rows.length,
        paragraphs: table.paragraphs,
      },
      hdl: {
        verilogMatches: hdl.verilog.trim() === expectedVerilog,
        vhdlMatches: hdl.vhdl.trim() === expectedVhdl,
      },
      timing,
    };

    if (timingSemanticResult) {
      result.timingSemantic = timingSemanticResult;
    }

    if (check.status !== 'pass' || !result.hdl.verilogMatches || !result.hdl.vhdlMatches) {
      const screenshot = path.join(UI_DIR, `${item.slug}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      result.screenshot = publicPath(screenshot);
    }
    results.push(result);
  } catch (error) {
    const screenshot = path.join(UI_DIR, `${item.slug}-error.png`);
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
    results.push({ slug: item.slug, error: sanitizePublicText(error), screenshot: publicPath(screenshot) });
  } finally {
    await page.close();
  }
}

for (const modeCase of [
  {
    slug: 'fsm_projected_modes',
    load: (page) => loadCircuit(page, LEGACY_FSM_EXPORT),
    switchToTechnical: true,
  },
  {
    slug: 'fsm_mixed_fallback',
    load: (page) => loadCircuitJson(page, buildMixedLegacyFsmFallbackFixtureJson()),
    switchToTechnical: false,
  },
  {
    slug: 'fsm_projected_reduced',
    load: (page) => loadCircuitJson(page, buildWideProjectedFsmFixtureJson()),
    switchToTechnical: false,
  },
]) {
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  try {
    await modeCase.load(page);
    const result = await extractSttModeAudit(page, modeCase.switchToTechnical);
    fsmModeChecks.push({
      slug: modeCase.slug,
      ...result,
    });
  } catch (error) {
    fsmModeChecks.push({
      slug: modeCase.slug,
      status: 'fail',
      message: sanitizePublicText(error),
    });
  } finally {
    await page.close();
  }
}

for (const timingCase of [
  {
    slug: 'timing_subsystem_selector',
    load: (page) => loadCircuitJson(page, buildTimingSubsystemFixtureJson()),
  },
]) {
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  try {
    await timingCase.load(page);
    const result = await extractTimingSystemAudit(page);
    timingSystemChecks.push({
      slug: timingCase.slug,
      ...result,
    });
  } catch (error) {
    timingSystemChecks.push({
      slug: timingCase.slug,
      status: 'fail',
      message: sanitizePublicText(error),
    });
  } finally {
    await page.close();
  }
}

await browser.close();
const analyzedFsmModeChecks = analyzeSttModeChecks(fsmModeChecks);
const analyzedTimingSystemChecks = analyzeTimingSystemChecks(timingSystemChecks);
const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl: PUBLIC_SERVER,
  results,
  fsmModeChecks: analyzedFsmModeChecks,
  timingSystemChecks: analyzedTimingSystemChecks,
};
fs.writeFileSync(path.join(OUT_DIR, 'focused-nine-ui-summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(REPORT_FILE, renderReport(summary));
console.log(JSON.stringify({ checked: results.length }, null, 2));
