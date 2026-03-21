# ADR-001: Current Circuit Only

## Status

Accepted

## Kontext

Die bestehende App arbeitet mit lokal geladener oder aktuell bearbeiteter Schaltung. Sie besitzt keine belastbare serverseitige Projektbibliothek und keinen sicheren Mechanismus, um beliebige lokale Dateien eines Nutzers zu indexieren.

Die geplante KI-Anbindung soll deshalb nicht zu einer allgemeinen Projekt- oder Dateisuche ausufern.

## Entscheidung

Die Backend-Anwendung verarbeitet ausschliesslich Kontext der aktuell geoeffneten Schaltung.

Das bedeutet:

- das Frontend uebergibt nur den Zustand der offenen Schaltung
- das Backend speichert keine dauerhafte Projektbibliothek
- das Backend durchsucht keine lokalen Verzeichnisse
- der Chat bezieht sich nur auf den uebergebenen Schaltungszustand plus kurze Chat-Historie

## Begruendung

- reduziert Datenschutz- und Sicherheitsrisiken
- vermeidet impliziten Dateisystemzugriff
- begrenzt Payload-Groesse und Kosten
- passt zum aktuellen App-Modell
- ermoeglicht klare und pruefbare API-Vertraege

## Konsequenzen

Positiv:

- klarer, enger Scope
- einfacher testbare Schnittstelle
- weniger sensible Persistenz
- geringere Wahrscheinlichkeit fuer Kontextvermischung

Negativ:

- kein Chat ueber nicht geladene Projekte
- kein automatisches Projektgedaechtnis
- Kontext muss bei jeder Anfrage erneut oder inkrementell uebermittelt werden

## Verwerfene Alternativen

- automatische Indexierung aller lokalen Projekte
- serverseitige Projektsammlung pro Nutzer
- Hintergrund-Synchronisation mehrerer Schaltungen

## Folgeschritte

1. `contracts/circuit-context-payload.md` auf diese Scope-Grenze ausrichten
2. `security/threat-model.md` um Missbrauch durch zu grosse oder falsche Kontexte erweitern
3. `backend-modules/circuit-context/README.md` strikt auf diese Entscheidung auslegen
