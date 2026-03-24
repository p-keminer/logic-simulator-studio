// launcher.mjs – Logic Simulator Studio Launcher
// Startet eine lokale Web-Oberfläche zum bequemen Starten von App und Broker.
// Keine externen Abhängigkeiten – nur Node.js built-ins (http, child_process, path, url, os).
//
// Verwendung:
//   node launcher.mjs          (oder: npm run launch)
//
// Öffnet automatisch http://localhost:4321 im Standardbrowser.

import { createServer } from 'node:http';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { platform } from 'node:os';
import { existsSync, copyFileSync } from 'node:fs';

// ── Konfiguration ────────────────────────────────────────────────────────────

const LAUNCHER_PORT = 4321;
const APP_PORT      = 5173;
const BROKER_PORT   = 8787;
const MAX_LOG_LINES = 300;

const __dirname   = dirname(fileURLToPath(import.meta.url));
const BROKER_DIR  = join(__dirname, 'validation', 'api_anbindung', 'backend-sandbox');

const IS_WIN = platform() === 'win32';
// npm heißt auf Windows npm.cmd
const NPM = IS_WIN ? 'npm.cmd' : 'npm';

// ── Interner Zustand ─────────────────────────────────────────────────────────

// Zustand pro Service: 'stopped' | 'starting' | 'running' | 'stopping'
const state = {
  app:    { proc: null, logs: [], status: 'stopped' },
  broker: { proc: null, logs: [], status: 'stopped' },
};

// Aktive SSE-Verbindungen je Service (für Live-Log-Streaming)
const sse = { app: new Set(), broker: new Set() };

// ── Log-Verwaltung ───────────────────────────────────────────────────────────

function pushLog(service, text) {
  // Mehrzeilige Ausgaben zeilenweise verteilen
  const lines = text.toString().split('\n').filter((l) => l.trim().length > 0);
  for (const line of lines) {
    state[service].logs.push(line);
    if (state[service].logs.length > MAX_LOG_LINES) {
      state[service].logs.shift();
    }
    // An alle aktiven SSE-Clients senden
    for (const client of sse[service]) {
      client.write(`data: ${JSON.stringify(line)}\n\n`);
    }
  }
}

// ── Prozess-Management ───────────────────────────────────────────────────────

function startProcess(service) {
  // Doppelstart verhindern
  if (state[service].proc) return;

  const is_app = service === 'app';
  const cwd    = is_app ? __dirname : BROKER_DIR;

  state[service].status = 'starting';
  pushLog(service, `[launcher] Starte ${service === 'app' ? 'Frontend-App' : 'KI-Broker'}…`);

  // Broker: .env aus .env.example erstellen falls fehlend
  if (!is_app) {
    const env_path     = join(BROKER_DIR, '.env');
    const example_path = join(BROKER_DIR, '.env.example');
    if (!existsSync(env_path) && existsSync(example_path)) {
      copyFileSync(example_path, env_path);
      pushLog(service, '[launcher] .env aus .env.example erstellt – API-Keys ggf. anpassen.');
    } else if (!existsSync(env_path)) {
      pushLog(service, '[launcher] WARNUNG: .env fehlt und keine .env.example vorhanden.');
    }
  }

  // Auf Windows: .cmd-Dateien benoetigen shell: true.
  // Um die Node-24-Warnung DEP0190 (Array-Args + shell) zu vermeiden,
  // wird der Befehl als einzelner String uebergeben.
  const proc = IS_WIN
    ? spawn(`${NPM} run dev`, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: true })
    : spawn(NPM, ['run', 'dev'], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });

  state[service].proc = proc;

  const onData = (data) => {
    const text = data.toString();
    pushLog(service, text);

    // Bereit-Erkennung: Prozess meldet sich auf seinem Port.
    // ANSI-Farbcodes entfernen, damit Pattern-Matching zuverlaessig greift
    // (Vite gibt z.B. \x1b[1mLocal\x1b[22m: aus → "Local:" ohne Strip unsichtbar).
    if (state[service].status === 'starting') {
      const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
      const ready = is_app
        ? clean.includes('Local:') || clean.includes(':' + APP_PORT)
        : clean.includes(':' + BROKER_PORT) || clean.includes('listening') || clean.includes('Server listening');
      if (ready) state[service].status = 'running';
    }
  };

  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData);   // Vite schreibt Bereit-Meldung auf stderr

  proc.on('exit', (code) => {
    pushLog(service, `[launcher] Prozess beendet (exit ${code ?? 'signal'})`);
    state[service].proc   = null;
    state[service].status = 'stopped';
  });

  proc.on('error', (err) => {
    pushLog(service, `[launcher] Fehler beim Starten: ${err.message}`);
    state[service].proc   = null;
    state[service].status = 'stopped';
  });
}

