# FSM0 Work Package

Datum: 2026-03-21
Repo: `<repo-root>`
Status: **in Arbeit**
Prioritaet: **P1/P2**
Geltungsbereich: **FSM-Editor -> Synthese -> STT -> Timing -> HDL**

## Zweck

Dieses Dokument fuehrt den aktuellen FSM-Strang als **einen** zusammenhaengenden
Arbeitsblock. `FSM0-1` bis `FSM0-7` werden bewusst in einem einzigen Dokument
geplant und fortgeschrieben.

Die API-Anbindung bleibt ein separater Projektpfad unter
`validation/api_anbindung/`.

`FSM0-8` (Netzlisten-Minimierung / Mapping) ist bewusst **nicht** Teil dieses
Strangs und bleibt vorerst nachgelagert.

## Aktueller Stand im Code

Die wesentlichen Grundlagen des FSM-Pfads sind bereits umgesetzt:

- gemeinsamer FSM-Struktur-Layer in `src/fsm/analysis/structure.ts` fuer
  Initialzustand, Reachability, effektive Bitbreite, Zustandskodierung und
  synthetisierte Teilmenge
- Synthese prune-t unerreichbare Editor-Zustaende vor der eigentlichen
  Kodierung in `src/fsm/synthesis/synthesize.ts`
- der FSM-Editor zeigt diese Semantik bereits sichtbar:
  - `FsmCanvas.tsx`: Banner fuer unerreichbare Zustaende
  - `FsmStateNode.tsx`: orange Markierung und Badge
  - `FsmStateEditor.tsx`: expliziter Hinweis "wird nicht synthetisiert"
  - `FsmStateTable.tsx`: effektive State-Anzahl, Bitbreite, Encoding,
    Reachability-Hinweise
- der responsive Editor-Chrome ist nachgezogen:
  - `FsmToolbar.tsx`: kompakte Toolbar mit Overflow-Menue
  - `FsmSidePanel.tsx`: schliessbares Overlay auf kleiner Breite
- projizierte FSM-Subsysteme haben einen gemeinsamen Boundary-/Projection-Core
  fuer STT und Timing
- Copy/Paste und Duplicate synthetisierter FSMs behandeln
  `projectionBatchId` jetzt konservativ und batch-sicher
- STT und Timing teilen sich die Systemauswahl ueber
  `src/components/panels/panelViewState.ts`
- nachtraeglich veraenderte projizierte FSMs werden nicht mehr still als
  halbgueltige Kompakt-FSM behandelt, sondern explizit als
  `modified_projected_fsm`
- der fruehere Timing-History-Schnitt auf die letzten 200 Snapshots ist
  entfernt; das Diagramm laesst sich wieder bis zum ersten gehaltenen Takt
  zurueckscrollen

Damit ist `FSM0` kein Rohbau mehr, sondern ein kontrollierter Abschluss- und
Haertungspfad.

## Dokumentenrolle im FSM-Strang

- `validation/fsm0/work-package.md`
  aktiver Planungs- und Fortschrittsstrang
- `validation/fsm-export-fixes/cases/`
  echte Legacy-Repros und gespeicherte Altfall-Fixtures
- `validation/ui-manual-verification-plan.md`
  manuelle End-to-End-Pruefschiene fuer UI-, STT- und Timing-Verhalten

Pflegeregel:

- nach jeder Aenderung an diesem Dokument oder angrenzenden FSM-Dokuquellen
  `npm run roadmap:compl` ausfuehren, damit `ROADMAP_COMPL/FSM/` aktuell
  bleibt

## Uebersicht

