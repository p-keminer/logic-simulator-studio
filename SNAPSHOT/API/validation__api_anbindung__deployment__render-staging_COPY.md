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

## Sicherheitsgrenze des ersten externen Ziels

Der erste Render-Deploy ist bewusst nur der Einstieg in einen echten
externen Stagingpfad. Er gilt nicht automatisch als "hoch abgesichert",
nur weil die Ziel-URL ueber `https://` laeuft.

Aktuell bereits gegeben:

- Transport Browser/Client -> Render ueber HTTPS
- explizites `APP_ENV=staging`
- verpflichtende `ALLOWED_ORIGINS`
- deaktivierte Dev-Fault-Routen

Vor spaeterer breiterer Frontend-Nutzung weiterhin Pflicht:

- vorgeschalteter Access-Schutz vor dem oeffentlichen Staging-Service
- haertere Barriere fuer `POST /v1/session/key`
- `ALLOWED_ORIGINS` auf die echte Frontend-Staging-Domain festziehen
- abuse-orientierte Alarmierung fuer Session-Key-Spikes, CORS-Ablehnungen und
  Provider-/Upstream-Fehler
- Oeffnung des sichtbaren App-Clients fuer Remote-Broker-Ziele erst nach
  diesem Sicherheits-Checkpoint

## Naechster Folgepunkt

Sobald dieses externe Ziel einmal real steht und der URL-Smoke dagegen gruen
ist, folgt zuerst der beschriebene Staging-Sicherheits-Checkpoint. Danach
gehen `API1-03` Observability/Alarmierung und spaeter `API1-04`
Pilot-/Rollout-Vorbereitung weiter.
