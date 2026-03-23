# FSM0 Work Package

Datum: 2026-03-23
Repo: `<repo-root>`
Status: **abgeschlossen im aktuellen Scope**
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
- die Analyse-Subsysteme tragen jetzt explizite Projektion-Semantik fuer
  `clean`, `legacy`, `modified` und gemischte projizierte Sequential-Faelle
- Copy/Paste und Duplicate synthetisierter FSMs behandeln
  `projectionBatchId` jetzt konservativ und batch-sicher
- die Legacy-Bridge erkennt jetzt auch duplizierte bzw. suffigierte geladene
  Alt-Exporte wieder als getrennte projizierte Systeme statt sie in eine
  generische Restanalyse fallen zu lassen
- strukturell veraenderte Legacy-FSMs verlieren die kompakte Projektion jetzt
  ebenfalls bewusst, sobald `CLK` oder `RST` nicht mehr nur sauber die
  kanonischen Zustandsregister treiben
- STT und Timing teilen sich die Systemauswahl ueber
  `src/components/panels/panelViewState.ts`
- STT und Timing beziehen ihre fachlichen Subsystem-Hinweise jetzt aus einer
  gemeinsamen Helper-Schicht statt aus getrennten Spezialtexten
- nachtraeglich veraenderte projizierte FSMs werden nicht mehr still als
  halbgueltige Kompakt-FSM behandelt, sondern explizit als
  `modified_projected_fsm`
- der Hauptcanvas zeigt diese Semantik jetzt schon vor STT/Timing als fruehe
  Analyse-Banner fuer `legacy`, `modified`, `mixed` und mehrere getrennte
  projizierte Systeme
- diese fruehen Canvas-Hinweise sind fuer den aktuellen Analysezustand auch
  bewusst wegklickbar, ohne dass die zugrunde liegende Semantik verloren geht
- der FSM-Editor zeigt fuer breite Roh-SOP-Faelle jetzt schon vor der
  eigentlichen Canvas-Synthese einen sichtbaren Guardrail-Hinweis, wenn die
  unverdichtete Netzliste spaeter bewusst blockiert werden wuerde
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
| `FSM0-1` | Subsystem-Grenzen fuer Mischnetze | sehr hoch | mittel bis hoch | **abgeschlossen im aktuellen Scope** |
| `FSM0-2` | Projektions-Lebenszyklus semantisch durchziehen | sehr hoch | mittel | **abgeschlossen im aktuellen Scope** |
| `FSM0-3` | breite/reduzierte FSM-Faelle sauber abschliessen | hoch | mittel | **abgeschlossen im aktuellen Scope** |
| `FSM0-4` | Legacy-Bridge haerten | mittel bis hoch | mittel | **abgeschlossen im aktuellen Scope** |
| `FSM0-5` | STT und Timing vollstaendig angleichen | hoch | mittel | **abgeschlossen im aktuellen Scope** |
| `FSM0-6` | fruehe Editor-/Canvas-Rueckmeldung | mittel | klein bis mittel | **abgeschlossen im aktuellen Scope** |
| `FSM0-7` | Regressions- und Fixture-Wall | sehr hoch | mittel | **abgeschlossen im aktuellen Scope** |

## Abschlussbewertung

Der FSM-Strang ist fuer den **aktuellen Scope** jetzt geschlossen.

Abgeschlossen und abgenommen sind:

- Reachability und synthetisierte Teilmenge im Editor
- Copy/Paste- und Duplicate-Pfade fuer projizierte sowie Legacy-FSMs
- gemeinsame Semantik `clean / legacy / modified / mixed`
- gemeinsame STT-/Timing-Systemauswahl und fachlich gleiche Hinweise
- direkte Ketten-, Observer-, Mixed-Islands-, Shared-Observer- und
  Shared-Helper-Boundary-Faelle
- Guardrail fuer breite unverdichtete SOP-Synthese
- fruehe Editor-/Canvas-Rueckmeldung
- fixture-getriebene Repro-/Regression-Wall

