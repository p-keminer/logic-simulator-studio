# ADR-001: Nur die aktuell geöffnete Schaltung

## Status

Akzeptiert und umgesetzt.

## Entscheidung

Der KI-Broker verarbeitet ausschließlich den vom Frontend übergebenen,
reduzierten Zustand der aktuell geöffneten Schaltung sowie die zugehörige kurze
Chat-Historie.

- keine Projektbibliothek im Broker
- kein Scannen lokaler Verzeichnisse
- kein Zugriff auf andere Schaltungsdateien
- keine projektübergreifende Erinnerung

## Begründung

Der enge Kontext reduziert Datenabfluss, Payload-Größe, Kosten und das Risiko
einer Session-Verwechslung. Er passt außerdem zum lokalen Dateimodell der App
und lässt sich durch feste Request-Schemas prüfen.

## Konsequenzen

Fragen zu anderen Entwürfen erfordern, dass der Nutzer diese selbst öffnet.
Schaltungsaktionen werden zusätzlich durch das
[Action-Protokoll](../action-protocol/spec.md) begrenzt, validiert und bestätigt.

Verworfene Alternativen sind automatische Dateiindexierung, Hintergrund-Sync
und eine serverseitige Projektsammlung.
