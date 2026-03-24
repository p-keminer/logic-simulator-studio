# Work Package

## Zweck

Dieses Dokument zerlegt die spaetere Umsetzung in klar abgrenzbare Arbeitspakete. Es dient als operative Uebersicht ueber die Reihenfolge und die Abhaengigkeiten.

## Doku-Pflege

Nach jeder Aenderung an diesem Dokument oder angrenzenden API-Dokuquellen
muss `npm run snapshot:sync` ausgefuehrt werden, damit `SNAPSHOT/API/`
aktuell bleibt.

## Aktueller Integrationsstand

Stand: 2026-03-24

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
- `API1-02` Staging-Access-Gate ist jetzt als Fastify-`onRequest`-Hook
  implementiert: alle `/v1/*`-Routen erfordern in `APP_ENV=staging` den
  Header `X-Staging-Token` mit dem konfigurierten `STAGING_ACCESS_TOKEN`;
  `/health` und `/ready` sowie OPTIONS-Preflight-Requests sind vom Gate
  ausgenommen, damit Render-Health-Checks und CORS-Preflight weiterhin
  funktionieren; bei fehlendem oder falschem Token antwortet das Gate mit
  `401 { error: "staging_access_denied" }`; der Token wird ausschliesslich
  als Render-Secret-Env-Var konfiguriert (`sync: false`) und darf nicht
  ins Repo; `staging-runtime-defaults.mjs` exportiert jetzt zusaetzlich
  `getStagingAccessToken`; der URL-Smoke uebergibt den Token an alle
  `/v1/*`-Requests und prueft zusaetzlich, dass ein Request ohne Token
  korrekt mit 401 abgelehnt wird
- `API1-04` Provider-Integration ist abgeschlossen: der Broker kann jetzt
  echte KI-Provider anbinden; implementiert sind `AnthropicProviderClient`
  (direkte Anthropic API ueber native fetch, kein npm-Paket) und
  `OpenAICompatibleProviderClient` (OpenAI-Format, konfigurierbare Base-URL
  fuer OpenAI, OpenRouter, Ollama und jede kompatible API); die Provider-
  Auswahl laeuft ueber `PROVIDER`, `PROVIDER_BASE_URL`,
  `PROVIDER_DEFAULT_MODEL`, `PROVIDER_TIMEOUT_MS` und
  `PROVIDER_MAX_ATTEMPTS` in `.env`; das `dev`-Script laedt `.env` jetzt
  ueber `node --env-file=.env`; `create-app.ts` baut den passenden Client
  und uebergibt korrekte `ProviderGatewayRuntime`-Overrides (Provider-Name,
  Modell, `allowedHosts` aus der Base-URL, Timeout, MaxAttempts); der
  API-Key wird ausschliesslich zur Laufzeit aus der Session geholt, nie in
  Logs oder Config; `.env.example` ist auf den neuen Stand gebracht;
  `.gitignore` deckt `.env.staging`, `.env.production` und `.env.*.local`
  ab; live verifiziert mit OpenRouter + `minimax/minimax-m2.7` (zwei
  erfolgreiche Chat-Requests, History-Tracking, korrekte Token-Zaehlung)
- `API1-05` Broker-Nachhärtung ist abgeschlossen: alle fuenf Haertungspunkte
  H1–H5 sind implementiert und durch 76 Tests abgesichert; H1 Prompt-Limit
  (32 768 Bytes, `PROMPT_TOO_LARGE`-Fehlerpfad bis zur dismissiblen
  UI-Fehlermeldung), H2 Model-Lock (`.strict()` auf `chatRequestSchema`
  plus expliziter Contract-Test), H3 History-Limit
  (`InMemoryConversationHistoryStore` mit `maxStoredTurnsPerConversation=32`,
  gleitendes Fenster, älteste Turns werden gedroppt), H4 allowedHosts-
  Durchsetzung (beide echten Provider-Clients pruefen den Ziel-Hostnamen
  gegen `request.runtime.allowedHosts` vor jedem Netzwerkzugriff – SSRF-
  Schutz, Key-Zugriff findet erst nach bestandenem Check statt), H5
  dispatchMode (`inferDispatchMode` gibt jetzt `'live'` statt `'disconnected'`
  fuer echte Provider-Clients zurueck, Audit-Logs und Metrics sind
  eindeutig)

Automatisch validiert:

