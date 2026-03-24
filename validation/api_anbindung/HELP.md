# HELP

## Launcher starten (empfohlen)

Startet eine Web-Oberflaeche auf `http://localhost:4321` mit Buttons fuer App und Broker:

```bash
cd ~/projects/uni/logic-gate-simulator
node launcher.mjs        # oder: npm run launch
```

Alternativ per Doppelklick:

- `Start Launcher.bat` – Windows (WSL-Detection + nativer Node-Fallback)
- `Start Launcher.command` – macOS (Finder-Doppelklick)
- `start-launcher.sh` – Linux

## Dev-App mit Broker-UI starten

Im Repo-Root:

```bash
cd ~/projects/uni/logic-gate-simulator
npm run dev
```

## Backend-Sandbox starten

Im Sandbox-Ordner:

```bash
cd ~/projects/uni/logic-gate-simulator/validation/api_anbindung/backend-sandbox
npm run dev
```

## Backend-Sandbox mit kuenstlicher Dev-Latenz starten

Fuer manuelle Broker-UI-Checks zu schnellen `connecting`-/`sending`-/`resetting`-
Phasen kann die Sandbox bewusst verzoegert gestartet werden:

```bash
cd ~/projects/uni/logic-gate-simulator/validation/api_anbindung/backend-sandbox
DEV_RESPONSE_DELAY_MS=400 npm run dev
```

Die Verzoegerung gilt nur fuer Broker-Routen unter `/v1/`, nicht fuer
`/health` oder `/ready`.

## Backend-Sandbox im ersten Staging-Profil starten

Fuer den ersten `API1-02`-Staging-Slice kann die Sandbox mit explizitem
Umgebungsprofil und erlaubter Frontend-Origin gestartet werden:

```bash
cd ~/projects/uni/logic-gate-simulator/validation/api_anbindung/backend-sandbox
APP_ENV=staging ALLOWED_ORIGINS=https://staging.logic-simulator.example npm run dev
```

In diesem Profil gelten bereits die ersten Staging-Guardrails:

- `ALLOWED_ORIGINS` ist Pflicht
- Dev-only-Routen wie `/v1/dev/provider-fault` sind deaktiviert
- kuenstliche Dev-Latenz wird nicht mehr auf Broker-Routen angewendet
- `/health` und `/ready` spiegeln `environment` und `devEndpointsEnabled`

## Backend-Sandbox staging-lokal starten

Fuer den deploy-nahen lokalen Staging-Pfad gibt es jetzt einen festen
Startbefehl ohne manuell vorgelagerte Env-Zeile:

```bash
cd ~/projects/uni/logic-gate-simulator/validation/api_anbindung/backend-sandbox
npm run dev:staging-local
```

Standardmaessig verwendet dieser Pfad:

- `APP_ENV=staging`
- `HOST=127.0.0.1`
- `PORT=8787`
- `ALLOWED_ORIGINS=https://staging.logic-simulator.example`

Optional koennen `STAGING_HOST`, `STAGING_PORT`,
`STAGING_ALLOWED_ORIGIN` oder `ALLOWED_ORIGINS` ueber die Umgebung
ueberschrieben werden.

## Backend-Sandbox-Staging-Profil-Smoke ausfuehren

```bash
cd ~/projects/uni/logic-gate-simulator/validation/api_anbindung/backend-sandbox
npm run smoke:staging-profile
```

Der Smoke deckt den ersten Staging-Baseline-Check ab:

- `APP_ENV=staging` braucht explizite `ALLOWED_ORIGINS`
- `/health` und `/ready` zeigen Staging-Metadaten
- die konfigurierte Staging-Origin wird per CORS akzeptiert
- alte lokale Dev-Origins werden ohne Freigabe nicht mehr angenommen
- `/v1/dev/provider-fault` ist in Staging nicht verfuegbar

## Backend-Sandbox-Staging-Runtime-Smoke ausfuehren

Dieser Lauf startet zusaetzlich selbst eine staging-lokale Sandbox-Runtime,
wartet auf `/ready` und fuehrt danach den URL-Smoke gegen dieselbe Runtime aus:

```bash
cd ~/projects/uni/logic-gate-simulator/validation/api_anbindung/backend-sandbox
npm run smoke:staging-runtime
```

Der Lauf bestaetigt aktuell:

- staging-lokalen Start mit fester URL-/Origin-Konfiguration
- `/health` und `/ready` sind erreichbar und tragen Staging-Metadaten
- die konfigurierte Staging-Origin wird per CORS akzeptiert
- `/v1/dev/provider-fault` bleibt deaktiviert

## Backend-Sandbox-Staging-URL-Smoke gegen ein Zielsystem ausfuehren

Wenn bereits eine staging-aehnliche Sandbox-Runtime laeuft, kann dieselbe
URL-Pruefung auch direkt gegen das Zielsystem ausgefuehrt werden:

```bash
cd ~/projects/uni/logic-gate-simulator/validation/api_anbindung/backend-sandbox
npm run smoke:staging-url
```

Optional koennen Ziel-URL und erlaubte Origin ueberschrieben werden:

```bash
cd ~/projects/uni/logic-gate-simulator/validation/api_anbindung/backend-sandbox
STAGING_BASE_URL=http://127.0.0.1:8787 STAGING_ALLOWED_ORIGIN=https://staging.logic-simulator.example npm run smoke:staging-url
```

## Render-Blueprint fuer das erste externe Staging-Ziel

Im Repo-Root liegt jetzt ein Render-Blueprint:

```bash
cd ~/projects/uni/logic-gate-simulator
ls render.yaml
```

Sobald dieser Stand gepusht ist, kann die Blueprint-Erstellung ueber den in
[`render-staging.md`](/home/p-keminer/projects/uni/logic-gate-simulator/validation/api_anbindung/deployment/render-staging.md)
dokumentierten Link gestartet werden.

