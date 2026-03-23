# Status Report

## Erstellt

- isoliertes Backend-Subprojekt unter `validation/api_anbindung/backend-sandbox`
- lokale Sandbox-Skripte fuer `dev`, `build`, `typecheck`, `lint` und `test`
- Platzhalter fuer env-basierte Konfiguration ohne echte Geheimnisse
- Dokumentations- und Modulstruktur fuer den fruehen `API0`-Umsetzungsschnitt
- lokale `vitest.config.ts`, damit Testausfuehrung strikt in der Sandbox bleibt
- modulare Skeletons unter `src/app`, `src/shared`, `src/contracts` und `src/modules/*`
- Test-Skelette unter `tests/contracts`, `tests/circuit-context`, `tests/security`, `tests/unit`, `tests/integration` und `tests/smoke`
- Hilfsdokumente unter `docs/` fuer Implementierungsnotizen und manuelle Validierung
- `API0-04` als isolierter In-Memory-Flow fuer Session- und Key-Bindung
- Session-Routen mit Contract-Parsing, TTL, Rotation, Ablauf und Invalidierung
- TTL-Ablauf redigiert verlassene In-Memory-Key-Referenzen jetzt auch ohne spaeteren Folgezugriff auf die Session
- Security-Checks dafuer, dass Roh-Keys weder in Responses noch in Fehlern oder Logs auftauchen
- `API0-05` als lokale Circuit-Context-Whitelist mit Normalisierung, Begrenzung und Reduktion
- Oversize-Schutz mit harter Ablehnung, falls selbst die reduzierte Form das Byte-Limit der Sandbox ueberschreitet
- realistischere Circuit-Context-Fixtures fuer Whitelist-, Manipulations-, Reduktions- und Oversize-Faelle
- erster isolierter `chat/request`-Pfad mit Session-Check, Policy-Pruefung, Prompt-Orchestrierung und Stub-Response
- Chat-Contracts mit verpflichtender Session-Bindung und strikt validiertem reduziertem Active-Circuit-Context
- Error-Contract auf das tatsaechliche Sandbox-HTTP-Fehlerformat mit `error`-Envelope und `requestId` angeglichen
- `API0-06` als lokaler Guardrail- und Prompt-Template-Schnitt mit Scope-Escape-, Prompt-Injection- und Provider-Override-Regeln
- lokaler In-Memory-History-/Reset-Fluss fuer sessiongebundene Sandbox-Konversationen
- `API0-07` als providerneutraler Gateway-Schnitt mit Allowlist-Runtime, Retry-/Timeout-Diagnostik, Fehlernormalisierung sowie Mock-/Noop-Dispatch
- strukturierte Debug-Statements ueber Route-, Gateway- und Fehlerpfad mit korrelierbaren Metadaten fuer spaetere echte Anbindung
- Dokumentationsregel, dass diese Debug-Spur in der Sandbox verpflichtend erhalten bleiben soll
- Sicherheits- und Route-Tests fuer Chat-Anfragen ohne Provider- oder App-Integration
- `API0-08` als lokaler Schutzpfad fuer In-Memory-Rate-Limits, Audit-Events, Metrics und rekursive Secret-Redaction
- Session-, Chat-, Reset- und Provider-Pfade emittieren jetzt konsistente Audit- und Debug-Breadcrumbs mit `requestId`, `sessionId` und `conversationId`
- HTTP-Fehlerdetails und Log-Details werden in der Sandbox nur noch redigiert oder als Safe-Subset weitergereicht
- Security-Tests decken jetzt auch `429`-Pfade, Audit-Emission und verschachtelte Redaction ab
- Review-Fix: Der Chat-Flow prueft vor dem Policy-Gate nur noch Session-Metadaten und hydriert keinen Roh-Key mehr unnoetig in den Handler-Scope
- Review-Fix: Route-Logs geben an der Edge nur noch eine flache Provider-Summary aus, keine `providerDebug`-Payload mehr als Objekt
- `API0-09` als lokale App-Bridge-Kante fuer den spaeteren Handshake mit der aktuell geoeffneten Schaltung, weiterhin ohne aktive App-Imports
- lokale Bridge-Contracts, Snapshot-Mapping und Harnesses fuehren app-nahe Chat-/Reset-Eingaben auf die bestehenden Sandbox-Contracts zurueck
- Contract-, Integration- und Smoke-Tests pruefen den Bridge-Handoff isoliert innerhalb der Sandbox
- `API0-10` als Port/Adapter-Schnitt fuer `CurrentCircuitSnapshotProvider` mit Fixture-Provider und opt-in-Handshake-Route
- lokale Handshake-Routen fuer Capabilities und Current-Circuit laufen nur bei expliziter Aktivierung, bleiben sonst deaktiviert und verlangen auch im Opt-in-Fall eine aktive Sandbox-Session ueber `x-session-id`
- Harness und Route behandeln fehlende Provider-/Snapshot-Zustaende explizit als `409` bzw. `404`
- `API0-11` als sandbox-lokaler File-Adapter fuer `CurrentCircuitSnapshotProvider` mit JSON-Fixtures und isolierter Dateipfad-Grenze
- filebasierte Current-Circuit-Snapshots bleiben strikt auf Dateien innerhalb von `backend-sandbox` begrenzt, pruefen vor dem Lesen auch den aufgeloesten Realpfad gegen Symlink-/Junction-Escapes und werden vor Rueckgabe gegen den Bridge-Contract validiert
- Integrations- und Route-Tests decken jetzt Happy-Path, fehlende Datei, ungueltiges JSON, schemaungueltige Snapshots und Pfad-Escape-Block ab
- Review-Fix: opt-in-Local-App-Bridge-Routen geben Capabilities oder Current-Circuit-Daten nur noch fuer aktive Sandbox-Sessions frei
- Review-Fix: File-Adapter blocken jetzt auch Realpfad-Escapes ueber Symlinks oder Junctions und testen diesen Pfad isoliert
- Review-Fix: lokale Browser-App-Integration gegen den Sandbox-Broker ist jetzt
  ueber eine enge CORS-Freigabe fuer `localhost`-/`127.0.0.1`-Origins moeglich,
  damit `session/key`, Chat und Reset im Dev-Dialog nicht mehr als
  "Broker ist nicht erreichbar" an einem Browser-Preflight scheitern