- `npm test -- --run`
- `npm run build`

Naechster Kernslice:

- `API2-01` Befehlsprotokoll-Spezifikation beginnen

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

## Scope-Abschlussbewertung fuer API1-02

Bewertung: **abgeschlossen im aktuellen Scope**

Begruendung:

- staging-nahes Runtime-Profil ist vollstaendig konfiguriert:
  `APP_ENV=staging`, verpflichtende `ALLOWED_ORIGINS`, deaktivierte
  Dev-Fault-Routen, explizite Environment-Metadaten auf `/health`/`/ready`
- staging-lokaler Start- und Smoke-Pfad steht (`dev:staging-local`,
  `smoke:staging-runtime`, `smoke:staging-url`)
- Render-Blueprint (`render.yaml`) liegt vor als Entwicklungs-/Testwerkzeug
- Staging-Access-Gate ist als Fastify-`onRequest`-Hook implementiert:
  alle `/v1/*`-Routen erfordern `X-Staging-Token`; `/health`, `/ready` und
  OPTIONS-Preflight sind ausgenommen; bei fehlendem Token: `401 staging_access_denied`
- lokal verifiziert: `smoke:staging-url` gruen, `stagingAccessGate: ok`
- Architekturziel ist Self-Hosted: Nutzer laden die App herunter, starten
  den Broker lokal und tragen ihren eigenen API-Key ein; es gibt keinen
  zentralen Server und keinen Betrieb ueber den Autor des Repos
- `API1-03` Observability und urspruengliches `API1-04` Pilot-/Rollout
  entfallen als Planungspunkte, da kein zentraler Betrieb vorgesehen ist
- `API1-04` Provider-Integration ist abgeschlossen (siehe Integrationsstand)

## Scope-Abschlussbewertung fuer API1-04

Bewertung: **abgeschlossen im aktuellen Scope**

Begruendung:

- `AnthropicProviderClient` und `OpenAICompatibleProviderClient` sind
  implementiert; beide nutzen ausschliesslich Node-20-native `fetch`,
  kein zusaetzliches npm-Paket
- Provider-Auswahl, Runtime-Overrides und `.env`-Laden sind vollstaendig
  verdrahtet
- API-Key-Sicherheitsprinzip eingehalten: Key nur im RAM der Session,
  nie in Logs, Config oder Antworten
- live verifiziert mit OpenRouter + MiniMax M2.7: zwei aufeinanderfolgende
  Chat-Requests, History-Tracking (sectionCounts history 1→2), korrekte
  Token-Zaehlung, keine Fehler in 66 Unit-Tests

Offene Folgearbeit:

- `API1-05` Broker-Nachhärtung (Prompt-Limit, Model-Lock, History-Limit)
- `API2` AI-Action-Protocol (KI soll Schaltungs-Befehle ausgeben koennen)

## Scope-Abschlussbewertung fuer API1-05

Bewertung: **abgeschlossen im aktuellen Scope**

Begruendung:

- H1 Prompt-Limit: 32 768-Byte-Grenze im Gateway, `ProviderGatewayError('config')`
  → `SandboxError('PROMPT_TOO_LARGE', 400)` → `BackendBrokerApiError` →
  dismissible UI-Fehlerbanner; `PROMPT_TOO_LARGE` in beiden Error-Code-Typen
  (Backend + Frontend) verankert
- H2 Model-Lock: `chatRequestSchema` hat `.strict()` und kein `model`-Feld;
  Modell kommt ausschliesslich aus `PROVIDER_DEFAULT_MODEL` / Gateway-Runtime;
  Contract-Test verifiziert, dass `model` im Request zu Validierungsfehler fuehrt
- H3 History-Limit: `InMemoryConversationHistoryStore` mit
  `maxStoredTurnsPerConversation=32`; gleitendes Fenster, älteste Turns werden
  nach FIFO gedroppt; 3 Unit-Tests decken Happy Path, Overflow und
  Konversations-Isolation ab
- H4 allowedHosts-Durchsetzung: `AnthropicProviderClient` und
  `OpenAICompatibleProviderClient` pruefen den Ziel-Hostnamen vor dem ersten
  Netzwerkzugriff und Key-Aufruf gegen `request.runtime.allowedHosts`;
  Mismatch → `ProviderGatewayError('host-denied', ..., retryable=false)`;
  6 neue Tests beweisen Ablehnung und korrekte Reihenfolge (kein Key-Zugriff
  bei host-denied)
