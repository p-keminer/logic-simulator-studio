# BACKLOG

## Zweck

Dieses Backlog uebersetzt die Roadmap in konkrete Arbeitspakete. Die Prioritaeten heissen absichtlich `API0`, `API1` und `API2`.

Bedeutung:

- `API0`: muss vor echter Provider-Nutzung stehen
- `API1`: wichtig fuer stabile Integration, Staging und ersten produktionsnahen Einsatz
- `API2`: Optimierung, Haertung und Ausbau nach stabiler Grundfunktion

## Bearbeitungsreihenfolge

1. alle `API0`-Pakete abschliessen
2. danach `API1` fuer Integration und Rollout
3. `API2` erst nach stabiler Pilotphase

## API0

### API0-01 Scope und ADR-Freeze

Ziel:

- Scope, Grenzen und verbotene Faehigkeiten final festziehen

Lieferobjekte:

- freigegebene ADRs
- finalisierte Scope-Definition
- dokumentierte Nicht-Ziele

Abhaengigkeiten:

- keine

Grundlegende Umsetzungsgedanken:

- ein kurzes Decision-Template pro ADR reicht aus, solange Kontext, Entscheidung, Konsequenzen und Nicht-Ziele fest erfasst werden
- die Scope-Grenze sollte im spaeteren Backend auch technisch sichtbar sein, zum Beispiel durch genau einen `chat/request`-Payload fuer den aktuell offenen Circuit
- verbotene Faehigkeiten sollten nicht nur dokumentiert, sondern spaeter auch in Contracts und Guardrails gespiegelt werden

Automatisierbare Validierung:

- Markdown-Link-Check
- optionales Markdown-Linting

Manuelle Validierung:

- Architektur-Review gegen `decisions/`
- Review, dass nur die aktuell geoeffnete Schaltung im Scope bleibt

Definition of Done:

- keine offenen Grundsatzfragen zu Scope, Broker-Prinzip und Key-Modell

### API0-02 Broker-API und Contract-Schemas

Ziel:

- versionierte Vertraege fuer Session-Key, Chat-Request, Chat-Reset und Fehlerformat festlegen

Lieferobjekte:

- versionierte Request- und Response-Schemas
- Fehlercode-Katalog
- abgestimmtes Circuit-Payload-Schema

Abhaengigkeiten:

- `API0-01`

Grundlegende Umsetzungsgedanken:

- die Broker-API sollte frueh als versioniertes JSON-Schema oder OpenAPI-Dokument angelegt werden
- fuer `session/key`, `chat/request`, `chat/reset` und Fehlerformate sollten Laufzeitvalidierung und gemeinsame Typableitung aus derselben Quelle kommen
- beim Circuit-Payload ist eine harte Feld-Whitelist sinnvoll, die sich am existierenden `Circuit`-Modell orientiert, aber UI- und Debug-Felder ausschliesst

Automatisierbare Validierung:

- Contract-Tests
- Schema-Tests fuer falsche Typen, unbekannte Felder und Groessenlimits
- Snapshot-Tests fuer Fehlerantworten

Manuelle Validierung:

- Payload-Walkthrough mit realen Beispielschaltungen
- Review, dass keine Provider-spezifischen Felder nach aussen freigelegt werden

Definition of Done:

- Frontend und Backend koennen gegen denselben Vertrag implementiert werden

### API0-03 Backend-Skelett und Modulgrenzen

Ziel:

- Broker-Grundgeruest mit klaren Modulen und zentraler Konfiguration aufbauen

Lieferobjekte:

- Basisserver
- Modulstruktur gemaess Architektur
- zentrale Fehler- und Config-Schicht
- Health- und Readiness-Endpunkte

Abhaengigkeiten:

- `API0-02`

Grundlegende Umsetzungsgedanken:

- eine modulare Ordnerstruktur sollte den Plan direkt spiegeln, damit `edge-api`, `auth`, `circuit-context`, `policy-guardrails`, `prompt-orchestrator`, `provider-gateway` und `audit-and-observability` von Anfang an getrennt leben
- Konfiguration sollte ueber eine zentrale Config-Schicht mit env-Validierung laufen statt verteilt aus `process.env`
- Fehlerbehandlung sollte frueh in ein einheitliches internes Fehlerobjekt ueberfuehrt werden, damit spaeter alle Module konsistent arbeiten

Automatisierbare Validierung:

