# Auth

## Zweck

Dieses Modul verwaltet Broker-Sessions und die Bindung zwischen Anfrage, Nutzerkontext und Key-Referenz.

## Verantwortung

- Session-Erzeugung und Session-Invalidierung
- Zuordnung einer Key-Referenz zu einer Session
- Verwaltung von Session-Lebensdauer und Rotation
- Limit-Kontext fuer Abuse-Schutz

## Nicht verantwortlich fuer

- Schaltungskontext
- Prompt-Bau
- Provider-Egress

## Sicherheitsanforderungen

- opake oder signierte Session-Identifier
- TTL und Loeschpfade fuer Sessiondaten
- keine Session-Information in Klartext-Logs
- Rotation nach Sicherheitsereignissen

## Spaetere Implementierungsschritte

1. Session-Modell mit TTL definieren
2. Session-Speicher auswaehlen, zum Beispiel Redis oder vergleichbar
3. Bindung zwischen Session und Key-Referenz festlegen
4. Logout-, Reset- und Timeout-Verhalten spezifizieren

## Abnahme

- Sessions sind klar getrennt und invalidierbar
- fremde Session-Kontexte lassen sich nicht uebernehmen
- Rate-Limit-Schluessel koennen pro Session erzeugt werden
