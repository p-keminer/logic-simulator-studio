<a id="top"></a>

<div align="center">

[![Deutsch](https://img.shields.io/badge/🇩🇪_Deutsch-24292f?style=for-the-badge)](#deutsch)
[![English](https://img.shields.io/badge/🇬🇧_English-24292f?style=for-the-badge)](#english)

</div>

---

<a id="deutsch"></a>

# KI-Broker – Konfiguration und Datenfluss

Der KI-Broker ist ein optionaler lokaler Dienst für den Chat über die aktuell
geöffnete Schaltung. Simulation, Analyse, Speichern und Export funktionieren
vollständig ohne ihn.

<div align="center">

[![Überblick](https://img.shields.io/badge/%C3%9Cberblick-24292f?style=for-the-badge)](#de-ueberblick)
[![Start](https://img.shields.io/badge/Start-24292f?style=for-the-badge)](#de-start)
[![Provider](https://img.shields.io/badge/Provider-24292f?style=for-the-badge)](#de-provider)
[![Nutzung](https://img.shields.io/badge/Nutzung-24292f?style=for-the-badge)](#de-nutzung)
[![Daten & Keys](https://img.shields.io/badge/Daten_&_Keys-24292f?style=for-the-badge)](#de-daten)
[![Circuit Actions](https://img.shields.io/badge/Circuit_Actions-24292f?style=for-the-badge)](#de-actions)
[![Fehlerhilfe](https://img.shields.io/badge/Fehlerhilfe-24292f?style=for-the-badge)](#de-fehlerhilfe)

</div>

<a id="de-ueberblick"></a>

## Überblick

```text
Browser-App (:5173) -> lokaler Broker (127.0.0.1:8787) -> konfigurierter Provider
```

| Bereich | Stand |
|---|---|
| Aktiver Pfad | [`broker/`](broker/README.md) |
| Bind-Adresse | standardmäßig `127.0.0.1:8787` |
| App-Betrieb | ohne Broker vollständig nutzbar |
| Key | pro Sitzung im Arbeitsspeicher des Brokers |
| Provider | `noop`, `anthropic` oder `openai-compatible` |
| Circuit Actions | experimentell; Vorschau und Bestätigung vor jeder Ausführung |

Der lokale Broker ist kein Cloud-Dienst des Repositories. Ein externer
Provider bleibt jedoch ein externer Empfänger von Prompt, reduziertem
Schaltungskontext und API-Zugangsdaten.

<a id="de-start"></a>

## Start

Voraussetzung ist Node.js `^22.13` oder `>=24`; Node.js 24 wird empfohlen.

### Launcher

- **Windows:** `Start Launcher.bat` doppelklicken. Fehlende Abhängigkeiten
  werden installiert; App und Broker lassen sich anschließend getrennt starten.
- **Terminal:**

```bash
npm install
npm --prefix broker install
npm run launch
```

Gleichwertig startet `node launcher.mjs` denselben Launcher. Er öffnet
`http://localhost:4321`. Beim ersten Brokerstart wird
`broker/.env` aus [`broker/.env.example`](broker/.env.example) angelegt, falls
die Datei fehlt.

### Broker direkt

`broker/.env.example` einmal als `broker/.env` kopieren, dann:

```bash
npm --prefix broker install
npm --prefix broker run dev
```

Der Health-Endpunkt ist unter `http://127.0.0.1:8787/health` erreichbar.
`broker/.env` und echte Schlüssel dürfen nicht committed werden.

<a id="de-provider"></a>

## Provider konfigurieren

Der API-Key gehört **nicht** in `.env`. Die Datei wählt nur Client, Ziel und
Modell:

| Variable | Zweck |
|---|---|
| `PROVIDER` | `noop`, `anthropic` oder `openai-compatible` |
| `PROVIDER_BASE_URL` | Zielbasis für einen OpenAI-kompatiblen Dienst |
| `PROVIDER_DEFAULT_MODEL` | serverseitig festgelegte Modell-ID |
| `PROVIDER_TIMEOUT_MS` | Timeout pro Provider-Anfrage |
| `PROVIDER_MAX_ATTEMPTS` | begrenzte Wiederholungsversuche |
| `SESSION_TTL_SECONDS` | Lebensdauer der In-Memory-Sitzung; Standard 900 Sekunden |

### Anthropic

```ini
PROVIDER=anthropic
PROVIDER_DEFAULT_MODEL=<provider-supported-model>
```

### OpenAI-kompatibel

```ini
PROVIDER=openai-compatible
PROVIDER_BASE_URL=https://<provider-host>/<optional-api-prefix>
PROVIDER_DEFAULT_MODEL=<provider-model-id>
```

Hierzu zählen direkte OpenAI-kompatible APIs, externe Vermittler wie
OpenRouter und lokale kompatible Server. OpenRouter ist selbst ein externer
Drittanbieter; „lokaler Broker“ bedeutet deshalb nicht automatisch „keine
externen Daten“.

### Ohne externen Aufruf

```ini
PROVIDER=noop
```

`noop` prüft den lokalen Ablauf, sendet aber keine Anfrage an einen
KI-Provider. Bei einem lokal betriebenen OpenAI-kompatiblen Provider hängt die
Authentifizierung von dessen eigener Konfiguration ab; der aktuelle
Broker-Dialog erwartet weiterhin einen sitzungsgebundenen Key-Wert.

<a id="de-nutzung"></a>

## Nutzung im Simulator

1. App und optionalen Broker starten.
2. In der Toolbar `Broker` öffnen.
3. Die lokale Base-URL `http://127.0.0.1:8787` verwenden.
4. Einen zum konfigurierten Provider passenden API-Key eingeben und verbinden.
5. Fragen zur aktuell geöffneten Schaltung stellen.
6. Nach der Nutzung trennen; dadurch wird die Broker-Sitzung invalidiert.

Die App übermittelt einen reduzierten, schema-validierten Schaltungskontext.
Der Broker hat über diesen Pfad keinen allgemeinen Dateisystemzugriff. Die
Base-URL bleibt während einer aktiven Sitzung gesperrt, damit Sitzung und
Endpunkt nicht auseinanderlaufen.

<a id="de-daten"></a>

## Daten, Keys und Schutzgrenzen

| Station | Daten |
|---|---|
| Browser | übermittelt Key, Frage und reduzierten Kontext an den lokalen Broker |
| Broker | hält den Key sitzungsgebunden im Speicher, erstellt den Prompt und redigiert Logs |
| Externer Provider | erhält den Autorisierungswert sowie Prompt und Schaltungskontext |
| Lokaler Provider | behält den Provider-Aufruf lokal, sofern seine Konfiguration keinen weiteren Egress auslöst |

Wichtige Grenzen:

- Keys werden nicht in `.env`, Repository oder Datenbank gespeichert.
- Trennen, Löschen oder Sitzungsablauf entfernt die lokale Key-Referenz.
- Host-Allowlist und URL-Prüfung erfolgen vor dem Provider-Aufruf.
- Request-Schemas, Größenlimits, Model-Lock, History-Limit, Rate-Limits und
  rekursive Log-Redaktion begrenzen den Brokerpfad.
- Diese Maßnahmen ersetzen keine Prüfung der Datenschutz-, Kosten- und
  Aufbewahrungsregeln des gewählten Providers.
- Für externe Provider nur eingeschränkte, widerrufbare Keys mit passenden
  Kosten- und Berechtigungsgrenzen verwenden.

Der Quellcode und die zugehörigen Tests liegen vollständig unter
[`broker/`](broker/README.md).

<a id="de-actions"></a>

## Circuit Actions

Broker-Antworten können einen strukturierten `circuit-actions`-Block enthalten,
aus dem die App Schaltungsbefehle ableitet. Dieser Pfad ist experimentell und
immer bestätigungspflichtig:

1. Die App parst und validiert den vollständigen Block, ohne die Schaltung zu
   verändern.
2. Alle geplanten Änderungen erscheinen als lesbare Vorschau; destruktive
   Aktionen werden deutlich markiert.
3. Nur eine ausdrückliche Bestätigung führt den Block aus. `Verwerfen` lässt
   die Schaltung unverändert.
4. Der bestätigte Block wird atomar als ein Eintrag in die Undo-Historie
   übernommen und lässt sich mit einem Undo vollständig zurücknehmen.

Die Vorschau macht Modellausgaben nicht automatisch vertrauenswürdig. Vor
wichtigen Änderungen weiterhin eine `.lgsc.json`-Sicherung anlegen und den
gesamten Aktionsblock prüfen.

<a id="de-fehlerhilfe"></a>

## Fehlerhilfe

| Symptom | Prüfung |
|---|---|
| `ECONNREFUSED` / keine Verbindung | Brokerprozess und Port 8787 prüfen |
| `/health` nicht erreichbar | Host/Port in `broker/.env` und Launcher-Log prüfen |
| Sitzung wird abgelehnt | Key-Länge, Rate-Limit und abgelaufene Sitzung prüfen |
| Provider meldet 401/403 | Key, Provider-Typ und Zielkonto prüfen |
| Provider oder Modell nicht gefunden | Base-URL und Modell-ID gegen den gewählten Provider prüfen |
| Anfrage wird lokal blockiert | Größenlimit, Policy-Regeln oder Provider-Override entfernen |
| Antwort 429 | Cooldown abwarten und Provider-/Broker-Limit prüfen |

Weitere Einstiege:
[Projektübersicht](README.md#deutsch) ·
[Bedienung](BEDIENUNGSANLEITUNG.md#deutsch) ·
[Broker-Details](broker/README.md) ·
[Validierung](validation/README.md).

<div align="center">

[![Nach oben](https://img.shields.io/badge/⬆_Nach_oben-24292f?style=for-the-badge)](#top)

</div>

---

<a id="english"></a>

# AI Broker – Configuration and Data Flow

The AI broker is an optional local service for chat about the currently open
circuit. Simulation, analysis, saving, and export work fully without it.

<div align="center">

[![Overview](https://img.shields.io/badge/Overview-24292f?style=for-the-badge)](#en-overview)
[![Start](https://img.shields.io/badge/Start-24292f?style=for-the-badge)](#en-start)
[![Provider](https://img.shields.io/badge/Provider-24292f?style=for-the-badge)](#en-provider)
[![Usage](https://img.shields.io/badge/Usage-24292f?style=for-the-badge)](#en-usage)
[![Data & Keys](https://img.shields.io/badge/Data_&_Keys-24292f?style=for-the-badge)](#en-data)
[![Circuit Actions](https://img.shields.io/badge/Circuit_Actions-24292f?style=for-the-badge)](#en-actions)
[![Troubleshooting](https://img.shields.io/badge/Troubleshooting-24292f?style=for-the-badge)](#en-troubleshooting)

</div>

<a id="en-overview"></a>

## Overview

```text
Browser app (:5173) -> local broker (127.0.0.1:8787) -> configured provider
```

| Area | Status |
|---|---|
| Active path | [`broker/`](broker/README.md#english) |
| Bind address | `127.0.0.1:8787` by default |
| App operation | fully usable without the broker |
| Key | per-session in broker process memory |
| Provider | `noop`, `anthropic`, or `openai-compatible` |
| Circuit Actions | experimental; preview and confirmation before every execution |

The local broker is not a cloud service operated by this repository. An
external provider still receives the prompt, reduced circuit context, and API
credentials.

<a id="en-start"></a>

## Startup

Node.js `^22.13` or `>=24` is required; Node.js 24 is recommended.

### Launcher

- **Windows:** double-click `Start Launcher.bat`. Missing dependencies are
  installed, after which app and broker can be started independently.
- **Terminal:**

```bash
npm install
npm --prefix broker install
npm run launch
```

Equivalently, `node launcher.mjs` starts the same launcher. It opens
`http://localhost:4321`. On the first broker start,
`broker/.env` is created from
[`broker/.env.example`](broker/.env.example) when missing.

### Broker Directly

Copy `broker/.env.example` to `broker/.env` once, then run:

```bash
npm --prefix broker install
npm --prefix broker run dev
```

The health endpoint is available at `http://127.0.0.1:8787/health`.
`broker/.env` and real keys must not be committed.

<a id="en-provider"></a>

## Provider Configuration

The API key does **not** belong in `.env`. The file selects only the client,
target, and model:

| Variable | Purpose |
|---|---|
| `PROVIDER` | `noop`, `anthropic`, or `openai-compatible` |
| `PROVIDER_BASE_URL` | target base for an OpenAI-compatible service |
| `PROVIDER_DEFAULT_MODEL` | server-side fixed model ID |
| `PROVIDER_TIMEOUT_MS` | timeout per provider request |
| `PROVIDER_MAX_ATTEMPTS` | bounded retry attempts |
| `SESSION_TTL_SECONDS` | lifetime of the in-memory session; default 900 seconds |

### Anthropic

```ini
PROVIDER=anthropic
PROVIDER_DEFAULT_MODEL=<provider-supported-model>
```

### OpenAI Compatible

```ini
PROVIDER=openai-compatible
PROVIDER_BASE_URL=https://<provider-host>/<optional-api-prefix>
PROVIDER_DEFAULT_MODEL=<provider-model-id>
```

This includes direct OpenAI-compatible APIs, external intermediaries such as
OpenRouter, and local compatible servers. OpenRouter is itself an external
third party; “local broker” therefore does not automatically mean “no external
data”.

### Without an External Request

```ini
PROVIDER=noop
```

`noop` checks the local flow but sends no request to an AI provider. With a
locally operated OpenAI-compatible provider, authentication depends on that
server's configuration; the current broker dialog still expects a
session-bound key-shaped value.

<a id="en-usage"></a>

## Using the Simulator

1. Start the app and optional broker.
2. Open `Broker` in the toolbar.
3. Use the local base URL `http://127.0.0.1:8787`.
4. Enter an API key matching the configured provider and connect.
5. Ask questions about the currently open circuit.
6. Disconnect after use; this invalidates the broker session.

The app submits a reduced, schema-validated circuit context. The broker has no
general filesystem access through this path. The base URL is locked during an
active session so that the session and endpoint cannot diverge.

<a id="en-data"></a>

## Data, Keys, and Trust Boundaries

| Station | Data |
|---|---|
| Browser | submits key, question, and reduced context to the local broker |
| Broker | keeps the key in session-bound memory, builds the prompt, and redacts logs |
| External provider | receives the authorisation value plus prompt and circuit context |
| Local provider | keeps the provider call local unless its own configuration causes further egress |

Important boundaries:

- Keys are not stored in `.env`, the repository, or a database.
- Disconnect, deletion, or session expiry removes the local key reference.
- Host allowlisting and URL validation happen before provider dispatch.
- Request schemas, size limits, model lock, history limit, rate limits, and
  recursive log redaction bound the broker path.
- These controls do not replace review of the selected provider's privacy,
  cost, and retention rules.
- For external providers, use restricted, revocable keys with suitable cost
  and permission limits.

The source and its tests are fully available under
[`broker/`](broker/README.md#english).

<a id="en-actions"></a>

## Circuit Actions

Broker responses may contain a structured `circuit-actions` block from which
the app derives circuit commands. This path is experimental and always
requires confirmation:

1. The app parses and validates the complete block without changing the
   circuit.
2. Every planned change appears in a readable preview; destructive actions are
   clearly marked.
3. Only explicit confirmation executes the block. `Discard` leaves the circuit
   unchanged.
4. The confirmed block is applied atomically as one undo-history entry and one
   undo fully reverts it.

The preview does not automatically make model output trustworthy. Continue to
save a `.lgsc.json` backup before important changes and review the complete
action block.

<a id="en-troubleshooting"></a>

## Troubleshooting

| Symptom | Check |
|---|---|
| `ECONNREFUSED` / no connection | verify the broker process and port 8787 |
| `/health` unavailable | verify host/port in `broker/.env` and launcher log |
| Session is rejected | verify key length, rate limit, and session expiry |
| Provider returns 401/403 | verify key, provider type, and target account |
| Provider or model not found | verify base URL and model ID with the selected provider |
| Request is blocked locally | remove size-limit, policy, or provider-override violations |
| Response 429 | wait for cooldown and inspect provider/broker limits |

Further entry points:
[Project overview](README.md#english) ·
[User manual](BEDIENUNGSANLEITUNG.md#english) ·
[Broker details](broker/README.md#english) ·
[Validation](validation/README.md#english).

<div align="center">

[![Back to top](https://img.shields.io/badge/⬆_Back_to_top-24292f?style=for-the-badge)](#top)

</div>
