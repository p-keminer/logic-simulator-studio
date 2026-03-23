# Work Package

## Zweck

Dieses Dokument zerlegt die spaetere Umsetzung in klar abgrenzbare Arbeitspakete. Es dient als operative Uebersicht ueber die Reihenfolge und die Abhaengigkeiten.

## Doku-Pflege

Nach jeder Aenderung an diesem Dokument oder angrenzenden API-Dokuquellen
muss `npm run snapshot:sync` ausgefuehrt werden, damit `SNAPSHOT/API/`
aktuell bleibt.

## Aktueller Integrationsstand

Stand: 2026-03-23

- `API0` ist im Sandbox- und Frontend-Vorbau weitgehend angelegt:
  Session-Key-Registrierung, Chat-Request, Chat-Reset, Circuit-Context-
  Reduktion, Guardrails, Provider-Gateway, Audit/Redaction und die lokale
  App-Bridge-Kante existieren bereits
- die aktive App besitzt jetzt einen dedizierten Broker-Client, einen
  lokalen Circuit-Context-Adapter, einen Snapshot-Bridge-Typ sowie ein
  standardmaessig sichtbares Broker-Modal fuer Key, Chat, Reset und Delete
- der aktuelle Slice `API1-01a` haertet den App-seitigen Broker-Flow:
  Key-/Chat-/Reset-/Delete-Zustaende laufen jetzt ueber einen gemeinsamen
  UI-State-Reducer statt ueber leicht auseinanderlaufende Einzelpfade
- Session-Invalidierung verhaelt sich jetzt konsistent ueber Chat, Reset und
  Delete: Session, Conversation und lokale Chat-History werden im selben
  Zustandspfad geleert
- Chat-Sendefehler ohne Session-Invalidierung rollen jetzt den optimistischen
  lokalen User-Turn wieder zurueck, damit im Modal keine halbfertigen
  Phantom-Nachrichten stehenbleiben
- das sichtbare Broker-Modal besitzt jetzt zusaetzlich einen expliziten
  lokalen Recovery-Pfad `Lokal leeren`, der Session-, Conversation- und
  Chat-Zustand in der App ohne Broker-Round-Trip sauber zuruecksetzt
- die Broker-Base-URL kann jetzt im Modal robust als Draft editiert werden;
  unvollstaendige oder ungueltige URLs fuehren erst beim Verbinden zu einer
  klaren Konfigurationsmeldung statt den Dialog beim Tippen zu zerlegen
- die Broker-Base-URL ist jetzt zusaetzlich auf sichere Grundformen
  eingeschraenkt: nur `http/https`, keine eingebetteten Zugangsdaten
- im aktuellen App-Scope ist die Broker-Base-URL zusaetzlich auf lokale
  Loopback-Hosts begrenzt (`localhost`, `127.0.0.1`, `::1`), bis spaetere
  Staging-/Rollout-Schritte eine bewusst weitere Zielmenge freigeben
- die sichtbare Dialogsteuerung fuer Base-URL-, Key- und Chat-Aktionen laeuft
  jetzt ueber einen kleinen gemeinsamen Control-State-Helper, damit
  Verbindungsversuche den Konfigurationspfad nicht mid-flight auseinanderziehen
- derselbe Control-State sperrt jetzt auch widerspruechliche Parallelaktionen
  waehrend `sending`, `resetting` und `disconnecting`, damit der sichtbare
  Broker-Dialog immer nur einen Broker-Round-Trip gleichzeitig zulaesst
- fuer diese Busy-State-Checks besitzt die lokale Sandbox jetzt zusaetzlich
  einen optionalen Dev-Latenzschalter `DEV_RESPONSE_DELAY_MS`, damit
  `connecting`-/`sending`-/`resetting`-Phasen bei Bedarf bewusst sichtbar
  verlaengert werden koennen
- route-spezifische `RATE_LIMITED`-Antworten tragen jetzt den betroffenen
  Request-Typ (`session-key`, `chat-request`, `chat-reset`) bis in die App,
  damit der sichtbare Broker-Dialog den passenden Retry-Pfad per Countdown
  sperren kann statt nur eine passive Fehlermeldung anzuzeigen
