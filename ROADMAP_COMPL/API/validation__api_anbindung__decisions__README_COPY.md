# Decisions

## Zweck

Dieser Ordner sammelt die grundlegenden Architekturentscheidungen, die vor jeder spaeteren Umsetzung stabil sein muessen. Er verhindert, dass sicherheitsrelevante Fragen erst waehrend der Implementierung improvisiert werden.

## Warum dieser Ordner existiert

Die API-Anbindung wirkt klein, beruehrt aber mehrere sensible Bereiche:

- Benutzer-API-Keys
- KI-Provider-Kommunikation
- Schaltungskontext mit potenziell grossen Payloads
- Missbrauchs- und Kostenrisiken

Ohne feste Entscheidungen drohen spaeter unklare Verantwortlichkeiten und Sicherheitsluecken.

## Enthaltene Entscheidungen

- `adr-001-current-circuit-only.md`: Scope-Grenze auf die offene Schaltung
- `adr-002-byo-key-via-backend-broker.md`: Benutzer-Key nur ueber Backend-Broker

## Umsetzungsschritte fuer diesen Ordner

1. jede ADR mit Status und Konsequenzen pflegen
2. neue Architekturentscheidungen nur als eigene ADR ergaenzen
3. abgelehnte Alternativen dokumentieren
4. Frontend- und Backend-Vertraege an die ADRs binden

## Abgrenzung

Dieser Ordner beschreibt keine Implementierungsdetails einzelner Module. Diese stehen spaeter in `architecture/`, `contracts/` und `backend-modules/`.