- Lint
- Typecheck
- Architekturtests fuer erlaubte Modulabhaengigkeiten
- Basis-Unit-Tests

Manuelle Validierung:

- lokaler Start des Brokers
- Review, dass keine Fachlogik bereits im Edge-Layer landet

Definition of Done:

- der Broker startet reproduzierbar und die Modulgrenzen sind im Code sichtbar

### API0-04 Session-Bindung und Key-Brokering

Ziel:

- Benutzer-Key sicher ueber Session-Kontext statt ueber rohe Wiederverwendung handhaben

Lieferobjekte:

- Session-Modell
- Endpunkt fuer Key-Registrierung
- Endpunkt fuer Key-Loeschung
- Session-Reset und TTL-Regeln

Abhaengigkeiten:

- `API0-03`

Grundlegende Umsetzungsgedanken:

- der Key sollte nach Registrierung nicht mehr als Wert, sondern nur noch als sessiongebundene Referenz weiterverwendet werden
- als erste praktikable Architektur eignet sich ein kurzlebiger Session-Store mit TTL, zum Beispiel Redis oder eine vergleichbare In-Memory-Loesung
- Session-Reset und Key-Loeschung sollten denselben zentralen Pfad fuer Aufraeumen, Invalidierung und Audit-Events nutzen

Automatisierbare Validierung:

- Unit-Tests fuer Ablauf, Rotation und Loeschung
- Integrationstests fuer Key setzen und Key loeschen
- Redaktions-Tests fuer Logs und Fehlerobjekte

Manuelle Validierung:

- Key setzen, Session nutzen, Session beenden, Key loeschen
- pruefen, dass der Key nie im Response-Body oder im Log erscheint

Definition of Done:

- Keys werden nie an das Frontend zurueckgegeben und Sessions sind sauber invalidierbar

### API0-05 Circuit-Context-Whitelisting und Reduktion

Ziel:

- aus dem offenen Circuit einen sicheren, kompakten Backend-Kontext erzeugen

Lieferobjekte:

- Mapping vom App-State auf Broker-Schema
- Feld-Whitelist
- Groessen- und Versionspruefung
- Reduktions- oder Zusammenfassungsregeln fuer grosse Schaltungen

Abhaengigkeiten:

- `API0-02`
- `API0-03`

Grundlegende Umsetzungsgedanken:

- das Circuit-Payload sollte in einem dedizierten Mapper aus dem Frontend-State erzeugt werden und nicht quer durch die UI verteilt
- auf Backend-Seite ist ein Normalisierungsschritt sinnvoll, der Reihenfolgen, Defaults und fehlende optionale Felder stabilisiert
- fuer grosse Schaltungen lohnt sich eine zweistufige Reduktion: erst Feld-Whitelist, dann groessenbasierte Kompaktierung oder Teilzusammenfassung

Automatisierbare Validierung:

- Unit-Tests fuer Mapping und Normalisierung
- Grenzwerttests fuer Payload-Groesse
- Fixture-Tests mit kleinen und grossen Circuit-Beispielen

Manuelle Validierung:

- Test mit minimaler Schaltung
- Test mit komplexer Schaltung
- Test mit manipuliertem oder ungueltigem Payload

Definition of Done:

- nur erlaubte Daten werden weitergegeben und Grenzfaelle werden kontrolliert behandelt

### API0-06 Policy-Guardrails und Prompt-Orchestrierung

Ziel:

- erlaubte Aufgaben festziehen und Prompt-Bildung sicher kontrollieren

Lieferobjekte:

- Policy-Regeln fuer erlaubte und verbotene Anfragearten
- Prompt-Template fuer die offene Schaltung
- Kontextpriorisierung und Token-Budgeting

Abhaengigkeiten:

- `API0-05`

Grundlegende Umsetzungsgedanken:

- Guardrails sollten nicht als Prompts versteckt werden, sondern als eigenstaendige Regelpruefung vor dem Prompt-Bau
- der Prompt-Orchestrator sollte einen klar getrennten Aufbau haben: Systemkontext, Circuit-Kontext, Chat-Historie, Nutzerfrage
- Token- oder Groessenbudgets sollten spaeter vor dem Provider-Gateway entschieden werden, nicht erst bei Provider-Fehlern

Automatisierbare Validierung:

- Unit-Tests fuer Policy-Regeln
- Negativtests fuer manipulierte Systemanweisungen
- Snapshot-Tests fuer interne Prompt-Strukturen

