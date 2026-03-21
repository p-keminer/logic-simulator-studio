# Threat Model

## Scope

Das Bedrohungsmodell gilt fuer eine Backend-Anwendung, die Chat-Anfragen ueber die aktuell geoeffnete Schaltung an einen KI-Provider vermittelt.

## Schutzgueter

- Benutzer-API-Key
- interne Service-Secrets
- Session-Zuordnungen
- Schaltungskontext
- Chat-Historie
- Audit-Logs
- Kosten- und Verfuegbarkeitsbudget

## Vertrauensgrenzen

- Browser zu Backend
- Backend zu Secret-Speicher
- Backend zu Provider
- internes Logging zu Monitoring und Alerting

## Relevante Bedrohungen

### T1: Key-Exfiltration

Angreiferziel:

- Auslesen von Benutzer-API-Keys ueber Logs, Debug-Ausgaben, Fehlerantworten oder unsichere Speicherung

Gegenmassnahmen:

- keine Key-Rueckgabe an das Frontend
- Redaktionsfilter fuer Logs
- Verschluesselung ruhender Secrets
- enge Berechtigungen fuer Secret-Speicher
- kurze Lebensdauer und explizite Loeschpfade

### T2: Provider-Missbrauch ueber ungefilterte Requests

Angreiferziel:

- Einschleusen beliebiger Provider-Parameter oder unzulaessiger Modelloptionen

Gegenmassnahmen:

- feste Request-Schemas
- Allowlist fuer Provider, Modelle und Optionen
- Guardrails vor Provider Gateway
- keine unkontrollierten Passthrough-Felder

### T3: Kosten- oder Verfuegbarkeitsangriff

Angreiferziel:

- Ausloesen uebergrosser, haeufiger oder absichtlich teurer Requests

Gegenmassnahmen:

- Rate-Limits pro Session und pro IP
- Payload- und Token-Limits
- Timeouts und begrenzte Retries
- Budgets pro Nutzerkontext

### T4: Datenabfluss ueber Prompt oder Logs

Angreiferziel:

- Offenlegung sensibler oder ueberfluessiger Schaltungsdaten

Gegenmassnahmen:

- Kontextminimierung
- definierte Feld-Whitelist
- Redaktion sensibler Metadaten
- kein Prompt-Logging im Klartext in Produktion

### T5: Session-Verwechslung

Angreiferziel:

- Nutzung eines fremden Key- oder Chat-Kontexts

Gegenmassnahmen:

- serverseitige Session-Bindung
- signierte oder opake Session-IDs
- Rotation bei Sicherheitsereignissen
- strenge Trennung zwischen Session und Key-Referenz

## Rest-Risiken

- ein BYO-Key bleibt ein nutzerseitig eingebrachtes Secret und erfordert Vertrauensvorschuss in den Broker
- grosse oder komplexe Schaltungen koennen Prompt-Zusammenfassungen noetig machen
- Provider-seitige Richtlinien oder Ausfaelle bleiben nicht voll kontrollierbar

## Spaetere Implementierungsschritte

1. fuer jede Bedrohung konkrete technische Controls definieren
2. Risiken in Testfaelle uebersetzen
3. Alarmierung fuer Key-Leaks, Rate-Limit-Spitzen und Provider-Ausfaelle einrichten
4. Threat Model bei neuen Providern oder neuen Chat-Faehigkeiten aktualisieren