- erster `API1-02`-Basisschnitt fuer staging-nahe Runtime-Profile:
  `APP_ENV=staging`, verpflichtende `ALLOWED_ORIGINS`, deaktivierte
  Dev-only-Fault-Routen ausserhalb von Development sowie
  Environment-Metadaten auf `/health` und `/ready`
- `.env.staging.example` als erste explizite Staging-Beispielkonfiguration
- lokaler Profil-Smoke `npm run smoke:staging-profile` fuer die staging-nahe
  Sandbox-Baseline
- staging-lokaler Startpfad `npm run dev:staging-local` mit fester
  URL-/Origin-Grundkonfiguration
- staging-lokaler Runtime-Smoke `npm run smoke:staging-runtime`, der die
  Runtime selbst startet und danach den URL-Smoke ausfuehrt
- staging-URL-Smoke `npm run smoke:staging-url` gegen ein bereits laufendes
  Zielsystem
- erster externer Zielpfad via Render-Blueprint in
  [render.yaml](/home/p-keminer/projects/uni/logic-gate-simulator/render.yaml)
  plus Deploy-Doku in
  [render-staging.md](/home/p-keminer/projects/uni/logic-gate-simulator/validation/api_anbindung/deployment/render-staging.md)

## Bewusst nur Stub

- keine aktive Verdrahtung zur bestehenden App
- keine produktiven Provider- oder Netzwerkaufrufe
- keine produktive Session-, Key-, Prompt- oder Policy-Logik ausserhalb der Sandbox-Regeln
- keine finale Persistenz- oder produktionsnahe Observability-Integration
- Rate-Limits, Audit-Sinks und Metrics bleiben absichtlich lokal, fluechtig und pro Sandbox-Prozess
- keine dauerhafte Chat-Historie, Provider-Dispatch-Logik oder produktive Reset-Semantik
- Key-Verwaltung bleibt absichtlich auf fluechtigen Sandbox-Speicher begrenzt
- Circuit-Reduktion bleibt absichtlich heuristisch und priorisiert noch keine semantisch relevanten Teilnetze

## TODO vor echter Integration

- Contracts mit dem realen Frontend-State und UI-Flow synchronisieren
- Session- und Secret-Strategie final waehlen und sicher implementieren
- Prompt-, Guardrail- und Providerpfade mit echten Laufzeitregeln ausarbeiten
- Chat-Reset, History-Speicher und Prompt-Templates von lokalem Sandbox-Verhalten auf echte Produktregeln heben
- Debug-Trail fuer die spaetere Live-Anbindung uebernehmen und an echte Provider-IDs, Timeouts und Egress-Daten anschliessen
- lokalen App-Bridge-Harness spaeter durch einen echten Adapter auf den offenen App-State ersetzen
- spaeteren Live-App-Zugriff ausschliesslich als Adapter gegen `CurrentCircuitSnapshotProvider` anbinden
- filebasierten Sandbox-Adapter spaeter durch einen echten Live-App-Adapter ersetzen, ohne File-I/O in Chat- oder Routenlogik zu ziehen
- Rate-Limits, Audit-Sinks und Metrics von lokaler In-Memory-Strategie auf echte Laufzeitdienste heben
- Integrations- und End-to-End-Validierung gegen die App erst nach Architekturfreigabe aufsetzen
- Groessenstrategie fuer uebergrosse Circuit-Payloads final entscheiden: kuerzen, zusammenfassen oder ablehnen
- lokales ESM/Runtime-Setup fuer spaetere produktionsnahe Ausfuehrung finalisieren
- semantische Circuit-Zusammenfassung fuer sehr grosse Schaltungen spaeter als Folgeschritt ausarbeiten
- Mapping auf den echten offenen App-State erst in einem getrennten Integrationsschritt anbinden

