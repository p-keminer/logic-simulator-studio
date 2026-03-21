# ROADMAP

## Zweck

Diese Roadmap beschreibt die empfohlene Reihenfolge fuer die spaetere Umsetzung der sicheren API-Anbindung. Sie ist absichtlich nicht nur eine Feature-Liste, sondern ein Ablaufplan mit Validierungsstellen, Go-No-Go-Kriterien und Testarten.

Die Roadmap gilt fuer:

- eine separate Backend-Anwendung als Broker
- KI-Chat nur fuer die aktuell geoeffnete Schaltung
- benutzereigene API-Keys nur ueber den Broker

Die Roadmap gilt nicht fuer:

- Multi-Projekt-Suche
- Dateisystemzugriff auf Nutzerrechnern
- agentische Schreiboperationen in Projekten

## Leitprinzipien

- zuerst Scope und Sicherheitsgrenzen fixieren, dann Implementierung
- Contracts vor Provider-Details festziehen
- jedes Modul erst isoliert, dann integriert validieren
- sensible Daten nie in Logs oder Frontend-Fehlern exponieren
- jede Phase endet mit einem klaren Abnahmekriterium

## Gesamtphasen

1. Architektur-Freeze und Scope-Sicherung
2. API-Vertraege und Datenmodell festziehen
3. Backend-Grundgeruest aufbauen
4. Session- und Secret-Schicht implementieren
5. Circuit-Context-Pipeline implementieren
6. Guardrails und Prompt-Orchestrierung implementieren
7. Provider-Gateway anbinden
8. Audit, Observability und Abuse-Schutz aktivieren
9. App-Integration und End-to-End-Validierung
10. Staging-Hardening, Pilot und Rollout

## Validierungsstufen

### Stufe A: Modulvalidierung

Ziel:

- jedes Modul fuer sich korrekt und sicher machen

Typische automatische Tests:

- Unit-Tests
- Schema-Tests
- Architekturtests
- Redaktions-Tests

Typische manuelle Pruefungen:

- Code-Review gegen die ADRs
- gezielte Grenzwertpruefung
- Negativtests mit absichtlich falschen Payloads

### Stufe B: Integrationsvalidierung

Ziel:

- Zusammenspiel mehrerer Module absichern

Typische automatische Tests:

- Integrations-Tests
- Mock-Provider-Tests
- Session- und Ablauf-Tests

Typische manuelle Pruefungen:

- Endpunkt-Tests mit realen Beispielpayloads
- Staging-Durchlaeufe mit Test-Keys

### Stufe C: Betriebsvalidierung

Ziel:

- Verhalten unter realistischen Betriebsbedingungen pruefen

Typische automatische Tests:

- Lasttests
- Abuse-Tests
- Smoke-Tests
- Alert-Simulationen

Typische manuelle Pruefungen:

- Sichtpruefung von Logs, Dashboards und Alarmen
- Rollback-Test
- Secret-Rotation und Session-Reset

## Phase 1: Architektur-Freeze und Scope-Sicherung

### Einbauen

1. ADRs final bestaetigen
2. Scope "nur aktuell geoeffnete Schaltung" festschreiben
3. verbotene Faehigkeiten explizit dokumentieren
4. Ziel-Use-Cases fuer den Chat definieren

### Validieren automatisiert

- optionales Markdown-Linting fuer Konsistenz der Doku
- optionaler Link-Check zwischen den Planungsdokumenten

### Validieren manuell

- Review von `decisions/`, `architecture/` und `security/`
- Pruefen, dass nirgendwo Multi-Projekt-Verhalten implizit vorgesehen ist
- Pruefen, dass kein direkter Browser-zu-Provider-Fluss erlaubt bleibt

### Go-No-Go

Go nur wenn:

- Scope, Key-Modell und Broker-Prinzip eindeutig sind
- keine offenen Grundsatzfragen fuer Architektur und Sicherheit uebrig sind

## Phase 2: API-Vertraege und Datenmodell festziehen

### Einbauen

1. aeusseren Broker-Vertrag definieren
2. internes Provider-Abstraktionsmodell definieren
3. Payload fuer den offenen Circuit versionieren
4. Fehlercodes und Fehlertypen vereinheitlichen