- die sichtbare Fehlerkopie fuer `RATE_LIMITED` ist jetzt ebenfalls
  route-spezifisch, damit Key-, Chat- und Reset-Limits im Dialog sprachlich
  klar unterscheidbar bleiben
- route-spezifische Rate-Limit-Warnungen raeumen sich jetzt nach Ablauf des
  zugehoerigen lokalen Countdowns auch selbst wieder weg, damit keine stale
  Warnkaesten im Dialog stehenbleiben
- sichtbare Broker-Fehler verschwinden jetzt zusaetzlich auch dann direkt,
  wenn der Nutzer aktiv an URL, Key oder den betroffenen Entwurfsfeldern
  weiterarbeitet
- die sichtbaren Fehlertitel benennen jetzt auch bei nicht-rate-limitierten
  Fehlern klar den betroffenen Dialogpfad wie Verbindung, Chat, Reset oder
  Key-Loeschen
- der sichtbare Busy-State spricht im Dialog jetzt auch progressbezogen
  eindeutiger, z. B. `Verbinde...`, `Sende...`, `Reset laeuft...` oder
  `Loesche...`
- `API1-01b` besitzt jetzt zusaetzlich einen lokalen automatisierten
  Happy-Path-Smoke fuer den sichtbaren Broker-Dialog (`Key -> Chat -> Reset ->
  Delete`) ueber `npm run broker:smoke`
- derselbe `API1-01b`-Pfad deckt jetzt auch einen ersten lokalen
  stale-Session-Recovery-Smoke ueber `npm run broker:smoke:recovery` ab
- zusaetzlich deckt `API1-01b` jetzt einen lokalen sichtbaren
  Session-Key-Rate-Limit-Smoke ueber `npm run broker:smoke:rate-limit` ab
- zusaetzlich deckt `API1-01b` jetzt einen lokalen sichtbaren
  Chat-Rate-Limit-Smoke ueber `npm run broker:smoke:chat-rate-limit` ab
- zusaetzlich deckt `API1-01b` jetzt einen lokalen sichtbaren
  Reset-Rate-Limit-Smoke ueber `npm run broker:smoke:reset-rate-limit` ab
- zusaetzlich deckt `API1-01b` jetzt einen lokalen sichtbaren
  Konfigurationsfehler-Smoke ueber `npm run broker:smoke:config-error` ab
- zusaetzlich deckt `API1-01b` jetzt einen lokalen sichtbaren
  Policy-Block-Smoke ueber `npm run broker:smoke:policy-block` ab
- zusaetzlich deckt `API1-01b` jetzt einen lokalen sichtbaren
  Provider-/Upstream-Fehler-Smoke ueber
  `npm run broker:smoke:provider-error` ab
- `API1-01` gilt damit im aktuellen Scope als abgeschlossen:
  der sichtbare App-Flow `Key -> Chat -> Reset -> Delete` ist manuell
  verifiziert und zusaetzlich ueber einen lokalen Smoke-Ring fuer Happy Path,
  Recovery und die relevanten sichtbaren Negativpfade abgesichert
- `API1-02` hat jetzt den ersten konkreten Staging-Basisschnitt:
  explizites Runtime-Profil `APP_ENV=staging`, verpflichtende
  `ALLOWED_ORIGINS`, deaktivierte Dev-only-Fault-Routen ausserhalb von
  Development, Environment-Metadaten auf `/health` und `/ready` sowie einen
  ersten staging-nahen Smoke ueber `backend-sandbox npm run smoke:staging-profile`
- derselbe `API1-02`-Pfad besitzt jetzt zusaetzlich einen staging-lokalen
  Startbefehl `backend-sandbox npm run dev:staging-local`, einen
  staging-lokalen Runtime-Smoke `backend-sandbox npm run smoke:staging-runtime`
  sowie einen staging-URL-Smoke `backend-sandbox npm run smoke:staging-url`
  fuer bereits laufende Zielsysteme
- zusaetzlich liegt jetzt der erste externe Zielpfad als Render-Blueprint in
  [render.yaml](/home/p-keminer/projects/uni/logic-gate-simulator/render.yaml)
  mit begleitender Deploy-Doku unter
  [render-staging.md](/home/p-keminer/projects/uni/logic-gate-simulator/validation/api_anbindung/deployment/render-staging.md)
