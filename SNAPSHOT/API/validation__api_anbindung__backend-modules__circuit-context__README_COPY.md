# Circuit Context

## Zweck

Dieses Modul nimmt die aktuell geoeffnete Schaltung entgegen und ueberfuehrt sie in einen sicheren, reduzierten Kontext fuer den Chat.

## Verantwortung

- Annahme und Validierung des Schaltungspayloads
- Whitelisting erlaubter Felder
- Groessenkontrolle und Kompaktierung
- Ableitung von Kontextfragmenten fuer den Prompt

## Nicht verantwortlich fuer

- HTTP-Routing
- Session-Verwaltung
- direkte Provider-Aufrufe

## Sicherheitsanforderungen

- keine lokalen Dateipfade
- keine beliebigen Zusatzobjekte
- harte Limits fuer Arrays, Strings und Gesamtgroesse
- defensive Behandlung unbekannter Versionen

## Spaetere Implementierungsschritte

1. Mapping vom bestehenden `Circuit`-Modell auf ein Broker-Schema definieren
2. Feld-Whitelist und Reduktionsregeln festlegen
3. Kompaktierungslogik fuer grosse Schaltungen planen
4. Validierungsfehler und Teilreduktionen nachvollziehbar machen

## Abnahme

- nur erlaubte Felder gelangen weiter
- grosse oder fehlerhafte Payloads werden kontrolliert behandelt
- der resultierende Kontext ist stabil und testbar
