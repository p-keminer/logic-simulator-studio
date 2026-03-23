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
- `STAGING_ACCESS_TOKEN=<zufaelliges Secret, mind. 32 Zeichen>`

Hinweise:

- `ALLOWED_ORIGINS` und `STAGING_ACCESS_TOKEN` bleiben absichtlich
  `sync: false`, weil diese Werte nicht fest in den Repo-Stand eingebrannt
  werden sollen
- `STAGING_ACCESS_TOKEN` muss in Render als Secret Environment Variable
  gesetzt werden (niemals im Repo, niemals in Logs)
- empfohlene Token-Erzeugung: `openssl rand -hex 32`

## Blueprint-Link nach Push

Sobald `render.yaml` im Remote-Repo liegt, kann die Blueprint-Erstellung ueber
diesen Render-Link gestartet werden:

- [Render Blueprint fuer dieses Repo](https://dashboard.render.com/blueprint/new?repo=https://github.com/p-keminer/logic-simulator-studio)

## Verifikation gegen das externe Ziel

Nach dem ersten Staging-Deploy kann der Ziel-Smoke direkt gegen die
ausgerollte URL gefahren werden:

```bash
cd ~/projects/uni/logic-gate-simulator/validation/api_anbindung/backend-sandbox
STAGING_BASE_URL=https://<render-service-host> \
  STAGING_ALLOWED_ORIGIN=https://<frontend-staging-host> \
  STAGING_ACCESS_TOKEN=<token> \
  npm run smoke:staging-url
```

Erwartung:

- `/health` liefert `environment: "staging"`
- `/ready` liefert `devEndpointsEnabled: false`
- die konfigurierte Frontend-Origin wird per CORS akzeptiert
- `/v1/dev/provider-fault` bleibt deaktiviert
- `POST /v1/session/key` ohne `x-staging-token` liefert `401 staging_access_denied`
- `POST /v1/session/key` mit korrektem `x-staging-token` passiert das Gate

## Sicherheitsgrenze des ersten externen Ziels

Der erste Render-Deploy ist bewusst nur der Einstieg in einen echten
externen Stagingpfad. Er gilt nicht automatisch als "hoch abgesichert",
nur weil die Ziel-URL ueber `https://` laeuft.

Aktuell bereits gegeben:

- Transport Browser/Client -> Render ueber HTTPS
- explizites `APP_ENV=staging`
- verpflichtende `ALLOWED_ORIGINS`
- deaktivierte Dev-Fault-Routen
- `X-Staging-Token`-Gate auf allen `/v1/*`-Routen (API1-02 Staging-Access-Slice)

Vor spaeterer breiterer Frontend-Nutzung weiterhin Pflicht:

- `ALLOWED_ORIGINS` auf die echte Frontend-Staging-Domain festziehen
  (kein Platzhalter, exakte Domain)
- abuse-orientierte Alarmierung fuer Session-Key-Spikes, CORS-Ablehnungen und
  Provider-/Upstream-Fehler (API1-03)
- Oeffnung des sichtbaren App-Clients fuer Remote-Broker-Ziele erst nach
  diesen Schritten

## Naechster Folgepunkt

Sobald dieses externe Ziel einmal real steht und der URL-Smoke dagegen gruen
ist, folgt zuerst der beschriebene Staging-Sicherheits-Checkpoint. Danach
gehen `API1-03` Observability/Alarmierung und spaeter `API1-04`
Pilot-/Rollout-Vorbereitung weiter.