- H5 dispatchMode: `inferDispatchMode` gibt `'live'` statt `'disconnected'`
  fuer echte Provider-Clients; Typ-Union in `provider-types.ts` und
  `provider-gateway.ts` aktualisiert; `'disconnected'` vollstaendig entfernt
- Gesamtabdeckung: 76 Tests, 22 Test-Files, alle gruen; Typecheck sauber

## API1-05: Broker-Nachhärtung

Status: **abgeschlossen**

Ziel:

Den Broker gegen Missbrauch, unkontrollierte Kosten und Informationslecks
haerten, ohne die Self-Hosted-Architektur zu brechen.

### Haertungspunkte

**H1 – Prompt-Groessenlimit**

Aktuell kein Maximum auf `promptRenderedBytes`. Ein kaputt konfigurierter
oder boesartiger Client kann beliebig grosse Prompts schicken und dadurch
unerwartete Token-Kosten erzeugen.

Massnahme: Hardlimit im Gateway (z. B. 32 768 Bytes). Ueberschreitung
wirft `ProviderGatewayError('config', ...)` bevor der Provider-Call
abgeht.

**H2 – Model-Lock**

Das aktive Modell kommt aus `PROVIDER_DEFAULT_MODEL` in der Config.
Derzeit nicht geprueft ob ein Frontend-Request ein abweichendes Modell
uebergeben kann. Muss sichergestellt werden, dass ausschliesslich das
konfigurierte Modell verwendet wird.

Massnahme: Im Gateway vor dem Provider-Call validieren, dass
`request.runtime.model` mit dem konfigurierten Modell uebereinstimmt.

**H3 – Conversation-History-Limit**

Unbegrenzte Turns pro Conversation fuehren zu unbegrenzten Token-Kosten
pro Session.

Massnahme: Maximal-Turns-Grenze in `ConversationHistoryStore` (z. B. 50
Turns). Aeltere Turns werden nach FIFO gedropped.

**H4 – allowedHosts echte Durchsetzung**

Der `allowedHosts`-Check im Gateway prueft nur ob die Liste nicht leer
ist, nicht ob `fetch()` wirklich nur zu diesen Hosts geht. Da `base_url`
aus der Config kommt (nicht User-kontrolliert) ist das Risiko gering,
aber die Luecke sollte dokumentiert und spaeter geschlossen werden.

Massnahme (Phase 1): Explizit dokumentieren, dass Host-Enforcement
ausschliesslich ueber Config-Kontrolle laeuft. Phase 2 koennte
URL-Validierung vor dem `fetch()`-Call einfuehren.

**H5 – dispatchMode fuer echte Provider**

`inferDispatchMode` erkennt `openai-compatible-provider-client` und
`anthropic-provider-client` nicht und faellt auf `'disconnected'` zurueck.
Audit-Logs sind dadurch leicht irrefuehrend (kein Sicherheitsproblem,
aber Diagnoseproblem).

Massnahme: `inferDispatchMode` um `'live'`-Fall erweitern oder
Client-Namen anpassen.

### Umsetzungsreihenfolge

1. H1 Prompt-Limit (hoechste Prioritaet – direkte Kosten-Kontrolle)
2. H2 Model-Lock (verhindert unerwartete Modell-Substitution)
3. H3 History-Limit (Token-Budget-Kontrolle pro Session)
4. H5 dispatchMode (Diagnose-Qualitaet)
5. H4 allowedHosts (dokumentieren, spaeter haerten)

### Abnahme

- alle 66 bestehenden Unit-Tests weiterhin gruen
- `typecheck` sauber
- manueller Smoke: Prompt ueber Limit → klare Fehlermeldung im Frontend
- manueller Smoke: History waechst bis Limit, dann werden aelteste Turns
  gedropped ohne Fehler

## API2: AI-Action-Protocol

Status: **abgeschlossen** (2026-03-24)

### Kontext und Problem

Der Broker kommuniziert jetzt erfolgreich mit echten KI-Providern.
Das Modell antwortet jedoch nur mit erklaerenden Textnachrichten, weil
es nicht weiss, dass es aktiv Befehle an den Schaltungs-Simulator
ausgeben kann. Ein Benutzer, der "Baue mir einen Volladdierer" schreibt,
erhaelt eine Schritt-fuer-Schritt-Bauanleitung statt einer ausgefuehrten
Schaltungsaktion.

