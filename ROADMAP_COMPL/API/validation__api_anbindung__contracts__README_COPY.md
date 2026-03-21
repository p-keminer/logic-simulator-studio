# Contracts

## Zweck

Dieser Ordner definiert die spaeteren Vertraege zwischen Frontend, Backend und KI-Providern. Ziel ist eine stabile, versionierbare Schnittstelle statt losem Payload-Durchreichen.

## Warum dieser Ordner existiert

Gerade bei einer sicherheitsrelevanten API-Anbindung duerfen Inputs und Outputs nicht implizit bleiben. Klare Vertraege verhindern:

- unkontrollierte Sonderfelder aus dem Frontend
- Provider-Kopplung in der UI
- unklare Fehlerbehandlung
- ueberdimensionierte Kontextpayloads

## Enthaltene Dokumente

- `frontend-backend.md`: externe Broker-API fuer die App
- `provider-abstraction.md`: interner Vertrag zum Modellanbieter
- `circuit-context-payload.md`: Datenformat der aktuell offenen Schaltung

## Umsetzungsschritte fuer diesen Ordner

1. Request- und Response-Schemas versionieren
2. Feld-Whitelists definieren
3. Fehlercodes und Fehlertypen vereinheitlichen
4. Contract-Tests an alle Endpunkte koppeln
