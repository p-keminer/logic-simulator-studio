# Testing

## Zweck

Dieser Ordner definiert, wie die spaetere Backend-Anwendung funktional, vertraglich und sicherheitlich geprueft werden soll.

## Warum dieser Ordner existiert

Bei einer Broker-Architektur reichen normale Happy-Path-Tests nicht aus. Es muessen auch Fehlkonfigurationen, Missbrauch, Grenzwerte und Secret-Schutz verifiziert werden.

## Enthaltene Dokumente

- `test-matrix.md`: Testarten, Ziele und Schwerpunkte

## Umsetzungsschritte fuer diesen Ordner

1. Tests pro Modul und pro Vertrag definieren
2. Sicherheits- und Abuse-Faelle in die Pflichtabdeckung aufnehmen
3. Staging-nahe Integrations- und Lasttests vorbereiten
4. Freigabekriterien mit `deployment/` und `rollout/` verknuepfen
