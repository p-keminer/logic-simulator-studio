<a id="top"></a>

<div align="center">

[![Deutsch](https://img.shields.io/badge/🇩🇪_Deutsch-24292f?style=for-the-badge)](#deutsch)
[![English](https://img.shields.io/badge/🇬🇧_English-24292f?style=for-the-badge)](#english)

</div>

---

<a id="deutsch"></a>

# Broker

Optionaler, lokal oder selbst gehostet betriebener KI-Dienst für Logic
Simulator Studio. Der Broker verwaltet kurzlebige Sitzungen, reduziert den
Kontext der geöffneten Schaltung, prüft Anfragen und leitet sie an den
konfigurierten Provider weiter.

<div align="center">

[![Grenzen](https://img.shields.io/badge/Grenzen-24292f?style=for-the-badge)](#de-grenzen)
[![Start](https://img.shields.io/badge/Start-24292f?style=for-the-badge)](#de-start)
[![Konfiguration](https://img.shields.io/badge/Konfiguration-24292f?style=for-the-badge)](#de-konfiguration)
[![Prüfen](https://img.shields.io/badge/Pr%C3%BCfen-24292f?style=for-the-badge)](#de-pruefen)

</div>

<a id="de-grenzen"></a>

## Grenzen

| Bereich | Verhalten |
|---|---|
| API-Key | wird im Frontend eingegeben, nur an die laufende Sitzung gebunden und weder protokolliert noch gespeichert |
| Zustand | Sitzungen, Schlüsselreferenzen, Verläufe, Auditdaten und Metriken liegen begrenzt im Arbeitsspeicher des Prozesses |
| Provider | `noop`, Anthropic oder OpenAI-kompatible API hinter einer Host-Allowlist |
| Schaltung | nur der validierte und reduzierte Kontext der geöffneten Schaltung |
| App-Bridge | optional, standardmäßig aus und nur mit aktiver Sitzung nutzbar |
| Datei-Adapter | liest JSON-Snapshots ausschließlich innerhalb von `broker/`; auch Symlink- und Junction-Ausbrüche werden blockiert |

Ein Neustart verwirft alle flüchtigen Broker-Daten. Logs enthalten nur
reduzierte Metadaten und Korrelations-IDs, keine Schlüssel, vollständigen
Prompts, Snapshot-Inhalte oder absoluten Pfade.

<a id="de-start"></a>

## Start

Voraussetzung ist Node.js `^22.13` oder `>=24`; Node.js 24 wird empfohlen.

```bash
cd broker
npm ci
cp .env.example .env
npm run dev
```

Unter Windows öffnet `Start Launcher.bat` die lokale Launcher-Oberfläche. App
und Broker werden dort getrennt gestartet; bei Bedarf entsteht `broker/.env`
aus der Beispieldatei. Die sichere Standardkonfiguration verwendet den Provider
`noop`.

<a id="de-konfiguration"></a>

## Konfiguration

Server, erlaubte Browser-Origins, Provider und Modell werden in `.env`
konfiguriert. Für `APP_ENV=production` muss `ALLOWED_ORIGINS` explizit gesetzt
sein. Der persönliche API-Key gehört nicht in diese Datei.

| Grenze | Standard |
|---|---:|
| Rate-Limit-Buckets | `RATE_LIMIT_MAX_BUCKETS=10000` |
| Sitzungen und Schlüsselreferenzen | `SESSION_STORE_MAX_RECORDS=1024` |
| Aufbewahrung inaktiver Sitzungen | `SESSION_STORE_INACTIVE_RETENTION_SECONDS=3600` |
| Konversationen | `CONVERSATION_STORE_MAX_RECORDS=256` |
| Inhalt je Konversation | 32 Turns und `CONVERSATION_MAX_STORED_BYTES=262144` |
| Inaktivitätslimit je Konversation | `CONVERSATION_IDLE_TTL_SECONDS=3600` |
| Audit-Ereignisse | `AUDIT_STORE_MAX_EVENTS=2048`, Aufbewahrung `86400` Sekunden |
| Metriken | `512` Serien, `2048` Werte, Aufbewahrung `3600` Sekunden |

Abgelaufene Einträge werden entfernt; bei voller Kapazität verdrängen die
Stores Einträge deterministisch. Ungültige oder nicht positive Grenzwerte
verhindern den Start.

<a id="de-pruefen"></a>

## Prüfen und bauen

```bash
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
```

Der Build unter `dist/` enthält nur Code aus `src/`. Ein Container wird aus dem
Repository-Root gebaut:

```bash
docker build -t logic-simulator-broker ./broker
docker run --rm -p 127.0.0.1:8787:8787 --env-file broker/.env -e HOST=0.0.0.0 logic-simulator-broker
```

Die API- und Sicherheitsprüfungen sind unter
[`validation/api_anbindung/`](../validation/api_anbindung/) dokumentiert.

[![Nach oben](https://img.shields.io/badge/Nach_oben-24292f?style=for-the-badge)](#top)

---

<a id="english"></a>

# Broker

Optional AI service for Logic Simulator Studio, intended for local or explicit
self-hosting. It manages short-lived sessions, reduces the open circuit's
context, validates requests, and forwards them to the configured provider.

<div align="center">

[![Boundaries](https://img.shields.io/badge/Boundaries-24292f?style=for-the-badge)](#en-boundaries)
[![Start](https://img.shields.io/badge/Start-24292f?style=for-the-badge)](#en-start)
[![Configuration](https://img.shields.io/badge/Configuration-24292f?style=for-the-badge)](#en-configuration)
[![Checks](https://img.shields.io/badge/Checks-24292f?style=for-the-badge)](#en-checks)

</div>

<a id="en-boundaries"></a>

## Boundaries

| Area | Behaviour |
|---|---|
| API key | entered in the frontend, bound only to the active session, and never logged or persisted |
| State | sessions, key references, histories, audit data, and metrics are bounded in process memory |
| Provider | `noop`, Anthropic, or an OpenAI-compatible API behind a host allowlist |
| Circuit | only the validated and reduced context of the open circuit |
| App bridge | optional, disabled by default, and available only with an active session |
| File adapter | reads JSON snapshots only inside `broker/` and blocks symlink and junction escapes |

A restart discards all volatile broker data. Logs contain reduced metadata and
correlation IDs only, never keys, complete prompts, snapshot contents, or
absolute paths.

<a id="en-start"></a>

## Start

Node.js `^22.13` or `>=24` is required; Node.js 24 is recommended.

```bash
cd broker
npm ci
cp .env.example .env
npm run dev
```

On Windows, `Start Launcher.bat` opens the local launcher UI. The app and broker
are started separately there; `broker/.env` is created from the example when
needed. The safe default configuration uses the `noop` provider.

<a id="en-configuration"></a>

## Configuration

Configure the server, allowed browser origins, provider, and model in `.env`.
`ALLOWED_ORIGINS` is mandatory when `APP_ENV=production`. The personal API key
does not belong in this file.

| Boundary | Default |
|---|---:|
| Rate-limit buckets | `RATE_LIMIT_MAX_BUCKETS=10000` |
| Sessions and key references | `SESSION_STORE_MAX_RECORDS=1024` |
| Inactive-session retention | `SESSION_STORE_INACTIVE_RETENTION_SECONDS=3600` |
| Conversations | `CONVERSATION_STORE_MAX_RECORDS=256` |
| Content per conversation | 32 turns and `CONVERSATION_MAX_STORED_BYTES=262144` |
| Conversation idle limit | `CONVERSATION_IDLE_TTL_SECONDS=3600` |
| Audit events | `AUDIT_STORE_MAX_EVENTS=2048`, retained for `86400` seconds |
| Metrics | `512` series, `2048` samples, retained for `3600` seconds |

Expired entries are removed; full stores evict entries deterministically.
Invalid or non-positive boundaries prevent startup.

<a id="en-checks"></a>

## Check and build

```bash
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
```

The output under `dist/` contains code from `src/` only. Build the container
from the repository root:

```bash
docker build -t logic-simulator-broker ./broker
docker run --rm -p 127.0.0.1:8787:8787 --env-file broker/.env -e HOST=0.0.0.0 logic-simulator-broker
```

API and security checks are documented under
[`validation/api_anbindung/`](../validation/api_anbindung/README.md#english).

[![Back to top](https://img.shields.io/badge/Back_to_top-24292f?style=for-the-badge)](#top)
