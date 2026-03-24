# API-Anbindung Plan

## Ziel

Dieser Bereich beschreibt die vollstaendige Implementierungsplanung fuer eine separate Backend-Anwendung, die einzig dazu dient, eine sichere KI-API-Anbindung fuer den Logic Simulator bereitzustellen.

Die Backend-Anwendung soll:

- nur Anfragen zur aktuell geoeffneten Schaltung bearbeiten
- vom Frontend entkoppelt sein und als sicherer Broker zwischen App und KI-Provider dienen
- benutzerspezifische API-Keys unter klaren Sicherheitsregeln annehmen
- Kontext aus der aktuell geladenen Schaltung in ein kontrolliertes Chat-Format ueberfuehren
- keine Projektbibliothek, keinen Dateisystemzugriff und keine allgemeine Remote-Steuerung bereitstellen

## Warum dieser Ordner existiert

Die App ist heute frontend-zentriert. Fuer eine sichere KI-Anbindung reicht ein einfacher Dialog mit direktem Browser-API-Key nicht aus. Dieser Ordner schafft deshalb eine belastbare Planungsgrundlage fuer:

- Architektur
- Sicherheitsentscheidungen
- API-Vertraege
- Modulzuschnitte
- Betriebsmodell
- Teststrategie
- Rollout

## Scope

Im Scope:

- KI-Chat nur fuer die aktuell geoeffnete Schaltung
- Backend als Security-Gateway und Provider-Broker
- Nutzerseitig eingetragener API-Key mit serverseitiger Schutzlogik
- kontrollierte Serialisierung der Schaltung in ein Chat-konformes Kontextobjekt

Nicht im Scope:

- automatische Erkennung aller lokalen Projekte
- Dateisystem-Scanning auf Nutzerrechnern
- Multi-Projekt-Wissensbasis
- Agenten mit Schreibzugriff auf Schaltungen
- allgemeine Plugin-Plattform

## Struktur

- `decisions/`: Architektur- und Produktentscheidungen als ADRs
- `architecture/`: Zielbild, Datenfluesse und Modulgrenzen
- `security/`: Sicherheitsmodell, Bedrohungen und Schutzmassnahmen
- `contracts/`: Frontend-Backend- und Provider-Vertraege
- `backend-modules/`: einzelne Backend-Bausteine mit klarer Verantwortung
- `deployment/`: Umgebungen, Betrieb und Secrets-Management
- `testing/`: Teststrategie und Sicherheitsverifikation
- `rollout/`: Meilensteine, offene Fragen und Einfuehrungsreihenfolge

## Umsetzungsstand

Die Backend-Anwendung existiert vollstaendig unter `backend-sandbox/`.
Sie nimmt Chat-Anfragen fuer die offene Schaltung entgegen, validiert und
reduziert den Schaltungskontext, wendet Policy-Guardrails an, fuehrt
Provider-Anfragen stellvertretend aus und behandelt Antworten, Limits und
Audit-Ereignisse kontrolliert.

## Aktueller Integrationsstand (Stand 2026-03-24)

`API1-01` bis `API1-05` sind abgeschlossen:

- **API1-01** – Sichtbarer Broker-Dialog (`Key -> Chat -> Reset -> Delete`)
  mit vollstaendigem UI-Smoke-Ring fuer Happy Path, stale-Session-Recovery,
  Session-Key-/Chat-/Reset-Rate-Limits, Konfigurationsfehler, Policy-Block
  und Provider-/Upstream-Fehler (`npm run broker:smoke:*`)
- **API1-02** – Staging-Profil (`APP_ENV=staging`), verpflichtende
  `ALLOWED_ORIGINS`, Staging-Access-Gate via `X-Staging-Token`,
  deaktivierte Dev-Routen, Render-Blueprint fuer externes Staging-Ziel
- **API1-04** – Echte Provider-Anbindung: `AnthropicProviderClient` und
  `OpenAICompatibleProviderClient` (native fetch, kein SDK); live verifiziert
  mit OpenRouter + minimax/minimax-m2.7; unterstuetzt OpenAI, OpenRouter,
  Ollama und jede OpenAI-kompatible API
- **API1-05** – Broker-Naechhärtung:
  - H1: Prompt-Groessenlimit 32 KB (`PROMPT_TOO_LARGE`, HTTP 400)
  - H2: Model-Lock via `.strict()` auf Schema (kein Client-Override moeglich)
  - H3: Conversation-History-Limit 32 Turns (Sliding-Window)
  - H4: allowedHosts-SSRF-Schutz in beiden Provider-Clients vor jedem
    Netzwerkzugriff
  - H5: `dispatchMode` differenziert `live`/`mock`/`noop`

`API1-03` (Observability/Alarmierung) und urspruengliches `API1-04`
(Pilot-/Rollout) entfallen, da kein zentraler Betrieb vorgesehen ist.
Das Architekturziel ist Self-Hosted: jeder Nutzer betreibt den Broker
lokal mit eigenem API-Key.

Naechster Schritt: `API2-01` AI-Action-Protocol Protokoll-Spezifikation
(KI soll Schaltungs-Befehle ausgeben koennen, nicht nur Text).
Details: `validation/api_anbindung/work-package.md`.
