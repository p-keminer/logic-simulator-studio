# API-Anbindung Plan

## Ziel

Dieser Bereich beschreibt die vollstaendige Implementierungsplanung fuer eine separate Backend-Anwendung, die einzig dazu dient, eine sichere KI-API-Anbindung fuer den Logic Simulator bereitzustellen.

Die Backend-Anwendung soll:

- nur Anfragen zur aktuell geoeffneten Schaltung bearbeiten
- vom Frontend entkoppelt sein und als sicherer Broker zwischen App und KI-Provider dienen
- benutzerspezifische API-Keys unter klaren Sicherheitsregeln annehmen
- Kontext aus der aktuell geladenen Schaltung in ein kontrolliertes Chat-Format ueberfuehren
- keine Projektbibliothek, keinen Dateisystemzugriff und keine allgemeine Remote-Steuerung bereitstellen

## Warum dieser Ordner existiert

Die App ist heute frontend-zentriert. Fuer eine sichere KI-Anbindung reicht ein einfacher Dialog mit direktem Browser-API-Key nicht aus. Dieser Ordner schafft deshalb eine belastbare Planungsgrundlage fuer:

- Architektur
- Sicherheitsentscheidungen
- API-Vertraege
- Modulzuschnitte
- Betriebsmodell
- Teststrategie
- Rollout

## Scope

Im Scope:

- KI-Chat nur fuer die aktuell geoeffnete Schaltung
- Backend als Security-Gateway und Provider-Broker
- Nutzerseitig eingetragener API-Key mit serverseitiger Schutzlogik
- kontrollierte Serialisierung der Schaltung in ein Chat-konformes Kontextobjekt

Nicht im Scope:

- automatische Erkennung aller lokalen Projekte
- Dateisystem-Scanning auf Nutzerrechnern
- Multi-Projekt-Wissensbasis
- Agenten mit Schreibzugriff auf Schaltungen
- allgemeine Plugin-Plattform

## Struktur

- `decisions/`: Architektur- und Produktentscheidungen als ADRs
- `architecture/`: Zielbild, Datenfluesse und Modulgrenzen
- `security/`: Sicherheitsmodell, Bedrohungen und Schutzmassnahmen
- `contracts/`: Frontend-Backend- und Provider-Vertraege
- `backend-modules/`: einzelne Backend-Bausteine mit klarer Verantwortung
- `deployment/`: Umgebungen, Betrieb und Secrets-Management
- `testing/`: Teststrategie und Sicherheitsverifikation
- `rollout/`: Meilensteine, offene Fragen und Einfuehrungsreihenfolge

## Erwartetes Ergebnis nach spaeterer Umsetzung

Nach Umsetzung dieses Plans existiert eine kleine, klar begrenzte Backend-Anwendung, die:

- eine Chat-Anfrage fuer die offene Schaltung entgegennimmt
- den Schaltungskontext validiert und reduziert
- Richtlinien und Guardrails anwendet
- die Provider-Anfrage stellvertretend ausfuehrt
- Antworten, Limits und Audit-Ereignisse kontrolliert behandelt

## Aktueller lokaler API1-Stand

Im aktuellen lokalen Scope besitzt `API1-01b` jetzt einen sichtbaren
Broker-UI-Smoke-Ring fuer:

- Happy Path (`broker:smoke`)
- stale Session Recovery (`broker:smoke:recovery`)
- Session-Key-Rate-Limit (`broker:smoke:rate-limit`)
- Chat-Rate-Limit (`broker:smoke:chat-rate-limit`)
- Reset-Rate-Limit (`broker:smoke:reset-rate-limit`)
- Konfigurationsfehler (`broker:smoke:config-error`)
- Policy-Block (`broker:smoke:policy-block`)
- Provider-/Upstream-Fehler (`broker:smoke:provider-error`)

Damit gilt `API1-01` fuer den aktuellen lokalen Scope als abgeschlossen.
Bewusste Folgearbeit bleibt:

- `API1-02` Staging-Aufbau und deployment-nahe Smoke-Strecke
- `API1-03` Observability/Alarmierung
- `API1-04` Pilot-/Rollout-Vorbereitung

Der erste konkrete `API1-02`-Basisschnitt ist jetzt ebenfalls vorhanden:

- explizites Runtime-Profil `APP_ENV=staging`
- verpflichtende `ALLOWED_ORIGINS` ausserhalb von Development
- deaktivierte Dev-only-Routen in Staging
- Environment-Metadaten auf `/health` und `/ready`
- erster staging-naher Sandbox-Smoke ueber
  `backend-sandbox npm run smoke:staging-profile`
- staging-lokaler Startpfad ueber `backend-sandbox npm run dev:staging-local`
- staging-lokaler Runtime-Smoke ueber
  `backend-sandbox npm run smoke:staging-runtime`