Manuelle Validierung:

- Prompt-Injection-artige Eingaben pruefen
- pruefen, dass grosse Kontexte sinnvoll gekuerzt werden

Definition of Done:

- kein unkontrollierter Nutzerinput kann Systemverhalten oder Provider-Parameter direkt ueberschreiben

### API0-07 Provider-Gateway mit Egress-Kontrolle

Ziel:

- nur freigegebene Provider sicher und ueber eine einzige Gateway-Schicht ansprechen

Lieferobjekte:

- interner Provider-Adapter
- erster Provider-Gateway-Adapter
- Host-Allowlist
- Timeouts, Retries und Fehlernormalisierung

Abhaengigkeiten:

- `API0-04`
- `API0-06`

Grundlegende Umsetzungsgedanken:

- ein internes Gateway-Interface sollte providerneutral bleiben, damit Modellname, Limits und Fehler intern vereinheitlicht werden koennen
- Host-Allowlist, TLS, Timeout und Retry-Logik gehoeren in genau eine HTTP-Client-Schicht
- Provider-Fehler sollten in wenige interne Kategorien uebersetzt werden, zum Beispiel Auth, Limit, Timeout, Availability und Unknown

Automatisierbare Validierung:

- Mock-Provider-Tests
- Integrations-Tests fuer Erfolg, Fehler, Timeout und Retry
- Tests gegen manipulierte Ziel-URLs und verbotene Hosts

Manuelle Validierung:

- Test-Request mit Test-Key in Staging oder lokaler Provider-Simulation
- pruefen, dass nur erlaubte Provider-Endpunkte angesprochen werden

Definition of Done:

- Provider-Verkehr laeuft ausschliesslich ueber das Gateway und wird neutral normalisiert

### API0-08 Audit, Redaktion und Rate-Limits

Ziel:

- Missbrauchsschutz und sichere Betriebsdaten vor echter Nutzung einschalten

Lieferobjekte:

- redigierte strukturierte Logs
- Audit-Events
- Rate-Limits pro Session und IP
- Basis-Metriken fuer Latenz, Fehler und Nutzung

Abhaengigkeiten:

- `API0-04`
- `API0-07`

Grundlegende Umsetzungsgedanken:

- Logging sollte von Anfang an strukturiert sein, damit spaetere Dashboards und Alarme nicht an Freitext scheitern
- Redaktionslogik sollte zentral und wiederverwendbar sein, statt in jedem Modul eigene `replace`-Regeln zu pflegen
- Rate-Limits sollten mindestens nach IP und Session getrennt konfigurierbar sein, damit Missbrauch und legitime Last besser unterschieden werden koennen

Automatisierbare Validierung:

- Redaktions-Tests
- Rate-Limit-Tests
- Abuse-Tests fuer Burst-Requests
- Event-Tests fuer sicherheitsrelevante Aktionen

Manuelle Validierung:

- Logs und Dashboards pruefen
- Fehlerserie und Limit-Verletzung simulieren

Definition of Done:

- keine Secrets tauchen in Logs auf und Limits greifen nachvollziehbar

## API1

### API1-01 App-Integration fuer Key, Chat und Reset

Ziel:

- bestehende App sauber an den Broker anbinden

Lieferobjekte:

- Key-Eingabe gegen Broker
- Chat-Request gegen Broker
- Reset-Flow gegen Broker
- UI-Fehlerabbildung fuer Limit-, Session- und Providerfehler

Abhaengigkeiten:

- alle `API0`-Pakete

Grundlegende Umsetzungsgedanken:

- die Frontend-Anbindung sollte ueber eine kleine dedizierte API-Client-Schicht laufen, nicht ueber direkte Fetch-Aufrufe aus vielen Komponenten
- Key-Eingabe, Chat-Request und Reset sollten auf einen gemeinsamen Session-Zustand in der App zugreifen koennen
- Fehler aus dem Broker sollten frueh auf UI-Zustaende gemappt werden, damit Rate-Limits, Session-Fehler und Provider-Fehler sauber unterscheidbar bleiben

Automatisierbare Validierung:

- End-to-End-Tests fuer Key setzen, Chat senden, Reset und Key loeschen
- Contract-Regressionstests zwischen UI und Broker

Manuelle Validierung:

- realer Durchlauf in der App mit offener kleiner und grosser Schaltung
- Browser-Netzwerkanalyse: kein direkter Provider-Call

