# Backend Modules

## Zweck

Dieser Ordner zerlegt die spaetere Backend-Anwendung in klar getrennte Bausteine. Jedes Unterverzeichnis beschreibt die Verantwortung, die No-Gos und die Implementierungsschritte eines Moduls.

## Warum dieser Ordner existiert

Die Anbindung soll klein, aber nicht monolithisch sein. Eine modulare Aufteilung reduziert:

- verdeckte Sicherheitskopplungen
- unklare Verantwortlichkeiten
- schwer testbare Seiteneffekte

## Module

- `edge-api/`
- `auth/`
- `circuit-context/`
- `prompt-orchestrator/`
- `provider-gateway/`
- `policy-guardrails/`
- `audit-and-observability/`

## Grundregel

Jedes Modul hat:

- einen klaren Eingang
- eine klar definierte Verantwortung
- eigene Tests
- eine dokumentierte Grenze zu Nachbarmodulen

## Umsetzungsschritte fuer diesen Ordner

1. fuer jedes Modul Interfaces und DTOs definieren
2. Querschnittsthemen wie Logging und Config zentral halten
3. verbotene Abhaengigkeiten in Architekturtests absichern
4. Modulgrenzen in Reviews explizit pruefen
