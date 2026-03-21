# Environments

## Ziel

Dieses Dokument beschreibt die spaeteren Laufzeitumgebungen des Brokers und deren Unterschiede.

## Development

Zweck:

- lokale Entwicklung und schnelle Iteration

Anforderungen:

- Test- oder Dummy-Provider moeglich
- reduzierte, aber vorhandene Validierung
- lokale Secrets niemals fest im Repo
- Debugging nur ohne Sensitive-Data-Leaks

## Staging

Zweck:

- realitaetsnahe Vorabpruefung

Anforderungen:

- produktionsnahe Konfiguration
- vollstaendige Schema- und Policy-Pruefung
- isolierte Secrets
- observability und Alerting aktiviert

## Production

Zweck:

- kontrollierter Betrieb fuer echte Nutzer

Anforderungen:

- striktes Secret-Management
- harte Egress-Policies
- strukturierte Logs mit Redaktion
- Alarmierung fuer Fehler, Missbrauch und Ausfaelle
- dokumentierte Rollback-Strategie

## Spaetere Implementierungsschritte

1. Konfigurationsmatrix pro Umgebung definieren
2. Secret- und Infra-Abhaengigkeiten pro Umgebung festhalten
3. Freigabekriterien fuer den Sprung zwischen Umgebungen dokumentieren
4. Produktions-Hardening als eigenen Checkpoint erzwingen