Automatische Abschlussbasis:

- `npm test -- --run` gruen
- `npm run build` gruen
- die neuen FSM-Fixture- und Boundary-Regressionsringe sind gruen

Bewusst **nicht** Teil des abgeschlossenen Scope:

- `FSM0-8` Netzlisten-Minimierung / Bool-Minimierung / Mapping
- weitere optionale Legacy-Breadth ueber mehr Altfall-Fixtures
- spaetere weitere UI-/Visual-Polish-Runden ohne neue Kernsemantik

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
- mehrere projizierte FSM-Batches bleiben jetzt auch dann getrennt
  selektierbar, wenn sie nur ueber eine rohe, rein kombinatorische
  Downstream-Beobachterlogik zusammenhaengen, z. B. ueber ein zusaetzliches
  `AND` plus `OUTPUT_LED`
- mehrere getrennte gemischte Sequential-Inseln bleiben jetzt ebenfalls als
  getrennte technische Analyse-Systeme selektierbar; der System-Selektor
  disambiguiert doppelte Fachlabels dabei stabil zu `Y`, `Y_1`, ...
- mehrere gemischte/projizierte Inseln bleiben jetzt auch dann getrennt,
  wenn sie nur ueber einen gemeinsamen rohen Downstream-Observer-Zweig
  zusammenhaengen; reine Observer-Hilfsnetze werden dafuer konservativ aus der
  Boundary-Bildung herausgeschnitten
- mehrere gemischte/projizierte Inseln bleiben jetzt auch dann getrennt,
  wenn sie nur ueber gemeinsame rohe Feed-forward-Hilfslogik aus
  Eingangs-/Konstantenpfaden zusammenhaengen; solche Supportpfade werden pro
  Insel konservativ repliziert statt die Systeme zu einem grossen Mixed-Fall
  zusammenzukleben
- direkt verkettete Batch-Faelle kippen bewusst in den dokumentierten
  `fallback_mixed_batches`
- rohe oder fremde Logik, die in einen projizierten Kern zuruecktreibt,
  bleibt weiterhin bewusst im `modified`-/`mixed`-Fallback und wird nicht
  halb-falsch wieder auf getrennte Kompaktsichten aufgespalten

Offen:

- im aktuellen Scope keine Pflicht-Restarbeit mehr
- spaetere Folgearbeit waere nur noch weiterer optionaler Boundary-Ausbau
  jenseits der jetzt abgesicherten Observer-, Mixed-Islands- und
  Shared-Helper-Faelle

Abnahme:

- getrennte FSMs bleiben separat selektierbar
- getrennte FSMs bleiben auch bei reinem Downstream-Observer separat
  selektierbar
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
- `clean_projected_fsm`, `legacy_projected_fsm`, `modified_projected_fsm`
  und `mixed_projected_subsystem` werden jetzt zentral an den Analyse-
  Subsystemen gefuehrt
- STT und Timing nutzen fuer Legacy-/Modified-/Mixed- und
  Isolationshinweise jetzt denselben Semantik-Helfer

Offen:

- im aktuellen Scope keine Pflicht-Restarbeit mehr
- spaetere Folgearbeit waere nur noch semantischer Feinschliff oder weitere
  Benennungs-/UI-Politur ohne neue Grundstruktur

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
- reduzierte Meta zeigt jetzt explizit
  - welche Steuer-Eingaenge wegen der Kappung weggelassen wurden
  - wie viele fachlich relevante Vollzeilen der breite Fall eigentlich haette
  - wie viele sichtbare Zeilen die reduzierte Kompaktsicht stattdessen zeigt
- breite, unverdichtete SOP-Synthese wird jetzt bewusst vor dem Canvas-Aufbau
  blockiert, sobald sie voraussichtlich eine fuer Browser und Markierungen
  unkontrollierbare Gate-/Leitungsmenge erzeugen wuerde; der Benutzer bekommt
  dafuer eine explizite Uebergangsmeldung statt eines Absturzes
