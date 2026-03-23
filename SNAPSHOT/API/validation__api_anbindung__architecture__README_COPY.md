# Architecture

## Zweck

Dieser Ordner beschreibt das technische Zielbild der Backend-Anwendung. Er beantwortet, wie der sichere Broker aufgebaut ist, wie Daten fliessen und wo Modulgrenzen verlaufen.

## Warum dieser Ordner existiert

Ohne ein klares Architekturziel besteht die Gefahr, dass spaeter:

- Provider-Logik im Frontend landet
- Sicherheitslogik ueber mehrere Schichten verteilt wird
- Logging und Richtlinien nicht einheitlich durchgesetzt werden

## Enthaltene Dokumente

- `system-overview.md`: Gesamtarchitektur und Kernkomponenten
- `data-flow.md`: Schrittfolge vom Frontend bis zur Provider-Antwort
- `module-boundaries.md`: Verantwortungen und verbotene Ueberschneidungen

## Umsetzungsschritte fuer diesen Ordner

1. Zielarchitektur fuer Entwicklung und Produktion festziehen
2. Datenfluesse fuer Chat-Request, Key-Hinterlegung und Fehlerfaelle ausformulieren
3. Verantwortungen pro Modul festschreiben
4. Verweise auf `security/` und `contracts/` eng mit der Architektur synchron halten
