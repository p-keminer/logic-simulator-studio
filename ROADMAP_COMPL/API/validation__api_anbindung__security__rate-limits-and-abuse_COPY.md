# Rate Limits and Abuse

## Ziel

Dieses Dokument beschreibt den Schutz gegen Kostenmissbrauch, Lastspitzen und absichtlich problematische Chat-Anfragen.

## Zu schuetzende Ressourcen

- Provider-Kostenbudget
- Backend-CPU und Speicher
- Session-Slots
- Fehlermeldungs- und Logging-Pipeline

## Missbrauchsszenarien

- viele kleine Requests in kurzer Zeit
- sehr grosse Schaltungspayloads
- absichtlich lange Chat-Historien
- wiederholtes Ausprobieren ungueltiger Keys
- Prompt-Missbrauch zur Umgehung von Guardrails

## Schutzmassnahmen

- Rate-Limits pro IP
- Rate-Limits pro Session
- parallele Request-Begrenzung pro Session
- Payload-Groessenlimit
- Chat-Historienlimit
- Token- oder Kontextbudget
- Cooldown bei wiederholten Verstoessen

## Antwortverhalten

- bei Limit-Verletzung klare, aber nicht informationsreiche Fehlermeldung
- kein Echo sensibler Felder
- Audit-Event fuer auffaellige Serien

## Spaetere Implementierungsschritte

1. Baseline-Limits fuer Entwicklung, Staging und Produktion definieren
2. Fehlerschwellen fuer Alerting festlegen
3. Lasttests gegen Limit- und Queue-Verhalten aufsetzen
4. Abuse-Signale mit `audit-and-observability` verbinden