- diese Blockade ist absichtlich nur ein Schutzschnitt: eine spaetere
  verdichtete Synthese ueber Quine-McCluskey oder aequivalente
  Bool-Minimierung bleibt als Folgearbeit offen

Offen:

- die aktuelle Pflichtarbeit ist geschlossen
- bewusster Folgepfad bleibt die spaetere verdichtete Synthese statt der
  heutigen Guardrail-Blockade (`FSM0-8`)

Abnahme:

- breite projected-Faelle sind automatisiert und manuell abgesichert
- breite unverdichtete FSMs kippen kontrolliert in eine klare Blockade statt
  in Browser- oder Canvas-Ueberlast
- kein Sprung mehr zwischen "kompakt", "reduziert" und "technisch voll" ohne
  klaren Grund

## FSM0-4 Legacy-Bridge haerten

Ziel:

- aeltere gespeicherte FSM-Exporte konservativ und robust in die neue
  Projektion ueberfuehren, ohne sie aggressiv umzudeuten

Bereits im Code:

- strenge read-only Legacy-Bruecke fuer klar erkennbare Altfallsignaturen
- Regressionen gegen den abgelegten Download-Fall
- Batch-sichere Legacy-Erkennung auch fuer suffigierte Duplikate eines
  geladenen Alt-Exports, damit diese wieder getrennt selektierbar bleiben
- konservative Strukturpruefung fuer Legacy-`CLK`/`RST`, damit nachtraeglich
  veraenderte Alt-FSMs nicht weiter als kompakte FSM-Projektion durchrutschen

Offen:

- im aktuellen Scope keine Pflicht-Restarbeit mehr
- spaetere optionale Folgearbeit waere nur noch mehr Altfall-Breadth ueber
  weitere reale Legacy-Fixtures

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
- STT und Timing teilen sich jetzt auch die fachlichen Legacy-/Modified-/
  Mixed- und Isolationshinweise fuer aktive Analyse-Subsysteme

Offen:

- im aktuellen Scope keine Pflicht-Restarbeit mehr
- spaetere Folgearbeit waere nur noch Text-/Visual-Feinschliff ohne neue
  Grundsemantik

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
- breite FSMs zeigen jetzt im Editor schon vor der eigentlichen Canvas-
  Synthese einen Guardrail-Hinweis, wenn die unverdichtete SOP spaeter bewusst
  blockiert wuerde
- der Hauptcanvas zeigt fuer `legacy`, `modified`, `mixed` und mehrere
  getrennte projizierte Systeme jetzt schon vor STT/Timing einen
  Analyse-Banner mit derselben fachlichen Semantik wie die spaeteren Panels

Offen:

- im aktuellen Scope keine Pflicht-Restarbeit mehr
- spaetere Folgearbeit waere nur noch zusaetzlicher UX-Feinschliff an
  Kontext oder Selektion

Abnahme:

- Nutzer sehen vor dem Oeffnen der STT bzw. des Timing-Panels, wenn
  projizierte FSM-Semantik bereits auf `legacy`, `modified` oder `mixed`
  steht
- breite FSMs werden schon im Editor vor der eigentlichen Canvas-Synthese als
  Guardrail-Fall sichtbar

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
- fixture-getriebene Regressionen binden jetzt den gespeicherten breiten
  Editor-Repro `validation/manual-fixtures/fsm-wide/fsm0_wide_reduced_fixture.fsm.json`
  und den echten Legacy-Download-Fall
  `validation/fsm-export-fixes/cases/downloads/2026-03-19/FSM_EXPORT_19.03.26.lgsc.json`
  direkt in die Tests ein
- zusaetzlich ist jetzt auch ein gespeicherter `projected + raw`-Canvas-Repro
  unter `validation/manual-fixtures/fsm-mixed/fsm0_projected_raw_modified_fixture.lgsc.json`
  als feste Fixture mit Regression hinterlegt