- das erste echte externe Staging-Ziel laeuft jetzt ueber Render unter
  `https://logic-simulator-broker-staging.onrender.com`; der Guardrail-
  und Ziel-Smoke wird dagegen als eigener API1-02-Verifikationsschritt
  gefahren
- fuer `API1-02` ist damit zwar der erste echte HTTPS-Stagingpfad da, aber
  die Sicherheitsgrenze ist bewusst noch nicht als "hoch abgesichert"
  bewertet: vor spaeterer breiterer Frontend-Anbindung bleiben ein
  vorgeschalteter Staging-Zugangsschutz, eine haertere Session-Key-
  Registrierungsbarriere, exakte nicht-platzhalterhafte Frontend-Origins,
  abuse-orientierte Alarmierung und eine kontrollierte Oeffnung des
  Frontend-Remote-Broker-Pfads Pflicht
- bewusste Folgearbeit liegt jetzt nicht mehr in weiterer
  App-Flow-Grundhaertung, sondern in `API1-02` Staging, `API1-03`
  Observability/Alarmierung und `API1-04` Pilot-/Rollout-Vorbereitung
- app-seitige Regressionsabdeckung existiert jetzt nicht mehr nur fuer Client,
  Error-Mapping und Circuit-Context, sondern auch fuer den gemeinsamen
  Broker-UI-Stateflow

Automatisch validiert:

- `npm test -- --run`
- `npm run build`

Naechster Kernslice:

- den jetzt vorhandenen staging-lokalen Runtime-Pfad ueber das echte
  Render-Ziel per `backend-sandbox npm run smoke:staging-url` bestaetigen
- danach den Staging-Zugangsschutz haerten, bevor der Remote-Broker-Pfad in
  der App ueber Loopback hinaus geoeffnet wird:
  1. vorgeschalteten Staging-Access-Gate oder vergleichbare Auth-Barriere
     vor den oeffentlichen Service setzen
  2. Session-Key-Registrierung nicht mehr als frei oeffentlichen Endpoint
     belassen, sondern an Staging-Access oder eine explizite
     Betreiberfreigabe koppeln
  3. `ALLOWED_ORIGINS` auf die echte Frontend-Staging-Domain festziehen und
     Platzhalterwerte aus der Laufzeit entfernen
  4. abuse-orientierte Observability fuer Session-Key-Spikes,
     CORS-Ablehnungen und Provider-/Upstream-Fehler aktivieren
  5. den sichtbaren App-Client erst danach bewusst fuer Remote-Staging-Ziele
     freigeben
- erst nach diesem Security-Checkpoint `API1-03` Observability/Alarmierung
  und `API1-04` Pilot-/Rollout-Vorbedingungen angehen

## Scope-Abschlussbewertung fuer API1-01

Bewertung: **abgeschlossen im aktuellen Scope**

Begruendung:

- der sichtbare Broker-Dialog ist standardmaessig freigeschaltet und laeuft
  ueber einen einzigen Produktpfad
- `Key -> Chat -> Reset -> Delete` ist manuell durchgeprueft und lokal
  funktional bestaetigt
- Session-Invalidierung, lokaler Recovery-Pfad, URL-Haertung,
  widerspruchsfreie Busy-States und route-spezifische Rate-Limit-UX sind
  semantisch abgesichert
- lokale UI-Smokes decken jetzt Happy Path, stale Session Recovery,
  Session-Key-/Chat-/Reset-Limits, Konfigurationsfehler, Policy-Block und
  Provider-/Upstream-Fehler sichtbar ab
- der verbleibende Ausbau ist jetzt primaer betrieblicher Natur
  (`API1-02` bis `API1-04`), nicht mehr fehlende Grundsemantik des
  sichtbaren App-Flows

## Arbeitspaket 1: Scope absichern

Ziel:

- Backend strikt auf "aktuell geoeffnete Schaltung" begrenzen

Umsetzungsschritte:

