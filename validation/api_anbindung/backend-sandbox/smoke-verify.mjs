// smoke-verify.mjs – Live-Verifikation der API1-05 Härtungsmaßnahmen H1–H5
// Läuft gegen einen bereits gestarteten Broker auf localhost:8787.

const BASE = 'http://localhost:8787';

const CIRCUIT = {
  scope: 'active-circuit',
  version: 'v1',
  circuitId: 'smoke-verify-001',
  gates: [],
  connections: [],
  nodes: [],
  selectedElementIds: [],
};

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✓ ${label}`);
  passed++;
}

function fail(label, detail) {
  console.log(`  ✗ ${label}`);
  if (detail) console.log(`    → ${detail}`);
  failed++;
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text };
}

// ── Schritt 1: Session registrieren ─────────────────────────────────────────

console.log('\n── Schritt 1: Session registrieren');
const reg = await post('/v1/session/key', { apiKey: 'sk-smoke-verify-live-test-key-99' });

if ((reg.status === 200 || reg.status === 201) && reg.json?.sessionId) {
  ok(`Session erstellt (${reg.json.sessionId})`);
} else {
  fail('Session-Registrierung fehlgeschlagen', `HTTP ${reg.status}: ${reg.text}`);
  console.log('\nAbbruch – kein gültiger Session-Context.');
  process.exit(1);
}

const SESSION_ID = reg.json.sessionId;

// ── H2: Model-Lock ────────────────────────────────────────────────────────────

console.log('\n── H2 Model-Lock: Request mit model-Feld muss 400 zurückgeben');

const h2a = await post('/v1/chat/request', {
  sessionId: SESSION_ID,
  message: 'Erkläre die Schaltung.',
  circuitContext: CIRCUIT,
  model: 'gpt-4o',                          // unbekanntes Feld → strict() ablehnen
});
h2a.status === 400
  ? ok(`model:"gpt-4o" → HTTP ${h2a.status} (erwartet 400)`)
  : fail(`model:"gpt-4o" → HTTP ${h2a.status} (erwartet 400)`, h2a.text);

const h2b = await post('/v1/chat/request', {
  sessionId: SESSION_ID,
  message: 'Erkläre die Schaltung.',
  circuitContext: CIRCUIT,
  model: 'claude-opus-4-6',
});
h2b.status === 400
  ? ok(`model:"claude-opus-4-6" → HTTP ${h2b.status} (erwartet 400)`)
  : fail(`model:"claude-opus-4-6" → HTTP ${h2b.status} (erwartet 400)`, h2b.text);

// ── H1: Prompt-Limit ──────────────────────────────────────────────────────────

console.log('\n── H1 Prompt-Limit: Prompt > 32 KB muss 400 zurückgeben');

// Maximale Nachricht (20 000 Zeichen) + großer circuit-context mit vielen Gates
// → zusammen überschreitet der renderedPrompt 32 768 Bytes
const LARGE_MESSAGE = 'A'.repeat(20_000);
const MANY_GATES = Array.from({ length: 80 }, (_, i) => ({
  id: `gate-${i.toString().padStart(3, '0')}`,
  type: 'AND',
  label: `Gate-${i}-label-mit-langem-namen`,
  inputs: [
    { gateId: `in-${i}-a`, port: 'input_0' },
    { gateId: `in-${i}-b`, port: 'input_1' },
  ],
  outputs: [{ gateId: `out-${i}`, port: 'output_0' }],
}));

const h1 = await post('/v1/chat/request', {
  sessionId: SESSION_ID,
  message: LARGE_MESSAGE,
  circuitContext: { ...CIRCUIT, gates: MANY_GATES },
});
h1.status === 400
  ? ok(`Großer Prompt → HTTP ${h1.status} (erwartet 400), code="${h1.json?.error?.code}"`)
  : fail(`Großer Prompt → HTTP ${h1.status} (erwartet 400)`, h1.text.slice(0, 200));

// ── Normaler Request (noop-Modus) ─────────────────────────────────────────────

console.log('\n── Normaler Request: Muss 200 mit stubbed-Antwort zurückgeben');

const normal = await post('/v1/chat/request', {
  sessionId: SESSION_ID,
  message: 'Was macht dieses AND-Gatter?',
  circuitContext: CIRCUIT,
});
// Noop-Broker antwortet mit 202 Accepted (kein echter Provider-Call)
const normal_ok = normal.status === 200 || normal.status === 202;
normal_ok
  ? ok(`Normaler Request → HTTP ${normal.status}, message="${normal.json?.message?.slice(0, 60)}…"`)
  : fail(`Normaler Request → HTTP ${normal.status}`, normal.text.slice(0, 200));

// ── H5: dispatchMode ──────────────────────────────────────────────────────────

console.log('\n── H5 dispatchMode: "disconnected" darf nicht vorkommen, "noop" muss im Log stehen');

// dispatchMode=noop wird vom Broker geloggt wenn der NoopProviderClient aktiv ist.
// 'disconnected' war der alte, irreführende Fallback-Wert – darf nie wieder auftauchen.
const { readFileSync } = await import('node:fs');
const log_raw = readFileSync('/tmp/broker-smoke.log', 'utf8');

!log_raw.includes('disconnected')
  ? ok('"disconnected" nicht im Broker-Log (H5 bereinigt)')
  : fail('"disconnected" erscheint im Broker-Log – H5 unvollständig');

log_raw.includes('"noop"') || log_raw.includes("'noop'") || log_raw.includes('noop-provider-client')
  ? ok('"noop" im Broker-Log gefunden (dispatchMode korrekt)')
  : fail('"noop" fehlt im Broker-Log – läuft Broker wirklich im noop-Modus?');

// ── Zusammenfassung ───────────────────────────────────────────────────────────

console.log(`\n── Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen\n`);
process.exit(failed > 0 ? 1 : 0);