## Tests

- `npm install` innerhalb der Sandbox ausgefuehrt
- `npm run typecheck` erfolgreich
- `npm run build` erfolgreich
- `npm test` erfolgreich: `21` Testdateien bestanden, `66` Tests bestanden
- `npm run smoke:staging-profile` erfolgreich
- `npm run smoke:staging-runtime` erfolgreich
- Browser-CORS-Checks fuer lokale App-Origins auf `/v1/session/key` laufen
  jetzt ebenfalls isoliert innerhalb der Sandbox
- staging-nahe Profil-Checks fuer explizite Origins, deaktivierte
  Dev-Fault-Routen und Environment-Metadaten laufen ebenfalls isoliert
  innerhalb der Sandbox
- Circuit-Context-Checks fuer Whitelist, Manipulation, Reduktion und Oversize-Ablehnung laufen isoliert innerhalb der Sandbox
- Chat-Checks fuer Session-Bindung, Policy-/Rate-Limit-Block, Prompt-Bau, lokale History/Reset und Route-Haertung laufen isoliert innerhalb der Sandbox
- Error-Contract-Checks fuer den lokalen HTTP-Mapper laufen isoliert innerhalb der Sandbox
- Prompt-Orchestrator-Checks fuer feste Templates und deterministische Render-Ausgabe laufen isoliert innerhalb der Sandbox
- Provider-Gateway-Checks fuer Debug-Daten, Audit, Metrics, Retry-Diagnostik und Erfolgs-/Fehler-Events laufen isoliert innerhalb der Sandbox
- Redaction-Checks fuer verschachtelte Secret-Felder, Bearer-Token und URL-Credentials laufen isoliert innerhalb der Sandbox
- App-Bridge-Checks fuer Snapshot-Mapping, lokalen Harness-Handoff und Smoke-Fluss laufen isoliert innerhalb der Sandbox
- Current-Circuit-Provider- und Handshake-Route-Checks fuer opt-in-Routen, aktive `x-session-id`-Bindung, `404` bei fehlendem Snapshot, `409` ohne Provider sowie filebasierte Snapshot-Validierung inklusive Realpfad-Escape-Block laufen isoliert innerhalb der Sandbox
- manuelle Validierung noch nicht ausgefuehrt

## Hinweise

- direkte `npm`-Aufrufe innerhalb WSL griffen in dieser Session auf das Windows-`npm` im Pfad zu; die Sandbox-Checks wurden deshalb stabil ueber `cmd /c pushd` gegen denselben Zielordner via Windows-UNC-Pfad ausgefuehrt
- Vitest-Discovery bleibt absichtlich auf echte `*.test.ts`- und `*.spec.ts`-Dateien begrenzt; Hilfsdateien wie `tests/**/fixtures.ts` werden nicht als Suites behandelt
- `vitest.config.ts` setzt den Sandbox-Root jetzt explizit auf dieses Verzeichnis, damit die Vollsuite auf dem gemappten UNC-Pfad reproduzierbar laeuft
- `vitest` laeuft ueber das normale `npm test`-Script auf dem UNC-Pfad stabil; nur ein zusaetzlicher JSON-Reporter mit `outputFile` kann in dieser Umgebung noch auf ein `lstat 'Z:\\'` laufen
- `git status` wurde fuer diese Session mit einem expliziten `safe.directory`-Override nur lesend gegen den UNC-Pfad abgefragt, weil Git den WSL-Pfad sonst als `dubious ownership` ablehnt
- im WSL-Git-Status erscheint `validation/api_anbindung/` insgesamt als untracked Bereich; innerhalb des Zielpfads ist die Sandbox vollstaendig angelegt
- im Repo liegen parallel weitere, fremde Aenderungen ausserhalb der Sandbox; in diesem API0-11-Schritt wurden nur Dateien unter `validation/api_anbindung/backend-sandbox` bearbeitet