### Validieren automatisiert

- Contract-Tests gegen Request- und Response-Schemas
- Schema-Tests fuer unbekannte Felder, falsche Typen und Groessenlimits
- Snapshot-Tests fuer Fehlerobjekte

### Validieren manuell

- Payload-Walkthrough mit echten Beispielen aus kleinen, mittleren und grossen Schaltungen
- Review, ob das Circuit-Payload keine lokalen Dateipfade oder unnoetigen Freitext transportiert
- Review, ob die Frontend-API keine Provider-spezifischen Felder offenlegt

### Go-No-Go

Go nur wenn:

- alle Kernendpunkte versioniert sind
- der Circuit-Context stabil und begrenzt modelliert ist
- das Fehlerformat fuer UI und Betrieb ausreicht

## Phase 3: Backend-Grundgeruest aufbauen

### Einbauen

1. Laufzeitstack waehlen
2. Projektstruktur fuer `edge-api`, `auth`, `circuit-context`, `policy-guardrails`, `prompt-orchestrator`, `provider-gateway`, `audit-and-observability` anlegen
3. zentrale Config- und Fehlerbehandlung aufsetzen
4. Health-, Readiness- und Basis-Middleware einbauen

### Validieren automatisiert

- Lint
- Typecheck
- Basis-Unit-Tests
- Architekturtests fuer erlaubte Modulabhaengigkeiten

### Validieren manuell

- lokaler Start des Brokers
- Pruefen, dass Basisendpunkte ohne Provider-Anbindung stabil antworten
- Review, dass keine Fachlogik in Routing oder Bootstrap verrutscht

### Go-No-Go

Go nur wenn:

- Modulgrenzen im Code sichtbar sind
- der Basisserver reproduzierbar startet
- Konfiguration und Fehlerbehandlung zentralisiert sind

## Phase 4: Session- und Secret-Schicht implementieren

### Einbauen

1. Session-Modell definieren
2. Key-Registrierung ueber Broker-Endpunkt bauen
3. Secret-Speicherstrategie mit TTL oder fluechtiger Session-Bindung umsetzen
4. Session-Reset und Key-Loeschung implementieren

### Validieren automatisiert

- Unit-Tests fuer Session-Erzeugung, Rotation, Ablauf und Loeschung
- Integrationstests fuer `POST /v1/session/key` und `DELETE /v1/session/key`
- Tests fuer Redaktionsfilter bei Fehlern und Logs
- Negativtests fuer ungueltige oder leere Keys

### Validieren manuell

- Key eintragen, Chat starten, Session beenden, Key loeschen
- pruefen, dass der Key nicht in Logs, Fehlern oder API-Antworten sichtbar wird
- pruefen, dass eine alte oder ungeltige Session nicht weiterbenutzt werden kann

### Go-No-Go

Go nur wenn:

- Keys nie ruecklesbar an das Frontend gelangen
- Session-Isolation stabil funktioniert
- Reset und Loeschung nachvollziehbar arbeiten

## Phase 5: Circuit-Context-Pipeline implementieren

### Einbauen

1. Mapping vom bestehenden App-Modell auf das Broker-Circuit-Schema definieren
2. Feld-Whitelist fuer erlaubte Circuit-Daten umsetzen
3. Groessen- und Versionspruefung einbauen
4. Reduktion oder Zusammenfassung fuer grosse Schaltungen planen und implementieren

### Validieren automatisiert

- Unit-Tests fuer Mapping und Normalisierung
- Property- oder Grenzwerttests fuer Arrays, Strings und Gesamtgroesse
- Fixture-Tests mit realistischen Circuit-Beispielen
- Negativtests fuer unbekannte Felder, defekte JSON-Strukturen und alte oder neue Schema-Versionen

### Validieren manuell

- Test mit sehr kleiner Schaltung
- Test mit komplexer Schaltung
- Test mit absichtlich manipuliertem Payload
- Pruefen, ob nur notwendige Daten weitergegeben werden

### Go-No-Go

Go nur wenn:

- nur erlaubte Felder weitergereicht werden
- uebergrosse oder fehlerhafte Circuits kontrolliert behandelt werden
- das resultierende Kontextobjekt stabil genug fuer den Prompt-Bau ist

