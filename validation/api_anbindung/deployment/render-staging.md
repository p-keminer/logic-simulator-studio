# Render Staging

## Zweck

Dieses Dokument beschreibt den ersten echten externen Staging-Zielpfad fuer
den Broker ausserhalb des lokalen Entwicklerrechners.

## Aktueller Scope

Der Repo-Stand enthaelt jetzt die minimalen Render-Artefakte fuer einen
stagingartigen Web-Service:

- Root-Blueprint in
  [render.yaml](/home/p-keminer/projects/uni/logic-gate-simulator/render.yaml)
- Docker-Build in
  [Dockerfile](/home/p-keminer/projects/uni/logic-gate-simulator/validation/api_anbindung/backend-sandbox/Dockerfile)
- lokale Zielpruefung ueber
  `backend-sandbox npm run smoke:staging-url`

## Geplanter Service

- Service-Typ: `web`
- Runtime: `docker`
- Name: `logic-simulator-broker-staging`
- Health-Check: `/ready`
- Auto-Deploy: `false`

## Pflicht-Konfiguration in Render

Vor dem ersten Deploy muessen in Render mindestens diese Werte stehen:

- `APP_ENV=staging`
- `HOST=0.0.0.0`
- `LOG_LEVEL=info`
- `ALLOWED_ORIGINS=<Frontend-Staging-Origin>`

Hinweis:

- `ALLOWED_ORIGINS` bleibt absichtlich `sync: false`, weil die tatsaechliche
  Frontend-Staging-Domain nicht fest in den Repo-Stand eingebrannt werden
  soll

## Blueprint-Link nach Push

Sobald `render.yaml` im Remote-Repo liegt, kann die Blueprint-Erstellung ueber
diesen Render-Link gestartet werden:

- [Render Blueprint fuer dieses Repo](https://dashboard.render.com/blueprint/new?repo=https://github.com/p-keminer/logic-simulator-studio)

## Verifikation gegen das externe Ziel

Nach dem ersten Staging-Deploy kann der Ziel-Smoke direkt gegen die
ausgerollte URL gefahren werden:

```bash
cd ~/projects/uni/logic-gate-simulator/validation/api_anbindung/backend-sandbox
STAGING_BASE_URL=https://<render-service-host> STAGING_ALLOWED_ORIGIN=https://<frontend-staging-host> npm run smoke:staging-url
```

Erwartung:

- `/health` liefert `environment: "staging"`
- `/ready` liefert `devEndpointsEnabled: false`
- die konfigurierte Frontend-Origin wird per CORS akzeptiert
- `/v1/dev/provider-fault` bleibt deaktiviert

## Naechster Folgepunkt

Sobald dieses externe Ziel einmal real steht und der URL-Smoke dagegen gruen
ist, ist der naechste Plan-Schritt nicht mehr der reine Staging-Aufbau,
sondern `API1-03` Observability/Alarmierung.
