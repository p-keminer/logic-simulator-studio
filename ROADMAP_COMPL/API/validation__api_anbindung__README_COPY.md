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
- der naechste direkte Folgepunkt ist `API1-01b`: manuelle und spaeter
  automatisierte End-to-End-Absicherung des sichtbaren Broker-Flows in der
  App, bevor Staging- oder Rollout-Schritte aktiv werden