## Phase 6: Guardrails und Prompt-Orchestrierung implementieren

### Einbauen

1. erlaubte Chat-Aufgaben definieren
2. Policy-Regeln fuer verbotene oder unerwuenschte Requests einbauen
3. Prompt-Template fuer die offene Schaltung aufsetzen
4. Kontextpriorisierung und Token-Budgeting implementieren

### Validieren automatisiert

- Unit-Tests fuer Policy-Regeln
- Tests fuer erlaubte und abgelehnte Anfragearten
- Snapshot-Tests fuer erzeugte interne Prompt-Strukturen
- Negativtests fuer ueberssige Historie, manipulierte Systemanweisungen und ungueltige Modelloptionen

### Validieren manuell

- Prompt-Injection-aehnliche Eingaben pruefen
- Pruefen, ob Benutzerinput keine Systeminstruktionen ueberschreibt
- Pruefen, ob grosse Kontexte sinnvoll gekuerzt oder zusammengefasst werden

### Go-No-Go

Go nur wenn:

- Guardrails vor dem Gateway greifen
- Prompt-Bildung deterministisch und nachvollziehbar ist
- keine Frontend-Spezialfelder unkontrolliert in den Prompt gelangen

## Phase 7: Provider-Gateway anbinden

### Einbauen

1. internen Adapter-Vertrag umsetzen
2. ersten Provider-Adapter integrieren
3. Host-Allowlist, TLS, Timeouts und Retry-Regeln aktivieren
4. Fehler und Nutzungsdaten in ein neutrales Format ueberfuehren

### Validieren automatisiert

- Mock-Provider-Tests
- Integrationstests fuer Erfolgs-, Fehler-, Timeout- und Retry-Pfade
- Tests gegen verbotene Hosts oder manipulierte Ziel-URLs
- Tests fuer Fehlernormalisierung

### Validieren manuell

- Staging-Anfrage mit Test-Key ausloesen
- pruefen, dass nur freigegebene Provider-Ziele angesprochen werden
- pruefen, dass Provider-Fehler nicht roh an die UI durchgereicht werden

### Go-No-Go

Go nur wenn:

- nur das Gateway Provider-Verkehr ausleitet
- Host- und Timeout-Regeln nachweislich greifen
- das Frontend weiterhin nur den Broker kennt

## Phase 8: Audit, Observability und Abuse-Schutz aktivieren

### Einbauen

1. strukturierte Logs mit Redaktionsschicht einbauen
2. Metriken fuer Latenz, Fehler, Limits und Providerverbrauch aufsetzen
3. Audit-Events fuer Key-Registrierung, Policy-Block, Rate-Limit und Reset erzeugen
4. Rate-Limits, parallele Request-Grenzen und Budgets aktivieren

### Validieren automatisiert

- Redaktions-Tests fuer Logs und Fehlerobjekte
- Rate-Limit-Tests
- Abuse-Tests fuer Burst-Requests
- Metrik- und Event-Tests fuer kritische Ereignisse

### Validieren manuell

- Logs und Dashboards pruefen
- simulierte Fehlerserien und Limit-Verletzungen ausloesen
- pruefen, ob sicherheitsrelevante Ereignisse sichtbar, aber nicht datenschutzkritisch sind

### Go-No-Go

Go nur wenn:

- keine Secrets im Logging sichtbar sind
- Limits verhaeltnismaessig greifen
- Betriebsdaten fuer Fehleranalyse und Missbrauchserkennung ausreichen

## Phase 9: App-Integration und End-to-End-Validierung

### Einbauen

1. Chat-UI der App an den Broker binden
2. Key-Eingabe, Session-Aufbau und Chat-Reset mit dem Backend verbinden
3. Mapping von aktuellem App-State auf das Circuit-Payload stabilisieren
4. Nutzerfehler, Limitfehler und Providerfehler sauber in UI-Zustaende ueberfuehren

### Validieren automatisiert

- End-to-End-Tests fuer Key setzen, Chat senden, Reset und Key loeschen
- Contract-Regressionstests zwischen App und Broker
- UI-Tests fuer Fehlerzustaende und gesperrte Aktionen

### Validieren manuell