- zusaetzlich ist jetzt auch ein gespeicherter Repro fuer direkt verkettete
  projizierte FSM-Batches unter
  `validation/manual-fixtures/fsm-chained/fsm0_direct_chained_batches_fixture.lgsc.json`
  mit Regression hinterlegt
- zusaetzlich ist jetzt auch ein gespeicherter Repro fuer getrennte
  projizierte FSM-Batches mit gemeinsamem rohem Beobachterpfad unter
  `validation/manual-fixtures/fsm-observer/fsm0_observer_split_batches_fixture.lgsc.json`
  mit Regression hinterlegt
- zusaetzlich ist jetzt auch ein gespeicherter Repro fuer mehrere getrennte
  gemischte Sequential-Inseln unter
  `validation/manual-fixtures/fsm-islands/fsm0_multiple_mixed_islands_fixture.lgsc.json`
  mit Regression hinterlegt
- zusaetzlich ist jetzt auch ein gespeicherter Repro fuer mehrere getrennte
  gemischte Inseln mit gemeinsamem rohem Observer-Zweig unter
  `validation/manual-fixtures/fsm-islands/fsm0_mixed_islands_shared_observer_fixture.lgsc.json`
  mit Regression hinterlegt
- zusaetzlich ist jetzt auch ein gespeicherter Repro fuer mehrere getrennte
  gemischte Inseln mit gemeinsamer roher Feed-forward-Hilfslogik unter
  `validation/manual-fixtures/fsm-islands/fsm0_shared_helper_islands_fixture.lgsc.json`
  mit Regression hinterlegt
- die breite Fixture ist jetzt zusaetzlich lokal dokumentiert unter
  `validation/manual-fixtures/fsm-wide/README.md`
- die gemischte Fixture ist lokal dokumentiert unter
  `validation/manual-fixtures/fsm-mixed/README.md`
- die Chained-Fixture ist lokal dokumentiert unter
  `validation/manual-fixtures/fsm-chained/README.md`
- die Observer-Fixture ist lokal dokumentiert unter
  `validation/manual-fixtures/fsm-observer/README.md`
- die Mixed-Islands-Fixture ist lokal dokumentiert unter
  `validation/manual-fixtures/fsm-islands/README.md`

Offen:

- im aktuellen Scope keine Pflicht-Restarbeit mehr
- weitere Mischfaelle oder spaetere Spezial-Repros waeren nur noch optionale
  Erweiterung, nicht mehr noetige Grundabsicherung

Abnahme:

- bekannte FSM-Bugs sind reproduzierbar und als feste Regressionen vorhanden
- breite, Legacy-, `projected + raw`-, Chained-Batch- und Observer-Split-
  Kernrepros sowie getrennte Mixed-Islands-Repros sind nicht
  nur beschrieben, sondern als feste gespeicherte Fixture-Pfade mit
  automatischer Regression hinterlegt
- die wichtigsten manuellen Repros sind im Verification-Plan direkt an diese
  gespeicherten Fixture-Pfade gekoppelt
- weitere UI-/API-Aenderungen muessen gegen dieselben Repros laufen

## Was bewusst nicht in FSM0 liegt

- `FSM0-8`: Netzlisten-Minimierung, boolesches Sharing, Mapping und
  Struktur-Optimierung

Begruendung:

- dieser Pfad ist wertvoll, sollte aber erst starten, wenn die fachliche
  FSM-Semantik, die Panel-Konsistenz und die Regressionen sauber abgeschlossen
  sind

## Abschlussstatus

- `FSM0-1` bis `FSM0-7` sind im aktuellen Scope abgeschlossen
- die dazugehoerigen Kernrepros sind als gespeicherte Fixtures und
  automatische Regressionen hinterlegt
- die sichtbaren Hauptpfade sind manuell gegengeprueft und dokumentiert
- ein neuer aktiver FSM-Arbeitsblock sollte erst wieder gestartet werden, wenn
  bewusst `FSM0-8` oder weitere optionale Folgeexpansion aufgenommen werden