Definition of Done:

- der gesamte Nutzerfluss laeuft ueber den Broker und bleibt fuer den Nutzer verstaendlich

### API1-02 Staging-Aufbau und Smoke-Test-Strecke

Ziel:

- produktionsnahe Validierung vor Pilot und Go-Live

Lieferobjekte:

- Staging-Umgebung
- produktionsnahe Konfigurationsmatrix
- automatische Smoke-Tests nach Deployments

Abhaengigkeiten:

- `API1-01`

Grundlegende Umsetzungsgedanken:

- Staging sollte dieselbe Grundkonfiguration wie Produktion haben, aber isolierte Secrets, kleinere Limits und einen Test-Provider oder eingeschraenkten Provider-Zugang nutzen
- Smoke-Tests sollten nicht nur Health pruefen, sondern den Kernfluss `Key -> Chat -> Reset` in schlanker Form abdecken
- die Staging-Konfiguration sollte als nachvollziehbare Config-Matrix dokumentiert werden, damit Abweichungen zu Produktion sichtbar bleiben

Automatisierbare Validierung:

- Smoke-Tests
- Deploy-Checks gegen fehlende Secrets oder falsche Konfiguration
- Mock- oder Test-Provider-Pruefungen

Manuelle Validierung:

- End-to-End-Durchlauf in Staging
- Betriebscheckliste vor erster Freigabe

Definition of Done:

- Staging kann den kompletten Kernfluss stabil und nachvollziehbar abbilden

### API1-03 Observability und Alarmierung fertigstellen

Ziel:

- nicht nur Daten sammeln, sondern echte Betriebsfaehigkeit herstellen

Lieferobjekte:

- Dashboards fuer Latenz, Fehlerraten, Limits und Providerverbrauch
- Alarmregeln fuer Ausfaelle und Missbrauch
- korrelierbare Audit-Sicht

Abhaengigkeiten:

- `API0-08`
- `API1-02`

Grundlegende Umsetzungsgedanken:

- Dashboards sollten direkt entlang der Kernfragen gebaut werden: funktioniert der Broker, sind Limits gesund, steigen Kosten, gibt es Policy- oder Auth-Probleme
- Alarmregeln sollten bewusst sparsam gestartet werden, damit das Team nicht in Alarmrauschen untergeht
- Audit-Sicht und Betriebsmetriken sollten dieselben Korrelations-IDs nutzen, damit Incident-Analyse nicht manuell zusammengesucht werden muss

Automatisierbare Validierung:

- Alert-Simulationen
- Tests fuer Metrik-Emission und Event-Erzeugung

Manuelle Validierung:

- Dashboard-Sichtpruefung
- Alarm pruefen und Incident-Weg einmal durchspielen

Definition of Done:

- Ausfaelle und sicherheitsrelevante Auffaelligkeiten sind operational sichtbar

### API1-04 Pilot-Rollout und Rollback-Faehigkeit

Ziel:

- begrenzten Echtbetrieb mit niedrigerem Risiko ermoeglichen

Lieferobjekte:

- Pilot-Freigabekriterien
- Rollback-Plan
- dokumentierte Verantwortlichkeiten

Abhaengigkeiten:

- `API1-02`
- `API1-03`

Grundlegende Umsetzungsgedanken:

- Pilot-Rollout sollte technisch von normaler Freigabe getrennt bleiben, zum Beispiel ueber Feature-Flag, Allowlist oder begrenzten Konfigurationsschalter
- Rollback muss nicht nur das Deployment, sondern auch Konfigurations- und Provider-Umschaltung abdecken
- Verantwortlichkeiten fuer Betrieb, Freigabe und Incident-Entscheidungen sollten bereits vor dem Pilot schriftlich feststehen

Automatisierbare Validierung:

- Lasttests in Staging
- Abuse-Tests vor Pilotstart
- Smoke-Tests nach Rollback oder Re-Deploy

Manuelle Validierung:

- Rollback einmal praktisch testen
- Monitoring waehrend Pilotphase beobachten

Definition of Done:

- Pilot kann kontrolliert gestartet und bei Problemen schnell zurueckgenommen werden

## API2

### API2-01 Mehrprovider-Faehigkeit und saubere Adapter-Trennung

Ziel:

- spaeteren Providerwechsel oder zweiten Provider vorbereiten

Lieferobjekte:

