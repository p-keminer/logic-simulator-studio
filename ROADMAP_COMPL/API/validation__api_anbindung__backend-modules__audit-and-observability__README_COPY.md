# Audit and Observability

## Zweck

Dieses Modul sorgt fuer nachvollziehbaren Betrieb, sichere Telemetrie und fruehzeitige Erkennung von Fehlern oder Missbrauch.

## Verantwortung

- strukturierte Logs
- Metriken und Tracing
- Audit-Ereignisse fuer sicherheitsrelevante Aktionen
- Alerting-Grundlagen fuer Ausfaelle und Anomalien

## Nicht verantwortlich fuer

- Geschaeftsentscheidungen
- Speicherung sensibler Prompt-Inhalte im Klartext

## Sicherheitsanforderungen

- Redaktionsfilter fuer Keys, Tokens und sensible Payload-Anteile
- keine Volltext-Logs von kompletten Prompts in Produktion
- Korrelation ueber Request-ID statt ueber sensible Daten
- Audit-Events fuer Key-Registrierung, Rate-Limit-Verstosse und Policy-Blockierungen

## Spaetere Implementierungsschritte

1. Logging-Schema mit sicheren Pflichtfeldern definieren
2. Metriken fuer Latenz, Fehlerraten, Limits und Providerverbrauch planen
3. Redaktionsschicht vor jedem Sink einziehen
4. Dashboards und Alarmierungsregeln festlegen

## Abnahme

- sensible Daten erscheinen nicht in Logs
- sicherheitsrelevante Ereignisse sind nachvollziehbar
- Betrieb und Incident-Analyse sind ohne Rohsecrets moeglich