1. ADRs aus `decisions/` bestaetigen
2. Chat-Use-Cases definieren
3. verbotene Faehigkeiten explizit dokumentieren
4. maximalen Kontextumfang der Schaltung festlegen

Abnahme:

- kein Dokument laesst Multi-Projekt-Verhalten oder Dateisystemzugriff offen

## Arbeitspaket 2: Sicherheitsrahmen festlegen

Ziel:

- sichere Grundregeln fuer Secrets, Sessions, Egress und Abuse-Schutz festziehen

Umsetzungsschritte:

1. Bedrohungsmodell aus `security/` freigeben
2. Secret-Lebenszyklus definieren
3. Rate-Limits und Request-Budgets festlegen
4. Logging-Redaktion und Audit-Felder spezifizieren

Abnahme:

- alle sicherheitskritischen Datenfluesse haben dokumentierte Gegenmassnahmen

## Arbeitspaket 3: API und Datenmodell stabilisieren

Ziel:

- robuste und versionierte Vertraege zwischen Frontend, Backend und Provider schaffen

Umsetzungsschritte:

1. Request- und Response-Schemas festlegen
2. Kontextformat fuer die offene Schaltung finalisieren
3. Provider-Abstraktion definieren
4. Fehlercodes und Retry-Regeln vereinheitlichen

Abnahme:

- Vertragsanpassungen sind versioniert und testbar

## Arbeitspaket 4: Backend-Module implementieren

Ziel:

- kleine, klar getrennte Services oder Module statt monolithischer Logik

Umsetzungsschritte:

1. `edge-api` umsetzen
2. `auth` und Session-Bindung aufbauen
3. `circuit-context` fuer Normalisierung und Pruefung umsetzen
4. `policy-guardrails` und `prompt-orchestrator` anschliessen
5. `provider-gateway` mit Egress-Kontrolle anbinden
6. `audit-and-observability` integrieren

Abnahme:

- jedes Modul hat messbare Verantwortung und eigene Tests

## Arbeitspaket 5: Betrieb und Deployment

Ziel:

- sichere und nachvollziehbare Laufzeitumgebungen schaffen

Umsetzungsschritte:

1. Environment-Modell definieren
2. Secret-Backends, Key-Verschluesselung und Rotation anschliessen
3. Netzwerk-Policies und Ausleitungsziele begrenzen
4. Betriebschecklisten und Alarmierung festlegen

Abnahme:

- produktionsnahe Umgebung laesst sich reproduzierbar starten und pruefen

## Arbeitspaket 6: Test und Rollout

Ziel:

- sicherer Start mit begrenztem Risiko

Umsetzungsschritte:

1. Testmatrix aus `testing/` umsetzen
2. Missbrauchs- und Lasttests fahren
3. Pilot-Rollout aktivieren
4. Logging, Kosten und Fehlerraten beobachten
5. schrittweise Freigabe erweitern

Abnahme:

- Rollout-Kriterien und Rueckfallstrategie sind schriftlich freigegeben

## Manuelle Verifikation fuer API1-01a

1. App mit kleiner offener Schaltung starten
2. Broker-Modal oeffnen und einen gueltigen Sandbox-Key setzen
3. Erwartung:
   - Session-ID und Gueltig-bis erscheinen
   - Basis-URL ist waehrend aktiver Session gesperrt
4. Eine Chat-Nachricht senden
5. Erwartung:
   - die Nachricht laeuft ueber den Broker
   - kein direkter Provider-Call aus der App
   - Conversation-ID wird gesetzt
6. Broker-Reset ausfuehren
7. Erwartung:
   - lokale Chat-History ist leer
   - Conversation-ID ist zurueckgesetzt
   - Session bleibt aktiv
8. Broker-Key loeschen
9. Erwartung:
    - Session-, Conversation- und Chat-Zustand sind leer
    - das Modal springt in den inaktiven Zustand zurueck
10. Einen Session-Fehler provozieren, z. B. ueber stale Session oder
    ungueltige Session-ID im Sandbox-Backend
11. Erwartung:
    - dieselbe konsistente Session-Invalidierung greift auch fuer Chat, Reset
      oder Delete
    - auch `NOT_FOUND` / `Session was not found.` wird dabei als stale Session
      behandelt und nicht als blockierender generischer Request-Fehler
    - der Nutzer sieht einen Session-Fehler und keinen halblebenden
      Restzustand