Ziel dieses Milestones: Das Modell kann strukturierte Befehle ausgeben,
die Frontend-seitig in echte Simulator-Aktionen uebersetzt werden.

### Architektur-Entscheidung: Wo wird geparst?

Drei Optionen:

- **Option A (gewaehlt fuer MVP)**: Broker leitet den Antworttext
  unveraendert ans Frontend durch; das Frontend parst selbst JSON-Bloecke
  aus dem Antworttext. Minimaler Broker-Eingriff, schnell umsetzbar.
- Option B: Broker parst Befehle und gibt strukturiertes
  `{ text, commands[] }` zurueck. Sauberere Trennung, mehr Broker-Logik.
- Option C: Streaming-Protokoll mit inkrementeller Befehlsausfuehrung.
  Spaetere Erweiterung, nicht MVP.

### API2-01: Befehlsprotokoll-Spezifikation

Status: **abgeschlossen** (commit `ab2bed5`, 2026-03-24)

Ziel: Ein klares, stabiles JSON-Format fuer Schaltungs-Befehle definieren,
das Modell und Frontend als gemeinsamen Vertrag nutzen.

Umsetzungsschritte:

1. Befehlstypen definieren. Kandidaten:
   - `ADD_GATE` – Gattertyp und optionale Position
   - `CONNECT` – Quell-Node/Port zu Ziel-Node/Port
   - `DELETE_NODE` – Node per ID oder Label entfernen
   - `CLEAR` – gesamte Schaltung leeren
   - `SET_LABEL` – Label eines Nodes setzen
   - `ADD_INPUT` / `ADD_OUTPUT` – Ein-/Ausgaenge hinzufuegen
2. JSON-Schema fuer einen Befehlsblock festlegen:
   ```json
   {
     "actions": [
       { "type": "ADD_GATE", "gateType": "XOR", "label": "XOR_1" },
       { "type": "CONNECT", "from": "XOR_1.out", "to": "XOR_2.in0" }
     ]
   }
   ```
3. Einbettungsformat im Antworttext festlegen: Markdown-Codeblock mit
   Sprach-Tag `circuit-actions` als eindeutiger Delimiter
4. Fehlerverhalten spezifizieren: Was passiert wenn ein Befehl ungueltg
   ist oder ein referenzierter Node nicht existiert?
5. Versionierung: Protokollversion in den Block einbauen (`"version": 1`)
   damit spaetere Breaking Changes erkennbar sind

Abnahme:

- Protokoll-Spezifikation als Markdown-Dokument unter
  `validation/api_anbindung/action-protocol/spec.md`
- mindestens Volladdierer, Halbaddierer und SR-Latch als
  Beispiel-Befehlssequenzen dokumentiert

### API2-02: System-Prompt-Erweiterung

Status: **abgeschlossen** (commit `547feb4`, 2026-03-24)

Ziel: Das Modell ueber verfuegbare Befehle, den Antwort-Codeblock und
das erwartete Verhalten informieren.

Umsetzungsschritte:

1. Neuen System-Prompt-Abschnitt im `PromptOrchestrator` anlegen, der
   alle verfuegbaren Befehlstypen beschreibt
2. Anweisungsformat: wann soll das Modell Befehle ausgeben (nur wenn
   der Nutzer explizit eine Schaltungsaktion anfragt), wann nur Text
3. Beispiel-Befehlssequenz in den Prompt einbauen (Few-Shot-Format)
4. Kontext-Beschreibung: das Modell bekommt den aktuellen Schaltungs-
   zustand als lesbaren Text (Nodes, Verbindungen) und kann darauf
   aufbauen
5. Prompt gegen mindestens zwei verschiedene Modelle testen
   (Anthropic und OpenRouter/MiniMax) und Anpassungen dokumentieren

Abnahme:

- Prompt erzeugt bei "Baue einen Volladdierer" zuverlassig einen
  gueltigen `circuit-actions`-Block
- Prompt erzeugt bei "Erklaer mir XOR" nur Text, keinen Befehlsblock

### API2-03: Frontend-Command-Parser und -Executor

Status: **abgeschlossen** (commit `6207b65`, 2026-03-24)

