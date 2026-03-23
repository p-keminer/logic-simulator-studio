# Deployment

## Zweck

Dieser Ordner beschreibt, wie die spaetere Backend-Anwendung sicher betrieben, konfiguriert und ausgerollt werden soll.

## Warum dieser Ordner existiert

Gerade bei einer kleinen Security-Broker-Anwendung entstehen viele reale Risiken erst im Betrieb:

- falsch gesetzte Umgebungsvariablen
- zu breite Netzfreigaben
- unsaubere Secret-Quellen
- fehlende Alarmierung

## Enthaltene Dokumente

- `environments.md`: Entwicklungs-, Staging- und Produktionsumgebungen
- `operations-checklist.md`: Betriebs- und Freigabecheckliste
- `render-staging.md`: erster externer Staging-Zielpfad via Render

## Umsetzungsschritte fuer diesen Ordner

1. Environment-Varianten und Konfigurationsquellen definieren
2. Secret-Quellen und Rollenmodell festlegen
3. Netzwerk- und Monitoring-Anforderungen binden
4. Go-Live-Checkliste als Pflichtartefakt etablieren