| Paket | Thema | Mehrwert | Aufwand | Status |
|---|---|---|---|---|
| `FSM0-1` | Subsystem-Grenzen fuer Mischnetze | sehr hoch | mittel bis hoch | **in Arbeit** |
| `FSM0-2` | Projektions-Lebenszyklus semantisch durchziehen | sehr hoch | mittel | **in Arbeit** |
| `FSM0-3` | breite/reduzierte FSM-Faelle sauber abschliessen | hoch | mittel | **offen** |
| `FSM0-4` | Legacy-Bridge haerten | mittel bis hoch | mittel | **teilweise umgesetzt** |
| `FSM0-5` | STT und Timing vollstaendig angleichen | hoch | mittel | **in Arbeit** |
| `FSM0-6` | fruehe Editor-/Canvas-Rueckmeldung | mittel | klein bis mittel | **offen** |
| `FSM0-7` | Regressions- und Fixture-Wall | sehr hoch | mittel | **in Arbeit** |

## Empfohlene Reihenfolge

1. `FSM0-1`
2. `FSM0-2`
3. `FSM0-7`
4. `FSM0-3`
5. `FSM0-5`
6. `FSM0-4`
7. `FSM0-6`

Begruendung:

- `FSM0-1` und `FSM0-2` halten die fachliche Semantik zusammen.
- `FSM0-7` sollte diese Basis frueh gegen Rueckfaelle absichern.
- `FSM0-3` bis `FSM0-6` sind danach gezielte Abschluss- und UX-Slices.

## Arbeitspakete

## FSM0-1 Subsystem-Grenzen fuer Mischnetze

Ziel:

- verkettete, gemischte und nur teilweise projizierte sequentielle Netze
  fachlich sauber in Analyse-Subsysteme schneiden

Bereits im Code:

- read-only Boundary-Core in
  `src/core/analysis/sequentialSubsystemBoundaries.ts`
- `sequentialProjection.ts` nutzt diese Boundary-Beschreibung bereits fuer
  Teilmengenbildung, Batch-Zuschnitt und erste Mixed-Erkennung
- direkt verkettete Batch-Faelle kippen bewusst in den dokumentierten
  `fallback_mixed_batches`

Offen:

- feinere Abgrenzung zwischen
  - mehreren projizierten Batches
  - `projected + raw`
  - komplexeren gemischten Sequential-Systemen
- verbleibende UI-Texte und Fixtures auf diese genaueren Grenzen ausrichten

Abnahme:

- getrennte FSMs bleiben separat selektierbar
- direkt verkettete FSMs bleiben bewusst ein gemeinsamer technischer Fallback
- gemischte Sequential-Subsysteme werden in STT und Timing gleich eingeordnet

## FSM0-2 Projektions-Lebenszyklus semantisch durchziehen

Ziel:

- die Zustaende `clean`, `legacy`, `modified`, `mixed` ueber Core und UI als
  gemeinsame Semantik fuehren statt nur indirekt ueber technische Fallback-Codes

Bereits im Code:

- explizite Fallback-Noten in `stateTransitionTable.ts`
- `modified_projected_fsm` als fachlicher Zustand fuer nachtraeglich
  veraenderte projizierte FSMs
- klare UI-Meldung im STT-Modal statt stiller Teilprojektion

Offen:

- dieselbe Semantik ueber alle angrenzenden Panels und Hilfstexte gleichziehen
- verbleibende technische Begriffe dort ersetzen, wo eine fachliche
  Benennung moeglich ist

Abnahme:

- jede projizierte FSM landet in genau einem klaren Semantikzustand
- derselbe Canvas-Fall erzeugt in allen Panels denselben Erklaerungstext

## FSM0-3 Breite/reduzierte FSM-Faelle sauber abschliessen

Ziel:

- grosse projizierte FSMs kontrolliert reduziert anzeigen, ohne die kanonische
  Sicht oder die Erklaerbarkeit zu verlieren

Bereits im Code:

- reduzierte kompakte STT fuer breite projected-Faelle existiert
- reduzierte Notes und Modusfreigaben sind im Core verankert

Offen:

- die verbleibenden breiten/reduzierten Repros manuell sauber abnehmen
- die Grenze zwischen reduzierter Kompaktsicht und bewusst technischer Vollsicht
  weiter haerten

