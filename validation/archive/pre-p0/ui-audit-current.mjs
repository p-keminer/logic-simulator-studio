import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const ROOT = '<repo-root>';
const OUT_DIR = path.join(ROOT, 'validation');
const UI_DIR = path.join(OUT_DIR, 'generated-ui-current');
const SUMMARY = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'fix-verification-summary.json'), 'utf8'));
const BASE_URL = '<dev-server>';

fs.mkdirSync(UI_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function clickButton(page, label) {
  await page.evaluate((wanted) => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.replace(/\s+/g, ' ').trim() === wanted);
    if (!button) throw new Error(`button not found: ${wanted}`);
    button.click();
  }, label);
}

async function loadCircuit(page, file) {
  const circuitJson = fs.readFileSync(file, 'utf8');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((json) => sessionStorage.setItem('lgsim_autosave', json), circuitJson);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.body.textContent?.includes('LogicSim'), { timeout: 10000 });
}

async function extractTable(page) {
  await clickButton(page, 'W-Tabelle');
  await page.waitForFunction(() => Array.from(document.querySelectorAll('h2')).some((n) => /tabelle/i.test(n.textContent || '')), { timeout: 10000 });
  const data = await page.evaluate(() => ({
    title: [...document.querySelectorAll('h2')].map((n) => n.textContent?.trim()).find(Boolean) ?? '',
    paragraphs: [...document.querySelectorAll('p')].map((p) => p.textContent?.trim()).filter(Boolean),
    headers: [...document.querySelectorAll('table thead tr:last-child th')].map((th) => th.textContent?.trim()).filter(Boolean),
    rows: [...document.querySelectorAll('table tbody tr')].map((tr) =>
      [...tr.querySelectorAll('td')].map((td) => td.textContent?.trim() ?? '')),
  }));
  await page.keyboard.press('Escape');
  return data;
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

async function extractTiming(page) {
  await clickButton(page, 'Timing');
  await page.waitForFunction(() => document.body.textContent?.includes('ZEITDIAGRAMM'), { timeout: 10000 });
  const timing = await page.evaluate(() => {
    const text = document.body.textContent ?? '';
    const stepsMatch = text.match(/(\d+)\s+Schritte/);
    return {
      titlePresent: text.includes('ZEITDIAGRAMM'),
      steps: stepsMatch ? Number(stepsMatch[1]) : null,
      textNodeCount: [...document.querySelectorAll('svg text')].length,
    };
  });
  await clickButton(page, 'Timing');
  return timing;
}

function analyzeTable(slug, table) {
  if (slug === 'tri_led_z') {
    return {
      expected: 'Truth table should render Z for disabled TRIBUF output',
      pass: table.rows.some((row) => row.includes('Z')),
    };
  }
  if (slug === 'tri_not_sanitized') {
    const row = table.rows.find((cells) => cells[0] === '1' && cells[1] === '1');
    return {
      expected: 'For A=1 and OE=1 the truth table currently shows output 1 due to Z->0 sanitization',
      pass: !!row && row[row.length - 1] === '1',
      row,
    };
  }
  if (slug === 'dff_led') {
    const row = table.rows.find((cells) =>
      cells.length >= 8 &&
      cells[0] === '1' &&
      cells[1] === '1' &&
      cells[3] === '0' &&
      cells[5] === '1' &&
      cells[7] === '1');
    return {
      expected: 'State table should contain D=1, CLK=1, Q(t)=0 -> Q(t+1)=1 and output 1',
      pass: !!row,
      row,
    };
  }
  if (slug === 'hc373_oe_z' || slug === 'hc374_oe_z') {
    return {
      expected: 'State table is expected to hit the variable-count UI limit for this wide sequential circuit',
      pass: table.rows.length === 0 && table.paragraphs.some((p) => /Zu viele/i.test(p)),
    };
  }
  return { expected: 'No specific table assertion', pass: true };
}

const browser = await puppeteer.launch({ headless: true });
const results = [];

for (const item of SUMMARY.circuitResults) {
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  try {
    await loadCircuit(page, item.files.circuit);
    const table = await extractTable(page);
    const hdl = await extractHdl(page);
    const timing = await extractTiming(page);
    const expectedVerilog = fs.readFileSync(item.files.verilog, 'utf8').trim();
    const expectedVhdl = fs.readFileSync(item.files.vhdl, 'utf8').trim();
    const tableCheck = analyzeTable(item.slug, table);
    const summary = {
      slug: item.slug,
      table: {
        rowCount: table.rows.length,
        paragraphs: table.paragraphs,
        sampleRows: item.slug === 'dff_led' ? table.rows : undefined,
        check: tableCheck,
      },
      hdl: {
        verilogMatches: hdl.verilog.trim() === expectedVerilog,
        vhdlMatches: hdl.vhdl.trim() === expectedVhdl,
      },
      timing,
    };
    if (!tableCheck.pass || !summary.hdl.verilogMatches || !summary.hdl.vhdlMatches) {
      const shot = path.join(UI_DIR, `${item.slug}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      summary.screenshot = shot;
    }
    results.push(summary);
  } catch (error) {
    const shot = path.join(UI_DIR, `${item.slug}-error.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    results.push({ slug: item.slug, error: String(error), screenshot: shot });
  } finally {
    await page.close();
  }
}

await browser.close();
fs.writeFileSync(path.join(OUT_DIR, 'ui-summary-current.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  results,
}, null, 2));
console.log(JSON.stringify({ checked: results.length }, null, 2));
