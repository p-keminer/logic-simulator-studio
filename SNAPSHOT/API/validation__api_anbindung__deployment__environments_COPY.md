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

Erster umgesetzter Basisschnitt:

- `APP_ENV=staging` als explizites Runtime-Profil ist vorhanden
- `ALLOWED_ORIGINS` ist ausserhalb von Development Pflicht
- Dev-only-Routen wie `/v1/dev/provider-fault` sind in Staging deaktiviert
- kuenstliche Dev-Latenz greift in Staging nicht
- `/health` und `/ready` tragen Environment-Metadaten fuer spaetere
  Staging-Smokes

Aktuelle Beispielkonfiguration:

- siehe
  [`.env.staging.example`](/home/p-keminer/projects/uni/logic-gate-simulator/validation/api_anbindung/backend-sandbox/.env.staging.example)

Aktuell vorhandene staging-nahe Laufpfade:

- `backend-sandbox npm run dev:staging-local`
- `backend-sandbox npm run smoke:staging-runtime`
- `backend-sandbox npm run smoke:staging-url`
- Render-Blueprint in [render.yaml](/home/p-keminer/projects/uni/logic-gate-simulator/render.yaml)
- externer Zielpfad beschrieben in
  [render-staging.md](/home/p-keminer/projects/uni/logic-gate-simulator/validation/api_anbindung/deployment/render-staging.md)

Security-Checkpoint vor spaeterer breiterer Freigabe:

- Transport ueber HTTPS ist fuer das erste Render-Ziel gegeben, reicht aber
  allein nicht als Hochsicherheitsargument
- vor einer Oeffnung fuer echte Frontend-Staging-Nutzung braucht das Ziel
  einen vorgeschalteten Access-Schutz oder eine vergleichbare
  Zugriffsschranke
- die Session-Key-Registrierung darf im spaeteren haerteren Staging nicht als
  frei oeffentlicher Endpoint stehenbleiben
- `ALLOWED_ORIGINS` muss auf die echte Frontend-Staging-Domain festgezogen
  werden; Platzhalterwerte sind nur fuer den ersten Deploy-/Smoke-Check
  akzeptabel
- missbrauchsrelevante Signale wie Session-Key-Spikes, CORS-Ablehnungen und
  Provider-Ausfaelle muessen vor breiterer Nutzung sichtbar alarmierbar sein

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

Naechster konkreter Staging-Schritt:

5. den staging-lokalen Lauf jetzt auf ein extern erreichbares Ziel mit
   fester Staging-Domain, Runtime-Config ausserhalb des Entwicklerrechners und
   nachgelagertem Ziel-Smoke heben
6. danach den externen Stagingpfad bewusst mit Zugangsschutz,
   Session-Key-Barriere, exakten Origins und abuse-orientierter
   Observability haerten, bevor Frontend-Remote-Ziele freigegeben werden
