# Edge API

## Zweck

Dieses Modul ist der einzige oeffentliche HTTP-Einstiegspunkt des Brokers.

## Verantwortung

- Routing und HTTP-Methoden
- Request-Parsing
- Eingangsvalidierung gegen versionierte Schemas
- Request-ID und Korrelationsdaten
- einheitliche Fehlerantworten

## Nicht verantwortlich fuer

- Provider-spezifische Kommunikation
- Secret-Speicherung
- inhaltliche Prompt-Bildung

## Sicherheitsanforderungen

- strikte Body-Limits
- unbekannte Felder ablehnen oder abschneiden
- keine Debug-Stacks an Clients
- nur explizite CORS-Freigaben

## Spaetere Implementierungsschritte

1. HTTP-Framework waehlen und Basisserver aufsetzen
2. zentrale Schema-Validierung einbauen
3. Fehler-Middleware und Request-Korrelation einfuehren
4. Health- und Readiness-Endpunkte getrennt von Fachendpunkten definieren

## Abnahme

- jeder Eingangspfad ist validiert
- Fehlerformate sind konsistent
- keine Fachlogik liegt direkt in den Controllern