## Live-Haertungsverifikation ausfuehren (API1-05 H1–H5)

Startet den Broker automatisch im `noop`-Modus und prueft alle fuenf Haertungsmassnahmen live:

```bash
cd ~/projects/uni/logic-gate-simulator/validation/api_anbindung/backend-sandbox
bash run-smoke-verify.sh
```

Deckt ab: Prompt-Groessenlimit 32 KB (H1), Model-Lock (H2), normaler noop-Request (H3-Basis), dispatchMode-Bereinigung (H5).

Alternativ manuell gegen einen bereits laufenden Broker:

```bash
cd ~/projects/uni/logic-gate-simulator/validation/api_anbindung/backend-sandbox
node smoke-verify.mjs
```

Hinweis: `PROVIDER=noop npm run dev` ueberschreibt den Wert aus `.env`, weil Node.js `--env-file` keine bereits gesetzten Umgebungsvariablen ueberschreibt.

## Lokalen Broker-UI-Smoke ausfuehren

Wenn App und Sandbox bereits laufen:

```bash
cd ~/projects/uni/logic-gate-simulator
npm run broker:smoke
```

Optional koennen Ziel-URLs und Test-Key ueber Env-Variablen ueberschrieben
werden:

```bash
cd ~/projects/uni/logic-gate-simulator
LOGICSIM_BASE_URL=http://127.0.0.1:5173 BROKER_BASE_URL=http://127.0.0.1:8787 BROKER_TEST_API_KEY=sk-broker-test-1234567890 npm run broker:smoke
```

## Lokalen Broker-UI-Recovery-Smoke ausfuehren

Wenn App und Sandbox bereits laufen:

```bash
cd ~/projects/uni/logic-gate-simulator
npm run broker:smoke:recovery
```

Dieser Lauf deckt den lokalen stale-Session-Recovery-Pfad ab:

- Session aufbauen
- Chat senden
- Session extern invalidieren
- sichtbaren Session-Fallback pruefen
- neu verbinden
- Chat erneut erfolgreich senden
- Session wieder loeschen

## Lokalen Broker-UI-Rate-Limit-Smoke ausfuehren

Wenn App und Sandbox bereits laufen:

```bash
cd ~/projects/uni/logic-gate-simulator
npm run broker:smoke:rate-limit
```

Dieser Lauf deckt den sichtbaren Session-Key-Rate-Limit-Pfad ab:

- mehrfach lokal verbinden und wieder loeschen
- Session-Key-Limit bewusst erreichen
- sichtbaren Key-Limit-Fehler pruefen
- sichtbaren Cooldown-Button `Warte Ns` pruefen

## Lokalen Broker-UI-Chat-Limit-Smoke ausfuehren

Wenn App und Sandbox bereits laufen:

```bash
cd ~/projects/uni/logic-gate-simulator
npm run broker:smoke:chat-rate-limit
```

Dieser Lauf deckt den sichtbaren Chat-Rate-Limit-Pfad ab:

- Session aufbauen
- mehrfach Chat senden
- sichtbares Chat-Limit bewusst erreichen
- sichtbaren Cooldown-Button `Sende in Ns` pruefen
- Session wieder loeschen

## Lokalen Broker-UI-Reset-Limit-Smoke ausfuehren

Wenn App und Sandbox bereits laufen:

```bash
cd ~/projects/uni/logic-gate-simulator
npm run broker:smoke:reset-rate-limit
```

Dieser Lauf deckt den sichtbaren Reset-Rate-Limit-Pfad ab:

- Session aufbauen
- einmal Chat senden
- mehrfach resetten
- sichtbares Reset-Limit bewusst erreichen
- sichtbaren Cooldown-Button `Reset in Ns` pruefen
- Session wieder loeschen

## Lokalen Broker-UI-Konfigurationsfehler-Smoke ausfuehren

Wenn App und Sandbox bereits laufen:

```bash
cd ~/projects/uni/logic-gate-simulator
npm run broker:smoke:config-error
```

Dieser Lauf deckt einen sichtbaren lokalen Konfigurationsfehler plus Recovery ab:

- ungueltige Broker-Base-URL setzen
- sichtbaren Konfigurationsfehler pruefen
- bestaetigen, dass dabei kein Broker-Request rausgeht
- auf gueltige Base-URL korrigieren
- normal verbinden und wieder loeschen

## Lokalen Broker-UI-Policy-Block-Smoke ausfuehren

Wenn App und Sandbox bereits laufen:

```bash
cd ~/projects/uni/logic-gate-simulator
npm run broker:smoke:policy-block
```

Dieser Lauf deckt einen sichtbaren Chat-Ablehnungsfall durch Sandbox-Policy ab:

- Session aufbauen
- bewusst geblockte Chat-Nachricht senden
- sichtbaren Ablehnungsfehler pruefen
- danach mit gueltiger Nachricht auf derselben Session erfolgreich recovern
- Session wieder loeschen

## Lokalen Broker-UI-Provider-Fehler-Smoke ausfuehren

Wenn App und Sandbox bereits laufen:

```bash
cd ~/projects/uni/logic-gate-simulator
npm run broker:smoke:provider-error
```

Dieser Lauf deckt einen sichtbaren Upstream-/Provider-Ausfall mit Recovery ab:

- Session aufbauen
- einen einmaligen simulierten Provider-Ausfall in der Sandbox aktivieren
- sichtbaren Chat-Fehler fuer den Provider-Ausfall pruefen
- bestaetigen, dass die Session aktiv bleibt
- danach mit einer gueltigen Chat-Nachricht auf derselben Session erfolgreich recovern
- Session wieder loeschen
