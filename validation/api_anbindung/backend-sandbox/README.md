# Backend Sandbox

Dieses Verzeichnis ist ein isoliertes TypeScript-Backend-Scaffold fuer die spaetere sichere API-Anbindung der aktuell geoeffneten Schaltung.

Wichtige Grenzen:

- keine aktive App-Integration
- keine Imports aus `src/` der Hauptanwendung
- keine produktive Provider-Anbindung
- keine echten Secrets oder API-Keys
- nur Skeleton, Contracts, Stubs, TODOs und Test-Harness

Der Aufbau folgt dem Plan in `validation/api_anbindung` und deckt bewusst nur den fruehen Schnitt aus `API0` ab:

- Broker-Grundgeruest
- Contracts und Circuit-Context-Modelle
- isolierte In-Memory-Session-/Key-Bindung fuer `POST /v1/session/key` und `DELETE /v1/session/key`
- TTL-gebundene Session-/Key-Bindung mit geplanter Redaction, damit verlassene Roh-Keys nach Ablauf auch ohne Folgezugriff aus dem Sandbox-Speicher verschwinden
- Circuit-Context-Whitelist mit deterministischer Reduktion und harter Oversize-Ablehnung im Sandbox-Schnitt
- sessiongebundener Chat-Request-Pfad auf Basis des reduzierten Active-Circuit-Contracts
- lokale Guardrails fuer Scope-Escape, Prompt-Injection und Provider-Override
- feste Prompt-Templates sowie lokaler In-Memory-History-/Reset-Schnitt innerhalb der Sandbox
- providerneutraler Gateway-Pfad mit Debug-Metadaten, Fehlernormalisierung und Mock-/Noop-Dispatch
- lokale In-Memory-Rate-Limits, Audit-Events, Metrics und rekursive Secret-Redaction
- lokale App-Bridge-Contracts und Harnesses fuer den spaeteren Handshake mit der aktuell geoeffneten Schaltung, ohne aktive App-Imports
- `CurrentCircuitSnapshotProvider` als Port/Adapter-Schnitt mit Fixture-Provider und optionalen lokalen Handshake-Routen fuer die spaetere echte App-Anbindung
- filebasierter `CurrentCircuitSnapshotProvider` fuer sandbox-lokale JSON-Snapshots als zweiter echter Adaptertyp ohne aktive App-Anbindung

## Struktur

- `src/app/`: App-Bootstrap und Serverstart
- `src/shared/`: zentrale Config-, Fehler-, Logger- und Result-Helfer
- `src/contracts/`: lokale Request-, Response- und Fehler-Contracts
- `src/modules/*`: klar getrennte Backend-Module
- `fixtures/`: sandbox-lokale JSON-Snapshots fuer File-Adapter- und Integrationschecks
- `docs/`: Sandbox-Erklaerung und manuelle Validierung
- `tests/`: Contract-, Modul-, Sicherheits- und Smoke-Test-Skelette

## Lokale Nutzung

Diese Sandbox ist absichtlich entkoppelt. Vor lauffaehigen Checks muessen die lokalen Abhaengigkeiten innerhalb dieses Ordners installiert werden.

```bash
npm install
npm run typecheck
npm test
```

`npm test` nutzt eine lokale `vitest.config.ts`, damit keine Root-Konfiguration der aktiven App in die Sandbox hineinreicht.

Fuer einen spaeteren lokalen Start ist das dev-Script nur auf das Sandbox-Subprojekt bezogen:

```bash
npm run dev
```

## Current-Circuit-Adapter

Der Current-Circuit-Port kennt in der Sandbox aktuell zwei Adaptertypen:

- Fixture-Adapter fuer rein lokale, fest eingebaute Snapshot-Flows
- File-Adapter fuer lokale JSON-Snapshots ueber `currentCircuitSnapshotFilePath`

Der filebasierte Adapter darf nur Dateien innerhalb dieses `backend-sandbox`-Ordners lesen. Neben der statischen Pfadpruefung wird vor dem Lesen auch der aufgeloeste Realpfad kontrolliert, damit Symlink- oder Junction-Escapes nicht aus der Sandbox herausfuehren. Fehlende Dateien liefern nur `404` ueber die opt-in-Route, ungueltiges JSON oder schemafremde Snapshots werden als normalisierte Sandbox-Fehler behandelt, ohne Pfad- oder Inhalts-Leaks nach aussen.

## Local App Bridge

Die opt-in-Routen unter `/v1/local-app-bridge/*` sind reine Sandbox-Hilfsrouten. Auch wenn sie aktiviert sind, liefern sie nur Daten fuer aktive Sandbox-Sessions und erwarten deshalb ein gueltiges `x-session-id`-Header, das ueber `POST /v1/session/key` ausgestellt wurde.

## Debug-Regel

Strukturierte Debug-Statements im Pfad `chat/request -> provider-gateway -> provider-client` gehoeren in dieser Sandbox zum beabsichtigten Vorbau. Wer in diesem Verzeichnis arbeitet, soll diese Spur erhalten oder ausbauen, nicht still entfernen. Dabei gilt:

- immer Korrelation ueber `requestId`, `sessionId` und `conversationId`
- Debug nur ueber sichere Metadaten wie `promptFingerprint`, Byte-Groessen, Attempts, Timeouts und Allowlist-Hosts
- Rate-Limit-, Policy-, Audit- und Provider-Breadcrumbs als strukturierte Spur erhalten
- an der Route-Grenze nur flache Provider-Summary-Felder loggen, keine frei durchgereichten Debug-Payloads
- filebasierte Current-Circuit-Adapter nur ueber `providerId`, `providerMode`, `circuitId` und sichere Zaehldaten an der Edge sichtbar machen
- niemals Roh-Keys oder andere Secrets loggen

Die konkreten Regeln stehen in [debugging-guidelines.md](./docs/debugging-guidelines.md).

## Offene Punkte vor echter Integration

- finale API-Vertraege mit der App abstimmen
- Mapping vom echten Frontend-Circuit-State auf den lokalen Sandbox-Contract ersetzen
- Session-/Secret-Storage mit realer Laufzeitstrategie hinterlegen
- Chat-Historie, Reset-Semantik und Prompt-Templates von lokalem Sandbox-Verhalten auf echte Produktregeln heben
- Provider-Gateway von Mock-/Noop-Dispatch auf echte, aber weiter kontrollierte Egress-Anbindung heben
- lokalen App-Bridge-Harness spaeter gegen einen echten Adapter auf den offenen App-State austauschen
- echten App-Zugriff spaeter nur als Adapter gegen `CurrentCircuitSnapshotProvider` anbinden, nicht direkt in Chat-/Circuit-Logik
- Audit, Limits und Observability von lokaler In-Memory-Strategie auf echte Betriebsdienste heben

Weitere Details und Validierungsschritte stehen in `docs/` und im `status-report.md`.
