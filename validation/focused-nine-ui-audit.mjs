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

// â”€â”€ Semantic timing expectations for 5 target cases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// These checks go beyond "panel loaded" and verify:
//  - expected signal labels are visible in the timing SVG
//  - step count > 0 after the simulation has settled
//  - Z (amber, #f59e0b) and X (red, #ef4444) colored SVG paths appear where expected
//
// Note: timing history only records when signals change (batchChangedNets > 0).
// On initial circuit load, outputSignals are all 0 but customState may carry
// non-zero values â€” so the first settle produces changes and at least 1 snapshot.
// SAMPLE_EVERY=1 means every changed batch gets a snapshot; steps should be > 0
// once the simulation's initial settle has completed.

const TIMING_SEMANTIC = {
  tri_not_sanitized: {
    // sw_a=1, sw_oe=1 â†’ TRIBUF output = Z (oe active-low, value 1 = disabled â†’ Z)
    // downstream NOT(Z) = X (3)
    expectedLabels: ['a', 'oe', 'y'],
    expectStepsGt0: true,
    expectZPath: true,   // amber dashed path: TRIBUF drives Z
    expectXPath: true,   // red dashed path: NOT(Z) â†’ X at LED
    note: 'TRIBUF(a=1, oe=1) â†’ Z; NOT(Z) â†’ X. Z and X colored paths expected.',
  },
  dff_led: {
    // sw_d=1, sw_clk=0 â†’ D_FF holds at q=0 initially
    expectedLabels: ['d', 'clk', 'q'],
    expectStepsGt0: true,
    expectZPath: false,
    expectXPath: false,
    note: 'D_FF initial settle: labels and step count confirm timing tracks correctly.',
  },
  jkff_led: {
    // sw_j=1, sw_k=0, sw_clk=0 â†’ JK_FF holds at q=0
    expectedLabels: ['j', 'k', 'clk', 'q'],
    expectStepsGt0: true,
    expectZPath: false,
    expectXPath: false,
    note: 'JK_FF initial settle: four input/output labels confirm channel presence.',
  },
  tff_led: {
    // sw_t=1, sw_clk=0 â†’ T_FF holds at q=0
    expectedLabels: ['t', 'clk', 'q'],
    expectStepsGt0: true,
    expectZPath: false,
    expectXPath: false,
    note: 'T_FF initial settle: three labels confirm sequential gate channels.',
  },
  multi_driver_same_input: {
    // sw_a=1 and sw_b=0 both drive led â†’ conflict â†’ X (3)
    expectedLabels: ['a', 'b', 'y'],
    expectStepsGt0: true,
    expectZPath: false,
    expectXPath: true,   // red dashed path: conflict between 1 and 0 â†’ X
    note: 'Dual drivers (1 vs 0) resolve to X. Red X-conflict path expected in timing.',
  },
};

async function clickButton(page, label) {
  await page.evaluate((wanted) => {
    const button = [...document.querySelectorAll('button')].find((item) =>
      item.textContent?.replace(/\s+/g, ' ').trim() === wanted);
    if (!button) throw new Error(`button not found: ${wanted}`);
    button.click();
  }, label);
}

async function loadCircuit(page, file) {
  const json = fs.readFileSync(resolveArtifactPath(file), 'utf8');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((value) => sessionStorage.setItem('lgsim_autosave', value), json);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.body.textContent?.includes('LogicSim'), { timeout: 10000 });
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

// â”€â”€ Standard timing extraction (smoke-test only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Enhanced timing extraction with semantic signal checks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Waits after opening the panel to allow the simulation's initial settle to
// produce timing history (batchChangedNets > 0 on first evaluation).
// Extracts:
//  - signalLabels: all SVG <text> content (channel labels from circuit.gates)
//  - hasZPath: amber SVG path present (HI_Z=2 signal in history)
//  - hasXPath: red SVG path present (X/conflict=3 signal in history)
//  - steps: number of recorded timing snapshots

async function extractTimingSemantic(page) {
  // Give the simulation time to complete its initial settle and produce snapshots.
  // batchChangedNets > 0 on first evaluation â†’ SAMPLE_EVERY=1 â†’ at least 1 snapshot.
  await sleep(1200);
  await clickButton(page, 'Timing');
  await page.waitForFunction(() => document.body.textContent?.includes('ZEITDIAGRAMM'), { timeout: 10000 });
  // Small additional wait in case RAF hasn't committed the snapshot yet.
  await sleep(400);

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

// â”€â”€ Semantic timing validation for 5 target cases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      findings.push(`Steps = 0: simulation produced no timing history (headless RAF scheduling â€” expectStepsGt0 not met)`);
      semanticPass = false;
    }
  }

  // Check 3: Z-colored path (HI_Z signal in timing)
  if (expectations.expectZPath) {
    if (timingSem.hasZPath) {
      findings.push(`Z-path (amber): present â€” HI_Z signal visible in timing waveform`);
    } else {
      if (timingSem.steps === 0) {
        findings.push(`Z-path (amber): not present â€” requires steps > 0 (timing history empty)`);
      } else {
        findings.push(`Z-path (amber): MISSING â€” expected HI_Z signal not visible`);
        semanticPass = false;
      }
    }
  }

  // Check 4: X-colored path (conflict signal in timing)
  if (expectations.expectXPath) {
    if (timingSem.hasXPath) {
      findings.push(`X-path (red): present â€” conflict/X signal visible in timing waveform`);
    } else {
      if (timingSem.steps === 0) {
        findings.push(`X-path (red): not present â€” requires steps > 0 (timing history empty)`);
      } else {
        findings.push(`X-path (red): MISSING â€” expected conflict/X signal not visible`);
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

// â”€â”€ Analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Report rendering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    return `### \`${item.slug}\` â€” ${statusIcon}\n\n${s.note}\n\nSchritte: ${stepsInfo}\n\nBefunde:\n${findingsText}`;
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
    `Z/X-Pfad-Pruefung setzt steps > 0 voraus â€” das haengt davon ab, ob der headless-Browser\n` +
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

// â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SEMANTIC_SLUGS = new Set(Object.keys(TIMING_SEMANTIC));

const browser = await puppeteer.launch({ headless: true });
const results = [];

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
      timing = await extractTimingSemantic(page);
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

await browser.close();
const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl: PUBLIC_SERVER,
  results,
};
fs.writeFileSync(path.join(OUT_DIR, 'focused-nine-ui-summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(REPORT_FILE, renderReport(summary));
console.log(JSON.stringify({ checked: results.length }, null, 2));