- staging-URL-Smoke gegen ein bereits laufendes Ziel ueber
  `backend-sandbox npm run smoke:staging-url`
- erster externer Zielpfad ueber Render-Blueprint in
  [render.yaml](/home/p-keminer/projects/uni/logic-gate-simulator/render.yaml)
  plus begleitende Deploy-Doku in
  [render-staging.md](/home/p-keminer/projects/uni/logic-gate-simulator/validation/api_anbindung/deployment/render-staging.md)

## Reihenfolge fuer die spaetere Implementierung

1. Entscheidungen in `decisions/` festziehen
2. Architektur und API-Vertraege finalisieren
3. Sicherheits- und Betriebsmodell freigeben
4. Kernmodule des Backends umsetzen
5. Deployment und Tests aufsetzen
6. kontrollierten Rollout aktivieren

## Aktueller Stand

- die Sandbox unter `backend-sandbox/` deckt den `API0`-Vorbau fuer Session,
  Chat, Reset, Circuit-Context, Guardrails, Provider-Gateway, Audit/Redaction
  und lokale App-Bridge bereits isoliert ab
- die aktive App besitzt einen standardmaessig sichtbaren Broker-Client-Pfad
  mit dediziertem Circuit-Context-Adapter und Broker-Modal
- der aktuelle Integrationsslice `API1-01a` haertet den App-seitigen
  Nutzerfluss fuer `Key -> Chat -> Reset -> Delete` ueber einen gemeinsamen
  UI-State-Reducer und dedizierte Regressionsabdeckung
- stale Session-Antworten wie `NOT_FOUND` / `Session was not found.` fallen in
  der App jetzt ebenfalls in denselben konsistenten Session-Invalidierungspfad
  zurueck statt den Dialog in einem blockierten Fehlerzustand zu lassen
- generische Chat-Sendefehler ohne Session-Invalidierung lassen im sichtbaren
  Broker-Dialog keine optimistischen Phantom-Nachrichten mehr stehen; der
  Entwurf bleibt stattdessen fuer einen sauberen Retry erhalten
- zusaetzlich existiert jetzt ein expliziter lokaler Recovery-Pfad im Modal:
  `Lokal leeren` setzt den sichtbaren Broker-Zustand ohne Broker-Round-Trip
  auf einen sauberen Leerlauf zurueck
- die Broker-Base-URL wird im Modal jetzt robust als Draft behandelt; eine
  ungueltige URL fuehrt erst beim Verbinden zu einer klaren
  Konfigurationsmeldung statt schon beim Tippen zu einer kaputten UI
- zusaetzlich akzeptiert die Broker-Base-URL jetzt nur noch `http/https` ohne
  eingebettete Zugangsdaten
- im aktuellen sichtbaren App-Pfad akzeptiert die Broker-Base-URL ausserdem
  nur lokale Loopback-Hosts; externe Broker-Ziele bleiben bis spaeteren
  Staging-/Rollout-Schritten bewusst gesperrt
- der sichtbare Broker-Dialog laesst jetzt waehrend laufender
  Chat-/Reset-/Delete-Round-Trips keine widerspruechlichen Parallelaktionen
  mehr zu
- route-spezifische Broker-Limits wirken im sichtbaren Dialog jetzt nicht nur
  als Fehlermeldung, sondern auch als lokaler Cooldown fuer genau die
  betroffene Aktion
- dieselben Rate-Limit-Faelle sprechen im Dialog jetzt auch sprachlich
  unterschiedlich als Key-/Chat-/Reset-Limit
- nach Ablauf des zugehoerigen Countdowns verschwindet der entsprechende
  Rate-Limit-Warnkasten jetzt automatisch wieder
- generell raeumt sich sichtbare Broker-Fehlerkopie beim aktiven Korrigieren
  von URL, Key oder Entwurfsfeldern jetzt frueher weg
- auch jenseits von Rate-Limits sprechen die Fehlertitel jetzt klarer den
  betroffenen Aktionstyp im Dialog an
- Busy-Phasen sind im sichtbaren Dialog jetzt ebenfalls klarer lesbar statt
  nur ueber deaktivierte Buttons
- `API1-01b` besitzt jetzt zusaetzlich einen lokalen automatisierten
  Happy-Path-Smoke fuer den sichtbaren Broker-Dialog ueber
  `npm run broker:smoke`
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
- der naechste direkte Folgepunkt ist jetzt, den staging-lokalen Lauf auf ein
  echtes extern erreichbares Staging-Ziel mit fester Ziel-URL- und Origin-
  Konfiguration ausserhalb des Entwicklerrechners zu deployen und per
  Ziel-Smoke zu bestaetigen; danach folgen `API1-03`
  Observability/Alarmierung und `API1-04` Pilot-/Rollout-Schritte