- realer Durchlauf in der App mit offener Schaltung
- kleine und komplexe Schaltung pruefen
- Netzwerkanalyse im Browser: kein direkter Provider-Call, keine Secret-Rueckgabe
- pruefen, ob UI bei Limits und Ausfaellen verstaendlich reagiert

### Go-No-Go

Go nur wenn:

- der Nutzerfluss komplett ueber den Broker laeuft
- die App ohne Kenntnis von Provider-Interna funktioniert
- Fehlersituationen nutzbar und sicher dargestellt werden

## Phase 10: Staging-Hardening, Pilot und Rollout

### Einbauen

1. Staging mit produktionsnaher Konfiguration betreiben
2. Smoke-Tests und Lasttests in Staging verankern
3. Rollback-Pfade dokumentieren
4. Pilot-Rollout mit begrenztem Nutzerkreis starten
5. nach Pilot schrittweise erweitern

### Validieren automatisiert

- Smoke-Tests nach jedem Deployment
- Last- und Abuse-Tests in Staging
- Alert-Simulation fuer zentrale Sicherheits- und Ausfallfaelle
- Deploy-Checks gegen fehlende Secrets oder falsche Konfiguration

### Validieren manuell

- Betriebscheckliste durchgehen
- Rollback einmal praktisch testen
- Secret-Rotation und Session-Invalidierung pruefen
- Monitoring waehrend des Piloten beobachten

### Go-No-Go

Go nur wenn:

- Staging alle Pflichttests besteht
- Rollback und Incident-Pfade geklaert sind
- Pilot keine kritischen Sicherheits- oder Stabilitaetsprobleme zeigt

## Empfohlene Testpyramide

### Automatisierbar

- Lint und Typecheck bei jedem Commit
- Unit-Tests pro Modul
- Contract-Tests bei jeder Aenderung am API-Schema
- Integrations-Tests fuer Session, Context, Guardrails und Gateway
- End-to-End-Tests fuer den Kernnutzerfluss
- Last- und Abuse-Tests mindestens vor Staging und vor Produktion

### Manuell

- Architektur- und Security-Review an den Phasengrenzen 1, 2 und 4
- Payload-Walkthrough mit realen offenen Schaltungen an Phase 5
- Prompt- und Abuse-Pruefung an Phase 6 und 8
- echter App-Durchlauf in Phase 9
- Betriebs- und Rollback-Test in Phase 10

## Empfohlene CI-Gates

### Gate 1: Pull Request

- Lint
- Typecheck
- Unit-Tests
- Contract-Tests fuer betroffene Module

### Gate 2: Merge auf Hauptzweig

- alle PR-Gates
- Integrations-Tests
- Architekturtests
- Redaktions- und Sicherheitsregressionen

### Gate 3: Deployment nach Staging

- Smoke-Tests
- Provider-Mock oder Staging-Provider-Test
- Rate-Limit- und Fehlerpfadpruefung

### Gate 4: Produktion

- freigegebene Operations-Checklist
- erfolgreiches Staging
- dokumentierter Rollback
- Monitoring und Alerts aktiv

## Reihenfolge bei knappen Ressourcen

Falls die Umsetzung in kleinen Schritten erfolgen muss, ist diese Reihenfolge sinnvoll:

1. Phasen 1 und 2 vollstaendig abschliessen
2. in Phase 3 nur das noetige Backend-Skelett aufbauen
3. Phase 4 und 5 priorisieren, weil dort Scope- und Sicherheitsfehler am teuersten werden
4. Phase 6 und 7 erst danach, damit keine unkontrollierte Provider-Logik entsteht
5. Phase 8 vor echter Nutzerfreigabe abschliessen
6. Phase 9 und 10 erst mit stabiler Observability und Rollback-Strategie freigeben

## Abschlusskriterium fuer das Gesamtprojekt

Die API-Anbindung gilt erst dann als wirklich bereit, wenn:

- die App fuer die aktuell geoeffnete Schaltung sicher ueber den Broker chatten kann
- benutzereigene Keys kontrolliert ueber Backend-Sessions laufen
- keine Secrets oder unnoetigen Kontextdaten austreten
- Limits, Logs, Audits und Rollback-Pfade funktionieren
- Staging, Pilot und Produktionsfreigabe jeweils ihre Gates bestanden haben
