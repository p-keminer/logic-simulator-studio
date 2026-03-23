# Module Boundaries

## Zweck

Dieses Dokument grenzt die spaeteren Backend-Module bewusst voneinander ab. Ziel ist ein modularer Aufbau mit klaren Verantwortungen statt einer grossen unscharfen Service-Schicht.

## Module und Verantwortung

### Edge API

Verantwortlich fuer:

- HTTP-Endpunkte
- Schema-Validierung am Eingang
- Request-IDs und Korrelation
- Fehlerformat fuer das Frontend

Nicht verantwortlich fuer:

- Provider-spezifische Logik
- Secret-Speicherung
- Prompt-Engineering-Details

### Auth

Verantwortlich fuer:

- Session-Bindung
- Identitaetskontext des Nutzers innerhalb des Brokers
- Zuordnung von Limits und Key-Referenzen

Nicht verantwortlich fuer:

- Schaltungsanalyse
- Prompt-Erzeugung

### Circuit Context

Verantwortlich fuer:

- Annahme des offenen Schaltungszustands
- Normalisierung, Kompaktierung und Groessenpruefung
- Ableitung sicherer Kontextausschnitte

Nicht verantwortlich fuer:

- HTTP
- Provider-Calls

### Policy Guardrails

Verantwortlich fuer:

- Richtlinien fuer erlaubte Aufgaben
- harte Verbote und Kontextgrenzen
- Input-Sanitizing auf Policy-Ebene

Nicht verantwortlich fuer:

- Session-Verwaltung
- Netzwerkkommunikation

### Prompt Orchestrator

Verantwortlich fuer:

- kontrollierte Prompt-Komposition
- Zusammenfassen und Priorisieren des Kontexts
- Modellneutrale Aufbereitung der Anfrage

Nicht verantwortlich fuer:

- Secret-Schutz
- HTTP-Antworten

### Provider Gateway

Verantwortlich fuer:

- Provider-Adapter
- Egress-Richtlinien
- Timeouts, Retries und Fehlernormalisierung

Nicht verantwortlich fuer:

- Frontend-Schemas
- fachliche Schaltungspruefung

### Audit and Observability

Verantwortlich fuer:

- strukturierte Logs
- Metriken und Traces
- Audit-Events und Alarme

Nicht verantwortlich fuer:

- Geschaeftslogik
- Prompt-Inhalt im Klartext

## Modulregeln

- jedes Modul kommuniziert ueber klar definierte DTOs oder interne Services
- kein Modul darf heimlich Provider-spezifische Payloads ins Frontend durchreichen
- Logging wird zentral redigiert
- Security-Kontrollen duerfen nicht nur auf einer Schicht beruhen

## Spaetere Implementierungsschritte

1. pro Modul ein Interface und ein Testziel definieren
2. verbotene Abhaengigkeiten explizit dokumentieren
3. gemeinsame Typen in einen kleinen Shared-Contract-Bereich auslagern
4. Integrationspunkte zwischen Modulen mit Request-Limits absichern
