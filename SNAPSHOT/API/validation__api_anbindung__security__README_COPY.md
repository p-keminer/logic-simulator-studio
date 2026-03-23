# Security

## Zweck

Dieser Ordner definiert das Sicherheitsfundament der spaeteren Backend-Anwendung. Hier wird festgelegt, welche Risiken angenommen werden, welche Schutzmechanismen Pflicht sind und wie sensible Daten behandelt werden.

## Warum dieser Ordner existiert

Die geplante API-Anbindung verarbeitet:

- Benutzer-API-Keys
- Chat-Nachrichten
- Schaltungskontext
- Provider-Antworten
- Betriebs- und Auditdaten

Schon eine kleine Fehlentscheidung bei Secret-Handling, Logging oder Egress kann hier eine schwerwiegende Sicherheitsluecke erzeugen.

## Enthaltene Dokumente

- `threat-model.md`: Bedrohungen, Assets und Gegenmassnahmen
- `secret-handling.md`: Lebenszyklus fuer Benutzer-Keys und interne Secrets
- `provider-egress-policy.md`: erlaubte Netzwerkausleitungen zu Providern
- `rate-limits-and-abuse.md`: Kosten- und Missbrauchsschutz

## Pflichtprinzipien

- kein Secret im Browsercode verstecken
- keine Klartext-Secrets in Logs oder Fehlermeldungen
- keine ungepruefte Ausleitung an fremde Hosts
- keine ungebremsten Modellanfragen
- jede sicherheitskritische Aktion muss nachvollziehbar sein

## Umsetzungsschritte fuer diesen Ordner

1. Bedrohungen priorisieren und Assets benennen
2. Secret-Flows und Speicherorte festlegen
3. Egress-Hosts und TLS-Anforderungen definieren
4. Rate-Limits, Quotas und Alerting aufsetzen
5. Security-Kontrollen mit `testing/` verknuepfen