function stopProcess(service) {
  const proc = state[service].proc;
  if (!proc) return;

  pushLog(service, '[launcher] Prozess wird gestoppt…');
  state[service].status = 'stopping';
  proc.kill('SIGTERM');

  // Erzwinge Kill nach 4 Sekunden falls SIGTERM ignoriert wird
  setTimeout(() => {
    if (state[service].proc === proc) {
      proc.kill('SIGKILL');
    }
  }, 4_000);
}

// ── Browser öffnen ───────────────────────────────────────────────────────────

function openBrowser(url) {
  try {
    const cmd = platform() === 'win32' ? 'start ""'
              : platform() === 'darwin' ? 'open'
              : 'xdg-open';
    execSync(`${cmd} ${url}`, { stdio: 'ignore' });
  } catch {
    // Kein Browser verfügbar – URL wurde bereits auf der Konsole ausgegeben
  }
}

// ── HTTP-Hilfsfunktionen ─────────────────────────────────────────────────────

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ── HTTP-Server ──────────────────────────────────────────────────────────────

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${LAUNCHER_PORT}`);

  // GET /api/status – aktueller Zustand beider Services
  if (req.method === 'GET' && pathname === '/api/status') {
    return json(res, { app: state.app.status, broker: state.broker.status });
  }

  // POST /api/<service>/<start|stop>
  if (req.method === 'POST') {
    const match = pathname.match(/^\/api\/(app|broker)\/(start|stop)$/);
    if (match) {
      const [, service, action] = match;
      action === 'start' ? startProcess(service) : stopProcess(service);
      return json(res, { ok: true });
    }
  }

  // GET /api/logs/<service> – SSE-Stream für Live-Logs
  if (req.method === 'GET') {
    const log_match = pathname.match(/^\/api\/logs\/(app|broker)$/);
    if (log_match) {
      const service = log_match[1];
      res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      });
      // Vorhandene Logs sofort schicken (damit Browser nach Reload nicht leer startet)
      for (const line of state[service].logs) {
        res.write(`data: ${JSON.stringify(line)}\n\n`);
      }
      sse[service].add(res);
      req.on('close', () => sse[service].delete(res));
      return;
    }
  }

  // GET / – HTML-Dashboard ausliefern
  if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(HTML);
  }

  res.writeHead(404);
  res.end('Not found');
});

// ── HTML-Dashboard ───────────────────────────────────────────────────────────

const HTML = /* html */`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Logic Simulator Studio – Launcher</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:         #0d1117;
      --surface:    #161b22;
      --border:     #30363d;
      --text:       #c9d1d9;
      --muted:      #8b949e;
      --green:      #3fb950;
      --orange:     #d29922;
      --red:        #f85149;
      --blue:       #58a6ff;
      --btn-bg:     #21262d;
      --btn-hover:  #30363d;
      --radius:     8px;
      --font-mono:  'Cascadia Code', 'Fira Mono', 'Consolas', monospace;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif;
      min-height: 100vh;
      padding: 2.5rem 1.25rem;
    }
    header {
      text-align: center;
      margin-bottom: 2.5rem;
    }
    header h1 { font-size: 1.6rem; font-weight: 700; color: #fff; }
    header p  { color: var(--muted); margin-top: .4rem; font-size: .875rem; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 1.25rem;
      max-width: 860px;
      margin: 0 auto 1.5rem;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: .9rem;
    }

    /* Karten-Kopfzeile */
    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-title {
      font-size: 1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: .55rem;
    }
    .dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      background: var(--border);
      flex-shrink: 0;
      transition: background .3s, box-shadow .3s;
    }
    .dot.running  { background: var(--green);  box-shadow: 0 0 7px var(--green); }
    .dot.starting { background: var(--orange); }
    .dot.stopping { background: var(--red);    }
    .port-badge {
      font-size: .72rem;
      color: var(--muted);
      background: var(--btn-bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: .15em .5em;
      font-family: var(--font-mono);
    }

    /* Status-Text unter dem Titel */
    .status-label {
      font-size: .78rem;
      color: var(--muted);
      transition: color .3s;
    }
    .status-label.running  { color: var(--green);  }
    .status-label.starting { color: var(--orange); }
    .status-label.stopping { color: var(--red);    }

    /* Buttons */
    .actions { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
    button {
      font-size: .82rem;
      font-family: inherit;
      cursor: pointer;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: .38em .85em;
      background: var(--btn-bg);
      color: var(--text);
      transition: background .15s, opacity .15s;
      white-space: nowrap;
    }
    button:hover:not(:disabled)  { background: var(--btn-hover); }
    button:disabled               { opacity: .35; cursor: default; }
    .btn-start { background: #1a4b28; border-color: #2ea043; color: #fff; }
    .btn-start:hover:not(:disabled) { background: #215432; }
    .btn-stop  { background: #4a1515; border-color: #f85149; color: #fff; }
    .btn-stop:hover:not(:disabled)  { background: #5e1a1a; }
    .open-link {
      font-size: .78rem;
      color: var(--blue);
      text-decoration: none;
      white-space: nowrap;
    }
    .open-link:hover { text-decoration: underline; }

    /* Log-Box */
    .log-box {
      background: #010409;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      height: 200px;
      overflow-y: auto;
      padding: .6rem .8rem;
      font-family: var(--font-mono);
      font-size: .73rem;
      line-height: 1.55;
    }
    .log-box .line           { color: var(--muted); white-space: pre-wrap; word-break: break-all; }
    .log-box .line.launcher  { color: var(--blue);  }
    .log-box .line.warn      { color: var(--orange); }
    .log-box .line.error     { color: var(--red);   }
    .log-box .line.ok        { color: var(--green);  }

    /* Beides-Karte */
    .both-card {
      max-width: 860px;
      margin: 0 auto 2.5rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: .75rem;
    }
    .both-card span { color: var(--muted); font-size: .875rem; }
    .both-actions   { display: flex; gap: .5rem; }

    footer {
      text-align: center;
      color: #484f58;
      font-size: .72rem;
    }
  </style>
</head>
<body>

<header>
  <h1>⚡ Logic Simulator Studio</h1>
  <p>Lokaler Launcher &ndash; startet App und Broker auf deinem Rechner</p>
</header>

<div class="grid">

  <!-- ── Frontend App ──────────────────────────────────────────────────── -->
  <div class="card">
    <div class="card-head">
      <div class="card-title">
        <div class="dot" id="dot-app"></div>
        Frontend App
      </div>
      <span class="port-badge">localhost:${APP_PORT}</span>
    </div>

    <small class="status-label" id="status-app">gestoppt</small>

    <div class="actions">
      <button class="btn-start" id="btn-start-app" onclick="api('app','start')">▶ Starten</button>
      <button class="btn-stop"  id="btn-stop-app"  onclick="api('app','stop')" disabled>■ Stoppen</button>
      <a class="open-link" id="link-app" href="http://localhost:${APP_PORT}" target="_blank" style="display:none">
        Im Browser öffnen ↗
      </a>
    </div>

    <div class="log-box" id="log-app">
      <div class="line launcher">[launcher] Bereit – klicke Starten.</div>
    </div>
  </div>

  <!-- ── KI-Broker ─────────────────────────────────────────────────────── -->
  <div class="card">
    <div class="card-head">
      <div class="card-title">
        <div class="dot" id="dot-broker"></div>
        KI-Broker (Backend)
      </div>
      <span class="port-badge">localhost:${BROKER_PORT}</span>
    </div>

    <small class="status-label" id="status-broker">gestoppt</small>

    <div class="actions">
      <button class="btn-start" id="btn-start-broker" onclick="api('broker','start')">▶ Starten</button>
      <button class="btn-stop"  id="btn-stop-broker"  onclick="api('broker','stop')" disabled>■ Stoppen</button>
      <a class="open-link" id="link-broker" href="http://localhost:${BROKER_PORT}/health" target="_blank" style="display:none">
        Health-Check ↗
      </a>
    </div>

    <div class="log-box" id="log-broker">
      <div class="line launcher">[launcher] Bereit – klicke Starten.</div>
    </div>
  </div>

</div>

<!-- ── Beides gleichzeitig ───────────────────────────────────────────────── -->
<div class="both-card">
  <span>App + Broker gleichzeitig starten</span>
  <div class="both-actions">
    <button class="btn-start" onclick="both('start')">⚡ Beides starten</button>
    <button class="btn-stop"  onclick="both('stop')">■ Alles stoppen</button>
  </div>
</div>

<footer>Launcher läuft auf Port ${LAUNCHER_PORT} &nbsp;·&nbsp; Strg+C im Terminal beendet alles sauber</footer>

<script>
  const STATUS_LABEL = {
    stopped:  'gestoppt',
    starting: 'wird gestartet\u2026',
    running:  'l\u00e4uft',
    stopping: 'wird gestoppt\u2026',
  };

  // ── SSE-Log-Streams ──────────────────────────────────────────────────────

  function connectLogs(svc) {
    const es = new EventSource('/api/logs/' + svc);
    es.onmessage = (e) => appendLog(svc, JSON.parse(e.data));
    es.onerror   = () => { es.close(); setTimeout(() => connectLogs(svc), 3000); };
  }

  function appendLog(svc, line) {
    const box = document.getElementById('log-' + svc);
    const div = document.createElement('div');
    div.className = 'line';
    if (line.startsWith('[launcher]'))            div.classList.add('launcher');
    else if (/error|fehler/i.test(line))          div.classList.add('error');
    else if (/warn/i.test(line))                  div.classList.add('warn');
    else if (/ready|listen|started|local:/i.test(line)) div.classList.add('ok');
    div.textContent = line;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  connectLogs('app');
  connectLogs('broker');

  // ── Status-Polling ───────────────────────────────────────────────────────

  async function pollStatus() {
    try {
      const { app, broker } = await fetch('/api/status').then(r => r.json());
      updateUI('app', app);
      updateUI('broker', broker);
    } catch {}
  }

  function updateUI(svc, status) {
    const dot      = document.getElementById('dot-'        + svc);
    const label    = document.getElementById('status-'     + svc);
    const btnStart = document.getElementById('btn-start-'  + svc);
    const btnStop  = document.getElementById('btn-stop-'   + svc);
    const link     = document.getElementById('link-'       + svc);

    dot.className   = 'dot ' + status;
    label.className = 'status-label ' + status;
    label.textContent = STATUS_LABEL[status] || status;

    btnStart.disabled = status !== 'stopped';
    btnStop.disabled  = status === 'stopped' || status === 'stopping';
    link.style.display = status === 'running' ? 'inline' : 'none';
  }

  setInterval(pollStatus, 1500);
  pollStatus();

  // ── API-Aufrufe ──────────────────────────────────────────────────────────

  async function api(svc, action) {
    await fetch('/api/' + svc + '/' + action, { method: 'POST' });
    pollStatus();
  }

  function both(action) {
    api('app',    action);
    api('broker', action);
  }
</script>
</body>
</html>`;

// ── Server starten ────────────────────────────────────────────────────────────

server.listen(LAUNCHER_PORT, '127.0.0.1', () => {
  const url = `http://localhost:${LAUNCHER_PORT}`;
  console.log('\n\x1b[33m⚡ Logic Simulator Studio – Launcher\x1b[0m');
  console.log(`   Web-Oberfläche: \x1b[36m${url}\x1b[0m`);
  console.log('   Strg+C beendet alle Prozesse sauber.\n');
  openBrowser(url);
});

// ── Cleanup bei SIGINT/SIGTERM ────────────────────────────────────────────────

function shutdown() {
  console.log('\n[launcher] Beende alle Prozesse…');
  stopProcess('app');
  stopProcess('broker');
  setTimeout(() => process.exit(0), 500);
}
process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);
