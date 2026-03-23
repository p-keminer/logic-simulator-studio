# Prompt Orchestrator

## Zweck

Dieses Modul baut aus validierter Benutzerfrage, Chat-Historie und reduziertem Schaltungskontext einen kontrollierten Modell-Request.

## Verantwortung

- Aufbau des System-Prompts
- Priorisierung relevanter Kontextteile
- Begrenzung und Zusammenfassung uebergrosser Kontexte
- Erzeugung eines modellneutralen Request-Objekts

## Nicht verantwortlich fuer

- Session-Management
- Secret-Verwaltung
- HTTP- oder Provider-Details

## Sicherheitsanforderungen

- keine unkontrollierte Uebernahme von Frontend-Systemprompts
- keine Weitergabe verbotener Anweisungen
- klare Trennung zwischen System-, Kontext- und User-Anteil
- kontextbezogene Kuerzung vor dem Provider-Aufruf

## Spaetere Implementierungsschritte

1. festes Prompt-Template fuer die offene Schaltung definieren
2. Priorisierungsregeln fuer Kontextfragmente entwickeln
3. Strategien fuer Zusammenfassung oder Ausschnittsbildung festlegen
4. Ausgabeformat fuer das `provider-gateway` stabilisieren

## Abnahme

- das Modul liefert deterministisch aufgebaute Requests
- uebergrosse Kontexte werden vor dem Provider-Aufruf reduziert
- Systeminstruktionen stammen nur aus kontrollierten Quellen
