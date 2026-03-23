# Policy Guardrails

## Zweck

Dieses Modul erzwingt produkt- und sicherheitsbezogene Regeln, bevor eine Anfrage an das Modell weitergereicht wird.

## Verantwortung

- Pruefung erlaubter Aufgaben
- Blockieren unerwuenschter Parameter oder Metaanweisungen
- Erzwingen von Payload- und Kontextgrenzen
- Vorfilter fuer Missbrauchsmuster

## Nicht verantwortlich fuer

- Provider-Kommunikation
- Secret-Handhabung
- Logging-Pipeline selbst

## Sicherheitsanforderungen

- Allowlist-basierte Regeldefinition
- keine dynamische Policy aus Nutzerinput
- klare Trennung zwischen Policy-Verletzung und normalem Validierungsfehler
- nachvollziehbare Ablehnungsgruende fuer Audits

## Spaetere Implementierungsschritte

1. produktseitig erlaubte Chat-Use-Cases definieren
2. Policy-Regeln als testbare Einheiten beschreiben
3. Ablehnungs- und Warnpfade festlegen
4. Policy-Entscheidungen mit Audit-Events verknuepfen

## Abnahme

- verbotene Anfragen werden vor dem Gateway gestoppt
- Regeln sind testbar und nicht ueber das Frontend manipulierbar
- Ablehnungen bleiben fuer Nutzer verstaendlich, aber nicht informationsreich