- weiterer Provider-Adapter oder klarer Mock-Adapter
- vereinheitlichte Provider-Faehigkeitsmatrix

Abhaengigkeiten:

- `API0-07`

Grundlegende Umsetzungsgedanken:

- ein gemeinsames Adapter-Interface sollte Features wie Modellwahl, Token-Limits, Finish-Reason und Usage-Felder abstrahieren
- Provider-spezifische Besonderheiten sollten in kleinen Adaptern bleiben und nicht in Prompt-Orchestrator oder UI auslaufen
- eine Faehigkeitsmatrix ist hilfreich, um spaeter klar zu sehen, welche Modelle Streaming, strukturierte Antworten oder Limitinformationen liefern

Automatisierbare Validierung:

- Adapter-Konformitaetstests
- Cross-Provider-Regression fuer Fehler- und Erfolgsformat

Manuelle Validierung:

- Stichprobe mit zweitem Provider oder simuliertem Adapter

Definition of Done:

- Providerwechsel erfordert keine Aenderung am UI-Vertrag

### API2-02 Kontext-Zusammenfassung fuer sehr grosse Schaltungen verbessern

Ziel:

- Qualitaet und Kostenverhalten fuer komplexe offene Schaltungen optimieren

Lieferobjekte:

- verbesserte Reduktions- oder Zusammenfassungsstrategien
- definierte Fallback-Regeln bei zu grossen Contexts

Abhaengigkeiten:

- `API0-05`
- `API0-06`

Grundlegende Umsetzungsgedanken:

- fuer sehr grosse Schaltungen bietet sich ein abgestufter Ansatz an: Topologie verdichten, unwichtige View-Daten streichen, relevante Subbereiche priorisieren
- Zusammenfassungen sollten moeglichst deterministisch aufgebaut werden, damit Tests und spaetere Fehlersuche stabil bleiben
- Fallback-Regeln sollten lieber offen kommunizieren, dass der Kontext gekuerzt wurde, statt stillschweigend wichtige Teile zu verlieren

Automatisierbare Validierung:

- Fixture-Regressionstests mit sehr grossen Schaltungen
- Budget- und Groessenlimit-Tests

Manuelle Validierung:

- Vergleich kleiner gegen grosse Beispielschaltungen
- Plausibilitaetspruefung, ob Antworten noch zur offenen Schaltung passen

Definition of Done:

- grosse Schaltungen bleiben nutzbar, ohne dass Sicherheit oder Budgetkontrolle verloren gehen

### API2-03 Secret-Rotation und Betriebs-Haertung erweitern

Ziel:

- Betriebssicherheit nach dem Pilot weiter erhoehen

Lieferobjekte:

- dokumentierte Rotationsablaeufe
- erweiterte Incident-Runbooks
- haertere Betriebschecks

Abhaengigkeiten:

- `API1-04`

Grundlegende Umsetzungsgedanken:

- Secret-Rotation sollte nicht nur technisch moeglich, sondern als wiederholbarer Betriebsablauf dokumentiert sein
- Runbooks sollten konkrete Trigger, erste Checks, Sofortmassnahmen und Eskalationspunkte enthalten
- Betriebs-Haertung sollte auch kontrollierte Neustarts, Cache-Leerung, Session-Invalidierung und Provider-Ausfallmodi umfassen

Automatisierbare Validierung:

- Tests fuer Secret-Wechsel ohne Neustart oder mit kontrolliertem Neustart
- Smoke-Tests nach Rotationsereignissen

Manuelle Validierung:

- Rotation einmal praktisch durchspielen
- Incident-Pfad fuer Key-Leak oder Provider-Ausfall ueben

Definition of Done:

- Operations-Team kann Schluessel, Sessions und Providerstoerungen kontrolliert handhaben

## Empfohlene Uebernahme in ein Ticketsystem

Felder pro Ticket:

- Ticket-ID
- Prioritaet `API0`, `API1` oder `API2`
- Kurzbeschreibung
- Abhaengigkeiten
- technischer Scope
- automatisierbare Tests
- manuelle Abnahme
- Definition of Done

## Minimaler Startschnitt

Wenn nur ein kleiner erster Umsetzungsblock vorbereitet werden soll, dann zuerst:

1. `API0-01`
2. `API0-02`
3. `API0-03`
4. `API0-04`
5. `API0-05`

Danach erst:

1. `API0-06`
2. `API0-07`
3. `API0-08`
4. `API1-01`