Abnahme:

- breite projected-Faelle sind automatisiert und manuell abgesichert
- kein Sprung mehr zwischen "kompakt", "reduziert" und "technisch voll" ohne
  klaren Grund

## FSM0-4 Legacy-Bridge haerten

Ziel:

- aeltere gespeicherte FSM-Exporte konservativ und robust in die neue
  Projektion ueberfuehren, ohne sie aggressiv umzudeuten

Bereits im Code:

- strenge read-only Legacy-Bruecke fuer klar erkennbare Altfallsignaturen
- Regressionen gegen den abgelegten Download-Fall

Offen:

- mehr reale Altfaelle als Fixtures einsammeln
- Trennschaerfe zwischen "legacy noch sauber projizierbar" und
  "bewusst technisch voll" weiter absichern

Abnahme:

- bekannte Altfaelle bleiben stabil
- unsichere Legacy-Faelle werden nicht halb-falsch kompakt dargestellt

## FSM0-5 STT und Timing vollstaendig angleichen

Ziel:

- dieselbe aktive Systemauswahl, dieselbe Panel-Semantik und dieselben
  Begruendungstexte in STT und Timing erzwingen

Bereits im Code:

- gemeinsamer Panel-State-Helfer in
  `src/components/panels/panelViewState.ts`
- System-Selektor fuer getrennte FSMs und getrennte Rohschaltungen ist in
  beiden Panels wieder konsistent
- `TimingDiagram` trennt bewusst zwischen `vollstaendig` und `ausgewählt`

Offen:

- Restunterschiede bei Noten, Fallback-Meldungen und Spezialfaellen glatten
- verbleibende Manual-Checks fuer Timing/STT-Paare festziehen

Abnahme:

- dieselbe Canvas-Situation fuehrt in STT und Timing auf dieselbe aktive
  Subsystem-Auswahl und dieselbe Einordnung

## FSM0-6 Fruehe Editor-/Canvas-Rueckmeldung

Ziel:

- veraenderte synthetisierte FSMs frueher sichtbar machen, nicht erst beim
  Oeffnen der STT

Bereits im Code:

- Reachability-Hinweise fuer unerreichbare Editor-Zustaende sind bereits im
  FSM-Editor sichtbar

Offen:

- den Zustand "projizierte FSM spaeter manuell veraendert" frueher im
  Canvas-/Analyse-Umfeld markieren
- dabei keine neue Logik-Engine bauen, sondern bestehende Semantik nur
  frueher surfacen

Abnahme:

- Nutzer sehen vor dem Oeffnen der STT, dass die kompakte FSM-Sicht nicht mehr
  gilt

## FSM0-7 Regressions- und Fixture-Wall

Ziel:

- die aktuell bekannten Fehlerklassen dauerhaft als Tests und Repro-Faelle im
  Repo verankern

Bereits im Code:

- neue Tests fuer
  - FSM-Struktur/Reachability
  - Boundary-Core
  - Copy/Paste projizierter FSMs
  - Panel-View-State
  - `modified_projected_fsm`

Offen:

- breite projected-Faelle, Legacy-Repros und weitere Mischfaelle dichter
  absichern
- die Manual-Verifikation enger mit den wichtigsten Repros koppeln

Abnahme:

- bekannte FSM-Bugs sind reproduzierbar und als feste Regressionen vorhanden
- weitere UI-/API-Aenderungen muessen gegen dieselben Repros laufen

## Was bewusst nicht in FSM0 liegt

- `FSM0-8`: Netzlisten-Minimierung, boolesches Sharing, Mapping und
  Struktur-Optimierung

Begruendung:

- dieser Pfad ist wertvoll, sollte aber erst starten, wenn die fachliche
  FSM-Semantik, die Panel-Konsistenz und die Regressionen sauber abgeschlossen
  sind