Ziel: Das Frontend kann `circuit-actions`-Bloecke aus dem Antworttext
extrahieren, validieren und als echte Simulator-Aktionen ausfuehren.

Umsetzungsschritte:

1. Parser implementieren: Markdown-Codeblock mit Tag `circuit-actions`
   aus dem Antworttext extrahieren (Regex oder Markdown-Parser)
2. JSON-Schema-Validierung der extrahierten Befehle
3. Command-Executor: jeden validierten Befehl in die entsprechende
   Simulator-Store-Aktion uebersetzen
4. Sequentielle Ausfuehrung mit Rollback-Faehigkeit bei Teilfehler
5. UI-Feedback: nach Ausfuehrung kurze Zusammenfassung anzeigen
   ("3 Gates hinzugefuegt, 4 Verbindungen erstellt")
6. Fehlerfeedback: ungueltige oder nicht ausfuehrbare Befehle sauber
   abfangen und dem Nutzer erklaeren

Abnahme:

- "Baue einen Volladdierer" fuehrt in der App zu einer vollstaendigen
  Volladdierer-Schaltung ohne manuellen Eingriff
- ungueltige Befehlsbloecke erzeugen eine klare Fehlermeldung, kein
  stilles Fehlschlagen

### API2-04: Circuit-State-Feedback-Loop

Status: **abgeschlossen** (2026-03-24, implizit durch API2-03-Architektur)

Ziel: Nach Befehlsausfuehrung erhaelt das Modell den aktualisierten
Schaltungszustand als Kontext, damit es Folgefragen korrekt beantworten
und Korrekturen vornehmen kann.

Analyse: Die Feedback-Schleife ergibt sich direkt aus der API2-03-
Implementierung. Das `snapshot`-Memo in `BackendBrokerModal` ist an
`circuit` aus dem Store gebunden. Nach jedem `GATE_ADD`/`WIRE_ADD`-
Dispatch rerendert React, das Memo berechnet den Post-Execution-Snapshot,
und die naechste `sendMessage`-Anfrage traegt diesen automatisch als
aktualisierten Circuit-Context an den Broker.

Zusaetzlich wurde ein Ausfuehrungs-Banner implementiert (UI-Feedback
aus API2-03 Schritt 5): nach jeder erfolgreichen Befehlsausfuehrung
zeigt das Modal eine Zusammenfassung ("N Befehle ausgefuehrt").

Abnahme:

- Folgeanfrage nach Schaltungsaufbau referenziert korrekt die
  tatsaechlich vorhandenen Nodes und Verbindungen ✅
- kein "ich weiss nicht was bisher gebaut wurde"-Verhalten bei
  Korrekturen ✅ (snapshot wird nach jedem Dispatch neu berechnet)

### API2-BF: Bugfixes und Prompt-Haertung

Status: **abgeschlossen** (commits `488a910`–`3a0e6e4`, 2026-03-24)

Nach der Erstimplementierung von API2 wurden bei manueller Verifikation
fuenf Klassen von Fehlern (B1–B5) identifiziert. B5 (Rollback bei hoher
Fehlerrate) wurde als nicht notwendig eingestuft und nicht umgesetzt.
Die uebrigen vier Bugs sowie mehrere Prompt-Probleme wurden vollstaendig
behoben.

#### B1 – Frontend-Timeout zu kurz

**Problem:** Der HTTP-Client im Frontend verwendete einen Timeout von
30 s, waehrend der Backend-Provider-Timeout 60 s betrug. Bei langsamen
Modellen wurde die Verbindung vorzeitig abgebrochen.

**Loesung:** Default-Timeout in `backendBroker/client.ts` von
`30_000` auf `90_000` ms angehoben (90 s > 60 s Backend-Timeout).

**Commit:** `e16726f`

#### B2 – ref:-Label aus Vorblock unrechtmaessig wiederverwendet

**Problem:** Das Modell verwendete in Folge-Turns `ref:`-Labels aus
frueheren `circuit-actions`-Bloecken, obwohl `ref` ausschliesslich
block-scoped und ephemer ist. Korrekt waere `id:` mit der persistenten
Gate-ID aus dem aktiven Circuit-Payload.

**Loesung:** Neuer System-Prompt-Abschnitt `CRITICAL – REF SCOPE` im
`PromptOrchestrator`, der erklaert, dass `ref`-Labels nur innerhalb
desselben Blocks existieren und in Folgeturns zwingend `id` aus dem
`active-circuit-payload` verwendet werden muss.

