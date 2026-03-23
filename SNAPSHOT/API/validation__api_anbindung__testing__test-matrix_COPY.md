# Test Matrix

## Unit Tests

Ziel:

- Regeln und Transformationen pro Modul isoliert pruefen

Pflichtfaelle:

- Schema-Validierung
- Policy-Regeln
- Kontextreduktion
- Provider-Fehlernormalisierung
- Redaktionsfilter
- Broker-UI-Stateflow fuer `Key -> Chat -> Reset -> Delete`

## Contract Tests

Ziel:

- Stabilitaet der Frontend-Backend- und Provider-Vertraege absichern

Pflichtfaelle:

- Request- und Response-Schemas
- Fehlercodes
- unbekannte Felder
- Versionierungsverhalten

## Integrationstests

Ziel:

- Zusammenspiel der Module pruefen

Pflichtfaelle:

- Key-Hinterlegung bis Chat-Anfrage
- Session-Reset
- Timeout- und Retry-Pfade
- Limit-Verletzungen
- App-seitige Session-Invalidierung ueber Chat, Reset und Delete mit
  konsistenter UI-Fehlerabbildung
- lokaler Recovery-Pfad im Broker-Modal (`Lokal leeren`) ohne Broker-
  Round-Trip
- robuste Base-URL-Eingabe im Broker-Modal mit klarer Konfigurationsmeldung
  erst beim Verbinden
- Base-URL-Haertung gegen nicht erlaubte Schemata und eingebettete
  Zugangsdaten
- Base-URL-Haertung gegen externe Nicht-Loopback-Hosts im aktuellen App-Scope
- gemeinsamer Control-State fuer die sichtbare Dialogsteuerung waehrend
  `connecting`/`sending`/`resetting`
- keine widerspruechlichen Parallelaktionen im sichtbaren Broker-Dialog
  waehrend laufender Chat-/Reset-/Delete-Round-Trips
- optionaler Dev-Latenzpfad in der lokalen Sandbox zur reproduzierbaren
  manuellen Busy-State-Verifikation
- route-spezifischer Rate-Limit-/Retry-Pfad mit lokaler Cooldown-Sperre fuer
  `session-key`, `chat-request` und `chat-reset`
- lokaler sichtbarer Happy-Path-Smoke fuer den Broker-Dialog
  (`Key -> Chat -> Reset -> Delete`) ohne direkten Provider-Call
- lokaler sichtbarer stale-Session-Recovery-Smoke fuer den Broker-Dialog
  (Session aufbauen, extern invalidieren, Session-Fallback sehen, neu
  verbinden, Chat erneut senden)
- lokaler sichtbarer Session-Key-Rate-Limit-Smoke fuer den Broker-Dialog
  (mehrfach verbinden, sichtbares Key-Limit und lokalen Cooldown pruefen)
- lokaler sichtbarer Chat-Rate-Limit-Smoke fuer den Broker-Dialog
  (mehrfach Chat senden, sichtbares Chat-Limit und lokalen Cooldown pruefen)
- lokaler sichtbarer Reset-Rate-Limit-Smoke fuer den Broker-Dialog
  (nach erstem Chat mehrfach resetten, sichtbares Reset-Limit und lokalen
  Cooldown pruefen)
- lokaler sichtbarer Konfigurationsfehler-Smoke fuer den Broker-Dialog
  (ungueltige Base-URL, sichtbarer Config-Fehler, danach erfolgreicher
  Recovery-Connect)
- lokaler sichtbarer Policy-Block-Smoke fuer den Broker-Dialog
  (sichtbar abgelehnte Chat-Nachricht, danach erfolgreicher Recovery-Chat)
- lokaler sichtbarer Provider-/Upstream-Fehler-Smoke fuer den Broker-Dialog
  (sichtbarer Chat-Fehler bei intakter Session, danach erfolgreicher
  Recovery-Chat auf derselben Session)
- staging-naher Sandbox-Profil-Smoke fuer `APP_ENV=staging`
  (explizite Origins, deaktivierte Dev-Routen, Environment-Metadaten auf
  `/health` und `/ready`)
- staging-lokaler Runtime-Smoke mit selbst gestarteter Sandbox und
  nachgelagerter URL-Pruefung
- staging-URL-Smoke gegen ein bereits laufendes Zielsystem
- externer Staging-Ziel-Smoke gegen die erste ausgerollte Render-URL

## Sicherheitstests

Ziel:

- zentrale Schutzmassnahmen verifizieren

Pflichtfaelle:

- keine Secrets in Logs
- keine Provider-Aufrufe ohne Gateway
- Ablehnung uebergrosser Payloads
- Session-Isolation
- Egress-Allowlist

## Last- und Abuse-Tests

Ziel:

- Systemverhalten unter Druck verstehen

Pflichtfaelle:

- Burst-Traffic
- parallele Requests pro Session
- wiederholte ungueltige Keys
- uebergrosse Chat-Historien

## Spaetere Implementierungsschritte

1. Testpyramide und Verantwortlichkeit pro Testklasse festlegen
2. Testdaten fuer kleine, mittlere und grosse Schaltungen aufbauen
3. Sicherheitsregressionen als feste CI-Kriterien definieren
4. produktionsnahe Smoke-Tests fuer Staging und Rollout erstellen