12. Zusaetzlich einen echten Chat-Sendefehler ohne Session-Invalidierung
    provozieren, z. B. Session aktiv lassen, den Broker-Prozess stoppen und
    **vor dem Sendeversuch noch nicht neu starten**
13. Erwartung:
    - die Fehlermeldung erscheint, aber der lokale User-Turn bleibt nicht als
      scheinbar gesendete Nachricht im Verlauf stehen
    - der Chat-Entwurf bleibt fuer einen Retry erhalten
14. Danach den Broker wieder starten, den noch angezeigten Broker-Key zuerst
    loeschen, anschliessend einen neuen Broker-Key setzen und die Nachricht
    erneut senden
15. Erwartung:
    - nach dem neuen Key funktioniert der Retry wieder normal
16. Im Fehlerzustand zusaetzlich `Lokal leeren` klicken
17. Erwartung:
    - das Modal springt sofort in den lokalen Leerlaufzustand zurueck
    - Session-, Conversation- und Chat-Zustand sind lokal leer
    - direkt danach kann wieder ein neuer Broker-Key gesetzt werden
18. Danach bei inaktivem Dialog eine bewusst ungueltige Broker-Base-URL
    eintragen, z. B. `http://127.0.0.1:`
19. Erwartung:
    - das Tippen selbst zerlegt den Dialog nicht
    - erst beim `Broker-Key setzen` erscheint eine klare Meldung
      `Broker-Base-URL ist ungueltig`
    - nach dem Korrigieren der URL kann der Dialog normal weiterarbeiten
20. Danach eine URL mit unerlaubtem Schema oder eingebetteten Zugangsdaten
    pruefen, z. B. `ftp://127.0.0.1:8787` oder
    `http://user:secret@127.0.0.1:8787`
21. Erwartung:
    - die Eingabe bleibt editierbar
    - beim Verbinden erscheint eine klare Konfigurationsmeldung
    - die URL wird nicht stillschweigend akzeptiert
22. Danach eine externe Host-URL pruefen, z. B. `https://example.com/v1`
23. Erwartung:
    - auch diese URL wird im aktuellen Scope klar abgelehnt
    - die Meldung verweist darauf, dass derzeit nur lokale Broker-Hosts
      erlaubt sind
24. Danach mit gueltiger lokaler URL einen Verbindungsversuch starten
25. Erwartung:
    - waehrend `connecting` sind Base-URL-Feld, Key-Feld und Connect-Button
      nicht erneut frei bedienbar
    - falls die lokale Sandbox dafuer zu schnell antwortet, kann der Check
      mit `DEV_RESPONSE_DELAY_MS=400 npm run dev` wiederholt werden
26. Danach mit aktiver Session eine Chat-Nachricht absenden und waehrend
    `sending` zusaetzlich `Broker-Reset` oder `Broker-Key loeschen` probieren
27. Erwartung:
    - waehrend des laufenden Sendens sind weitere konflikttraechtige Aktionen
      gesperrt
    - auch der Reset-Entwurf und das Chat-Feld selbst sind bis zum Abschluss
      des Round-Trips nicht parallel veraenderbar
    - falls der Zustand lokal zu kurz sichtbar ist, denselben Check mit
      aktivierter Dev-Latenz wiederholen
28. Danach denselben Gegencheck auch einmal fuer `Broker-Reset` machen
29. Erwartung:
    - waehrend `resetting` sind `Nachricht senden` und `Broker-Key loeschen`
      ebenfalls gesperrt
30. Danach gezielt einen `RATE_LIMITED`-Fall fuer `Broker-Key setzen`,
    `Nachricht senden` oder `Broker-Reset` provozieren
31. Erwartung:
    - die Fehlermeldung zeigt weiter `retryAfter`
    - zusaetzlich ist jetzt genau die betroffene Aktion lokal bis zum
      Countdown-Ende gesperrt
    - andere nicht betroffene Pfade bleiben weiterhin benutzbar, z. B.
      `Broker-Key loeschen` oder `Lokal leeren`
