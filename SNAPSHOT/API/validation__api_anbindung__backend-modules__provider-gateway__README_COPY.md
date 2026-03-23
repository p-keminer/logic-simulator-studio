# Provider Gateway

## Zweck

Dieses Modul ist die einzige Komponente, die reale Requests an einen KI-Provider sendet.

## Verantwortung

- Provider-Adapter
- Header- und Auth-Aufbau
- TLS-gesicherte Ausleitung
- Timeouts, Retries und Fehlernormalisierung
- Antwortnutzung und Verbrauchsmetriken

## Nicht verantwortlich fuer

- HTTP-Einstieg
- Session-Bindung
- fachliche Schaltungsvalidierung

## Sicherheitsanforderungen

- Host-Allowlist
- keine beliebigen Ziel-URLs
- keine rohe Weitergabe von Provider-Fehlern
- keine Klartext-Secrets im Monitoring

## Spaetere Implementierungsschritte

1. internen Adapter-Vertrag aus `contracts/provider-abstraction.md` umsetzen
2. pro Provider einen schmalen Adapter mit identischem Verhalten entwerfen
3. Timeouts, Retry-Regeln und Circuit-Breaker definieren
4. Nutzungsdaten und Fehlertypen standardisieren

## Abnahme

- nur freigegebene Hosts sind erreichbar
- Providerwechsel aendert keine Frontend-Vertraege
- Ausfaelle fuehren zu kontrollierten Fehlern statt unklaren Hangs