**Commit:** `488a910`

#### B3 – Auto-Layout startete stets bei (320, 280)

**Problem:** Jeder neue `circuit-actions`-Block legte Gates beginnend
an der fixen Ursprungsposition `(320, 280)` ab, unabhaengig von bereits
vorhandenen Gates. Ergebnis: neue Gates ueberlagerten bestehende.

**Loesung:** Bounding-Box-Ansatz in `circuitActionsExecutor.ts`.
Funktion `computeLayoutStartY` berechnet das maximale `y` aller
vorhandenen Gates und startet neue Gates bei `maxY + ROW_HEIGHT`.
`CLEAR`-Aktion setzt `layoutStartY` auf `ORIGIN_Y` zurueck.
Dabei wurde auch ein Typfehler behoben: `circuit.gates` ist ein
`Record<string, GateInstance>`, kein Array – korrigiert auf
`Object.values(circuit.gates)` beim Uebergeben der Gate-Liste.

**Commits:** `e16726f` (Offset-Logik), `c852d37` (Bounding-Box),
`c1e3107` (Object.values-Fix)

#### B4 – Markdown nicht gerendert im Chat

**Problem:** Die Chat-Ausgabe des Modells wurde als reiner Text
dargestellt; Markdown-Formatierung (`**fett**`, Aufzaehlungen, Codeblock)
war als Rohtext sichtbar.

**Loesung:** `react-markdown` mit expliziten `Components`-Renderern
in `BackendBrokerModal.tsx` integriert. Statt des `@tailwindcss/typography`
Prose-Plugins (in Tailwind v4 unzuverlaessig) werden alle relevanten
HTML-Elemente (`h1`–`h3`, `p`, `ul`, `ol`, `li`, `strong`, `em`,
`code`, `pre`, `table`, `th`, `td`, `thead`, `tbody`, `tr`) als
explizite JSX-Renderer deklariert und direkt gestylt.

**Commits:** `e66b40d` (react-markdown Basis), `c1e3107`
(Typography-Plugin), `c61df13` (Custom-Renderer-Finalisierung)

#### Prompt-Haertung: Schaltungs-Extension verboten

**Problem:** Das Modell versuchte, bestehende Schaltungen turn-uebergreifend
zu erweitern. Dabei wurden vorhandene Gates per `DELETE_NODE` geloescht,
die gleichzeitig in `CONNECT`-Befehlen referenziert wurden, was zu
abgetrennten LEDs und unvollstaendigen Schaltungen fuehrte.

**Loesung:** Zwei Regeln im RULES-Abschnitt des `circuit-actions-capability`
Prompts:
1. `DELETE_NODE` darf nicht auf ein Gate angewendet werden, das
   im selben Block auch verbunden wird.
2. Inkrementelle Erweiterung ueber Turns hinweg ist komplett verboten.
   Das Modell bietet stattdessen einen vollstaendigen Neuaufbau an
   (`CLEAR` gefolgt von der vollstaendigen Schaltung in einem Block).

**Commit:** `3cb39ac`

#### Prompt-Haertung: Wahrheitstabellen und Markdown-Tabellen

**Problem:** Das Modell gab proaktiv Wahrheitstabellen als Markdown
aus, obwohl Markdown-Tabellen in der Chat-UI nicht korrekt gerendert
wurden.

**Loesung:** Zweistufig:
1. Regel im `circuit-actions-capability`-Abschnitt: absolutes Verbot
   von Markdown-Tabellen (`|`-Syntax) in jeder Antwort; bei
   Wahrheitstabellen-Anfragen Verweis auf den eingebauten "W-Tabelle"-
   Button des Simulators.
2. Neuer Top-Level-Abschnitt `response-format` als erster Eintrag in
   `buildSystemSections()`, der als uebersteuernde Direktive gilt und
   die Tabellen-Regel sowie ein Kuerzlichkeitsgebot wiederholt. Durch
   die hohe Position im System-Prompt wird die Regel zuverlaessiger
   befolgt als tief verschachtelte Anweisungen.

**Commits:** `3909562` (W-Tabelle-Regel), `f0060a5` (absolutes
Tabellenverbot), `3a0e6e4` (response-format Top-Level-Abschnitt)

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
