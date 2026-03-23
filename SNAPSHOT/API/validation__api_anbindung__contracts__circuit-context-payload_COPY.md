# Circuit Context Payload

## Ziel

Dieses Dokument beschreibt das Datenformat, mit dem die aktuell geoeffnete Schaltung an das Backend uebergeben wird.

## Leitprinzipien

- nur die aktuell offene Schaltung wird uebertragen
- nur notwendige Felder werden akzeptiert
- das Payload muss versionierbar und begrenzbar sein
- das Backend darf Kontext reduzieren und zusammenfassen

## Empfohlene Struktur

- `schemaVersion`
- `circuit`
- `selectedElements`
- `viewState`
- `analysisSnapshots`
- `chatMetadata`

## Inhalt von `circuit`

- Name der Schaltung
- Gates, Pins, Wires und relevante Metadaten
- keine beliebigen Anhaenge
- keine lokalen Dateipfade

## Sicherheitsregeln

- unbekannte Schluessel ablehnen oder abschneiden
- Zahlen-, String- und Array-Groessen begrenzen
- grosse Freitextfelder vermeiden
- keine binaren Daten im Chat-Payload

## Spaetere Implementierungsschritte

1. Mapping vom bestehenden Frontend-Typmodell auf das Broker-Schema ableiten
2. Feld-Whitelist fuer serialisierbare Daten festlegen
3. Payload-Groessen und Grenzwerte definieren
4. Validierungs- und Reduktionsschritte im `circuit-context` Modul umsetzen
