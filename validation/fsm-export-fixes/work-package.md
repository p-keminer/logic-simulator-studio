# FSM Export Structural Work Package

Datum: 2026-03-20
Repo: `<repo-root>`
Status: **in Arbeit**
Prioritaet: **P1/P2**
Geltungsbereich: **alle aus dem FSM-Editor synthetisierten Schaltungen**

## Zweck

Dieses Arbeitspaket dokumentiert keine Einzelfix-Idee fuer eine konkrete FSM,
sondern die aktuell bekannten strukturellen Schwaechen entlang des Pfads:

`FSM-Editor -> Synthese auf Canvas -> STT -> Timing Diagram -> HDL-Export -> UI-Validierung`

Ziel ist eine allgemeine Loesung, die fuer **alle** FSM-Exporte gilt und nicht
durch manuelles Nachpatchen einzelner Schaltungen gepflegt werden muss.

## Repro-Faelle

- `validation/fsm-export-fixes/cases/downloads/2026-03-20/FSM_EXPORT_19.03.26.lgsc.json`
  Benutzerseitig abgelegter FSM-Export aus `Downloads`; dient als konkreter
  Referenzfall fuer die aktuell sichtbaren STT-/Timing-Probleme.

## Bereits umgesetzt (2026-03-20, erster Infrastrukturschnitt)

- optionales Projektions-Metadatenmodell auf `GateInstance`
- erste FSM-Synthese-Annotationen fuer:
  - `CLK`
  - `RST`
  - externe FSM-Eingaenge
  - kanonische State-Bits `Qn`
  - fachliche Outputs
  - abgeleitete `!Qn`- und Display-Mirror-Signale
- neue read-only Kanalprojektion in
  `src/core/analysis/sequentialProjection.ts`
- Timing-Diagramm konsumiert fuer synthetisierte FSMs jetzt bereits die
  kanonischen, deduplizierten Projektionskanaele statt der Roh-Gate-Menge
- STT filtert fuer isolierte synthetisierte FSMs jetzt ebenfalls auf
  kanonische FSM-Eingaenge, kanonische State-Bits und fachliche Outputs statt
  auf LED-Mirror-/Hilfssignale
- ein eigener Core-Helfer fuer statische/reduzierte STT existiert jetzt in
  `src/core/analysis/stateTransitionTable.ts`; `TruthTableModal` ruft diesen
  Kern-Helfer auf, statt die komplette reduzierte Sequenzanalyse selbst zu
  tragen
- Reduced-STT behandelt projizierte FSM-Eingaenge jetzt als kanonische
  Steuerleitungen statt sie erneut ueber Datenpin-Heuristiken zu klassifizieren
- strenger read-only Legacy-Brueckenpfad:
  aeltere gespeicherte FSM-Exporte ohne `projection`-/`projectionBatchId`-
  Metadaten koennen jetzt fuer klar erkennbare Einzelfaelle wieder in eine
  kanonische Projektion gehoben werden, ohne die gespeicherte Schaltung selbst
  umzuschreiben
- Projection-Core und Timing behandeln gemischte/projizierte Sequenzfaelle
  jetzt expliziter: bei partieller Eingangs-, Zustands- oder Ausgangsdeckung
  wird bewusst auf den generischen Fallback gewechselt, statt eine halb-
  projizierte Sonderansicht zu zeigen
- Regressionstest auf dem echten gespeicherten Download-Fall:
  die Fixture `FSM_EXPORT_19.03.26.lgsc.json` dient jetzt nicht mehr nur als
  Dokumentationsbeleg, sondern sichert die Legacy-Projektion direkt ab
- direkte Regressionen decken jetzt auch den neuen STT-Core-Helfer, breite
  projizierte Eingangsfaelle und den expliziten Mixed-Output-Fallback ab
- der statische STT-Kern settled den erzwungenen Present-State jetzt vor dem
  eigentlichen Transition-Tick kombinatorisch aus; dadurch duerfen live
  blinkende `gate.outputSignals` nicht mehr in die Tabellenzeilen
  hineinleaken
- das Truth-Table-/STT-Modal haengt seine Analyse jetzt an einen statischen
  Analyse-Key plus ein bereinigtes Analyse-Circuit-Modell; reine
  Signal-Ticks/LED-Blinks duerfen damit die Tabellenberechnung nicht mehr
  erneut anstossen
- projected FSMs haben in der STT jetzt eine explizite Ansichtsumschaltung:
  `FSM kompakt` als ruhige Standardansicht ueber der unveraenderten
  technischen Volltabelle; die eigentliche Roh-STT bleibt als separater Modus
  erhalten und wurde nicht in die Display-Logik hineingemischt
- die Modusfreigabe ist jetzt bewusst an `projectionStatus` gekoppelt:
  nur sauber projizierte bzw. Legacy-projizierte FSMs duerfen `FSM kompakt`
  ueberhaupt anbieten; partielle oder gemischte Faelle bleiben technisch voll
  und zeigen explizit den Grund dafuer an
- eine direkte Regression auf dem realen Download-/Legacy-Fall prueft jetzt
  explizit, dass dieselbe FSM-Tabelle auch dann identisch bleibt, wenn die
  aktuellen Gate-Ausgangssignale kuenstlich umgekippt werden
- der focused-nine UI-Audit prueft jetzt zusaetzlich zwei konkrete STT-
  Modusfaelle: projected FSM mit Umschaltung zwischen `FSM kompakt` und
  `Technisch voll`, plus gemischter Legacy-Fallback ohne irrefuehrenden
  Kompakt-Dropdown

Bewusst noch offen:
- der neue STT-Kern ist absichtlich noch schmal und bildet nur den bereits
  vorhandenen Analysepfad ab; ein groesserer Modellumbau wurde bewusst
  vermieden
- gemischte FSM-/Nicht-FSM-Schaltungen haben jetzt einen expliziten Fallback,
  aber noch keine feinere Subsystem-Grenzziehung fuer komplexere Mischnetze
- die Legacy-Bruecke ist absichtlich streng und konservativ; fuer komplexere
  gespeicherte Altfaelle braucht es noch klarere Subsystem-Erkennung statt
  bloßer Signatur-Inferenz

## Naechster risikoarmer Schritt

Der naechste Schritt soll bewusst klein bleiben und keine grosse Refactor-
Welle ausloesen:

- auf dem neuen STT-Core-Helfer weiter testen statt ihn sofort auszubauen:
  breite projizierte Faelle, explizite Mixed-Fallbacks und spaeter feinere
  Subsystem-Grenzen; der naechste echte Mehrwert liegt jetzt weniger in noch
  mehr UI-Wiring, sondern in saubereren Subsystem-Grenzen fuer gemischte
  sequentielle Netze
- UI-Wiring weiter stabil lassen; keine grosse Refactor-Welle in
  `TruthTableModal` oder `TimingDiagram`
- erst wenn der kleine Kern belastbar ist, den naechsten Schritt in Richtung
  vollstaendiger statischer/reduzierter Sequenzanalyse planen

Damit bleibt die Aenderung klein genug, um die bestehende Validierung nicht
zu destabilisieren, verschiebt die fachliche Logik aber trotzdem schrittweise
aus der UI in den Core.

## Aktuell bekannte Schwaechen

### 1. Zustandsuebergangstabelle arbeitet zu niedrigstufig

Beobachtung:
- Eine im FSM-Editor fachlich sauber definierte FSM kann im Canvas korrekt
  synthetisiert werden und HDL erzeugen.
- Die Zustandsuebergangstabelle zeigt fuer synthetisierte FSMs aber nicht immer
  die kanonischen Fachsignale, sondern teilweise rohe, live abgeleitete
  Tragersignale wie `Y`, `Q1`, `Q2`, die mit den blinkenden LEDs sichtbar
  "springen".

Strukturelle Ursache:
- Die STT in `src/components/panels/TruthTableModal.tsx` sammelt ihre
  Zustandsvariablen generisch ueber `collectSttFeedbackGateIds()` und
  `collectStateVarsForStt()`.
- Diese Ableitung ist fuer allgemeine sequenzielle Schaltungen brauchbar, aber
  fuer synthetisierte FSMs semantisch zu roh.
- Die Tabelle kennt aktuell keinen Unterschied zwischen:
  - kanonischem FSM-Zustandsbit
  - invertiertem Hilfssignal
  - LED-Spiegel
  - internem Hilfsgatter

Folge:
- Die STT ist fuer FSM-Exporte nicht stabil genug als fachliche Projektion.
- Eine FSM mit klaren 8 Zustaenden im Editor wirkt in der STT semantisch
  unsauber oder verwirrend.

### 1b. Die STT ist noch zu nah an der Live-Simulation statt an einer statischen Zustandsrelation

Beobachtung:
- Bei mehreren sequenziellen Schaltungen springen die Zahlen in der
  Zustandsuebergangstabelle sichtbar hin und her.
- Das wirkt wie eine Live-Anzeige laufender Signale, nicht wie eine stabile
  Tabelle `Q(t) + Eingaben -> Q(t+1)`.

Strukturelle Ursache:
- Die aktuelle STT-Berechnung nutzt zwar bereits eine gesonderte Analyse, aber
  semantisch ist sie noch nicht streng genug von der laufenden, sichtbaren
  Schaltung getrennt.
- Es fehlt eine explizite projektweite Logik, die zwischen
  - Live-Timing / Waveform und
  - statischer Zustandsrelation
  trennt.
- Fuer breite sequenzielle Schaltungen fehlt ausserdem ein klar definierter
  Standardmodus fuer eine **verkuerzte, statische STT**, die nicht versucht,
  jede Hilfsleitung oder jede Datenkombination direkt mitzuziehen.

Folge:
- Die STT ist nicht ausreichend ruhig, deterministisch und fachlich fokussiert.
- Gerade bei sequenziellen Schaltungen entsteht der Eindruck einer "springenden"
  oder live mitblinkenden Tabelle, obwohl eigentlich eine feste Relation
  dargestellt werden sollte.

### 2. Timing Diagramm zeigt Rohstruktur statt kanonischer Signale

Beobachtung:
- Im Timing Diagramm tauchen bei FSM-Exporten Signale doppelt oder mehrfach auf.
- Typische Duplikate sind:
  - `Q`
  - `!Q`
  - zusaetzliche LED-Mirror
  - Ausgangsgatter aus der Synthese
  - interne Hilfssignale

Strukturelle Ursache:
- `src/components/panels/TimingDiagram.tsx` baut Kanaele derzeit aus nahezu
  jedem verbundenen Gate-Output auf.
- Die Komponente kennt keine Signalrolle und keine Gruppierung nach fachlicher
  Bedeutung.

Folge:
- Die Signalansicht ist fuer synthetisierte FSMs schnell unuebersichtlich.
- Fuer die Standardansicht werden zu viele intern erzeugte Signale gezeigt, die
  fachlich nicht die eigentlichen FSM-Signale sind.

### 3. Die FSM-Synthese erzeugt Hilfsstruktur ohne UI-Semantik

Beobachtung:
- Die Synthese selbst funktioniert grundsaetzlich.
- Sie erzeugt aber bewusst mehr als nur die fachlichen FSM-Signale:
  - D-FFs fuer Zustandsbits
  - NOT-Gatter fuer `!Q`
  - SOP-Hilfsgatter
  - LEDs fuer Ausgaenge
  - LEDs fuer Zustandsbits `Q0`, `Q1`, ...

Strukturelle Ursache:
- `src/fsm/synthesis/synthesize.ts` erzeugt nur eine strukturell korrekte
  Schaltung, aber keine Metadaten fuer spaetere UI-Projektionen.
- Die nachgelagerten UIs sehen daher nur "Gates und Ports", aber nicht:
  - welches Signal ein fachliches Zustandsbit ist
  - welches Signal nur eine Hilfsinversion ist
  - welches Signal nur ein Display-Mirror ist

Folge:
- Dieselbe Synthese ist fuer HDL okay, fuer UI-Projektionen aber nicht reich
  genug annotiert.

### 4. Die aktuelle Validation prueft den problematischen End-to-End-Pfad noch nicht hart genug

Beobachtung:
- Die bestehende Validation ist fuer Simulator, Contracts, Golden Corpus und
  HDL-Tooling stark.
- Sie deckt aber den kompletten Pfad
  `FSM-Editor -> Synthese -> STT/Timing-Projektion`
  noch nicht ausreichend als eigene Invariante ab.

Aktuelle Luecke:
- Es gibt Tests fuer FSM-Reducer, Parser und Synthesegrundlogik.
- Es gibt Grundtests fuer STT-Helfer.
- Es gibt fokussierte UI-Audits.
- Es fehlt aber eine Reihe expliziter Invarianten fuer synthetisierte FSMs, z. B.:
  - genau die erwartete Anzahl kanonischer Zustandsbits
  - keine doppelte Standardprojektion von `Q`, `!Q` und LED-Mirror
  - stabile STT-Projektion fuer eine 8-Zustands-FSM
  - klare Trennung von "fachlich sichtbar" und "intern/debug"

## Erste strukturelle Loesungsideen

### A. Signalrollen statt nur Gate-Ports

Die zentrale Aenderung sollte nicht in einzelnen Panels starten, sondern in
einem kleinen semantischen Modell fuer projizierte Signale.

Beispielhafte Rollen:
- `fsm-state-bit`
- `fsm-state-bit-inverted`
- `fsm-output`
- `display-mirror`
- `internal-helper`
- `external-input`
- `clock`
- `reset`

Wirkung:
- STT und Timing koennen dieselbe kanonische Projektion verwenden.
- Nicht mehr jeder Output-Port ist automatisch ein "gleichwertiges" Signal.

### B. FSM-Synthese muss Herkunft und Rolle annotieren

Die Synthese sollte fuer erzeugte Gates/Wires eine Form von Metadaten
hinterlegen, zum Beispiel:
- fachlicher Signalname
- Rollenklasse
- Gruppenschluessel
- Sichtbarkeitsstufe (`canonical`, `derived`, `debug`)

Beispiel:
- `Q1` -> `canonical`
- `!Q1` -> `derived`
- LED an `Q1` -> `display-mirror`
- SOP-Zwischensignal -> `internal-helper`

Wirkung:
- Dieselbe synthetisierte Schaltung bleibt HDL-faehig, aber die UI bekommt
  genug Semantik fuer ordentliche Projektionen.

### C. STT und Timing sollten Projektionen auf Basis derselben Semantik sein

Die beiden UIs sollten nicht getrennt heuristisch erraten, was sichtbar sein
soll, sondern auf dieselbe Projektionslogik zugreifen.

Standardansicht:
- nur kanonische Zustandsbits
- nur fachliche FSM-Ausgaenge
- relevante Eingaenge/Clock/Reset

Erweiterte Ansicht:
- abgeleitete/invertierte Signale
- interne Hilfssignale
- Display-Mirrors

Wirkung:
- dieselbe FSM sieht in STT und Timing gleichartig aus
- Debug-Sicht bleibt moeglich, aber nicht als Standard

### C1. Die STT braucht einen eigenen statischen Sequenzanalyse-Modus

Projektuebergreifender Ansatz:
- `Timing` zeigt weiterhin, was live im Simulator passiert.
- `STT` zeigt dagegen niemals den "blinkenden" Live-Zustand, sondern immer eine
  **statische Zustandsrelation**.

Das bedeutet:
- kanonische Zustandsbits bestimmen
- relevante Steuer-/Projektionseingaenge bestimmen
- Hilfs-, Spiegel- und Display-Signale aus der Standard-STT entfernen
- Daten-/Nebenleitungen fuer die reduzierte Ansicht deterministisch fixieren
  oder gruppieren
- fuer jede Kombination genau einen abstrahierten Simulationsschritt rechnen
- daraus eine feste Tabelle fuer `Q(t)`, `Q(t+1)` und fachliche Ausgaenge
  erzeugen

Fuer kleine Schaltungen:
- volle STT

Fuer breite sequenzielle Schaltungen:
- **verkuerzte STT**
- enumeriert nur:
  - kanonische Zustandsbits
  - Clock / Reset / Enable / Select / sonstige Steuerleitungen
- Datenleitungen und Hilfssignale werden fixiert, gruppiert oder aus der
  Standardansicht ausgeblendet

Wirkung:
- die STT bleibt ruhig, klein und fachlich lesbar
- dieselbe Projektionslogik kann fuer viele Gate-Klassen und auch fuer
  synthetisierte FSMs wiederverwendet werden
- das Problem wird nicht gate-fuer-gate, sondern systemisch geloest

### D. Validation muss von "Gate korrekt" zu "FSM-Projektion korrekt" erweitert werden

Neben Golden Corpus, Contract Runner und Focused-Nine braucht es dedizierte
FSM-Export-Invarianten.

Noetige neue Kategorien:
- Synthese-Metadaten vorhanden und konsistent
- STT-Kanalmenge fuer FSM-Exporte korrekt
- Timing-Kanalmenge fuer FSM-Exporte korrekt dedupliziert
- Anzahl der sichtbaren kanonischen Zustandsbits stimmt mit der FSM-Codierung
  ueberein
- Editor-Zustaende und projizierte STT-Zustaende passen zusammen

## Arbeitspaket

### WP-FSM-1: Kanonisches Signalmodell fuer FSM-Projektionen

Ziel:
- Eine wiederverwendbare Beschreibung dafuer, welche Signale fachlich sichtbar
  sind und welche nur Hilfs-/Debugcharakter haben.

Unterpakete:
- Signalrollen und Sichtbarkeitsklassen definieren
- Kanonische Namen/Gruppenschluessel festlegen
- Datenstruktur fuer Projektionen dokumentieren

Definition of Done:
- STT und Timing koennen dieselbe Signalprojektions-API verwenden
- invertierte oder gespiegelte Signale sind semantisch erkennbar

### WP-FSM-2: Synthese-Metadaten fuer alle FSM-Exporte

Ziel:
- `synthesizeFsm()` liefert nicht nur Gates/Wires, sondern auch ausreichend
  Herkunfts- und Rollenmetadaten.

Unterpakete:
- Annotation der State-Bits `Qn`
- Annotation der invertierten State-Helfer `!Qn`
- Annotation der fachlichen Outputs
- Annotation von Display-Mirrors und internen SOP-Helfern

Definition of Done:
- Jeder aus dem FSM-Editor erzeugte relevante Signalpfad ist klassifizierbar

### WP-FSM-3: STT als kanonische FSM-Projektion

Ziel:
- Die Zustandsuebergangstabelle zeigt fuer synthetisierte FSMs standardmaessig
  nur die fachlich gemeinten Zustands- und Ausgangssignale und wird als
  **statische Zustandsrelation** statt als Live-Anzeige berechnet.

Unterpakete:
- STT erkennt synthetisierte FSM-Strukturen ueber Metadaten statt Heuristik
- aktive Zustandsbits werden kanonisch gruppiert
- Trennung von Live-Timing und statischer STT-Semantik
- voller und verkuerzter STT-Modus mit denselben Projektionsregeln
- reduzierte Enumeration fuer breite sequenzielle Schaltungen
- Hilfssignale werden aus der Standardansicht entfernt
- optionaler Debug-Modus fuer interne Signale

Definition of Done:
- Eine 8-Zustands-FSM erscheint in der STT stabil als 3 Zustandsbits plus
  fachliche Outputs, nicht als ungeordnete Menge aus Hilfstraegern
- dieselbe sequenzielle Schaltung liefert bei unveraenderter Struktur eine
  statische, reproduzierbare STT statt sichtbar "springender" Zahlen

### WP-FSM-4: Timing Diagramm deduplizieren und semantisch ordnen

Ziel:
- Das Timing Diagramm zeigt pro fachlichem FSM-Signal nur eine kanonische
  Standardzeile.

Unterpakete:
- Kanalbildung ueber Projektionslogik statt ueber alle Gate-Outputs
- Spiegel-/Hilfssignale standardmaessig ausblenden
- definierte Sortierung fuer Input, Clock, Reset, State-Bits, Outputs
- optionaler Debug-Schalter fuer erweiterte interne Signale

Definition of Done:
- Keine doppelte Standardanzeige von `Q`, `!Q`, LED-Mirror und Hilfspfaden

### WP-FSM-5: End-to-End-Validation fuer FSM-Exporte

Ziel:
- Die beschriebenen Probleme koennen nicht unbemerkt wiederkehren.

Unterpakete:
- Vitest-Invarianten fuer synthetisierte FSM-Signalprojektionen
- Focused-UI-Audit fuer mindestens einen kleinen und einen groesseren FSM-Fall
- Golden-/Fixture-Faelle speziell fuer FSM-Exportprojektionen
- Regressionen fuer STT-Kanalanzahl und Timing-Kanalanzahl

Definition of Done:
- Ein Rueckfall auf doppelte Timing-Signale oder instabile STT-Projektionen
  wird automatisch rot

### WP-FSM-6: Dokumentation und Modellgrenzen

Ziel:
- Nutzer sehen klar, was fachliche FSM-Projektion ist und was Debug-Sicht ist.

Unterpakete:
- UI-Verhalten dokumentieren
- Debug-/Internals-Sicht abgrenzen
- bekannte Modellgrenzen notieren

Definition of Done:
- Das Verhalten ist fuer Nutzer und fuer spaetere Wartung nachvollziehbar

## Konkrete offene To-dos

- strukturelle Herkunftsmetadaten fuer FSM-Synthese entwerfen
- zentrale Projektionslogik fuer STT und Timing anlegen
- statischen Sequenzanalyse-Modus fuer STT definieren
- verkuerzte STT fuer breite sequenzielle Schaltungen projektweit spezifizieren
- bestehende Heuristiken in `TruthTableModal.tsx` fuer FSM-Exporte ersetzen oder
  uebersteuern
- bestehende Rohkanal-Logik in `TimingDiagram.tsx` fuer FSM-Exporte semantisch
  gruppieren
- End-to-End-Regressionsfaelle fuer FSM-Exportprojektionen aufbauen

## Betroffene Hauptdateien

- `src/fsm/synthesis/synthesize.ts`
- `src/components/panels/TruthTableModal.tsx`
- `src/components/panels/truthTableAnalysis.ts`
- `src/components/panels/TimingDiagram.tsx`
- `src/__tests__/fsm/fsm.test.ts`
- `src/__tests__/simulation/truthTableAnalysis.test.ts`
- `validation/focused-nine-ui-audit.mjs`

## Empfehlung fuer die Umsetzung

Nicht mit manuellen UI-Sonderfaellen beginnen.

Stattdessen:
1. semantisches Signalmodell definieren
2. FSM-Synthese annotieren
3. STT und Timing auf dieselbe Projektion umstellen
4. erst dann gezielte UI-/Audit-Regressionen nachziehen

So bleibt die Loesung allgemein fuer **alle** FSM-Exporte statt fuer einzelne
aktuell auffaellige Beispiele.

## Technischer Umsetzungsansatz

Die Umsetzung sollte nicht mit weiterer Logik direkt in
`TruthTableModal.tsx` oder `TimingDiagram.tsx` starten, sondern mit einer
kleinen Analyse-Schicht, die von beiden UIs genutzt wird.

### 1. Eigene Sequential-Projection-Schicht einfuehren

Empfohlene Richtung:
- neue zentrale Analyse-API, z. B.
  - `buildSequentialProjection(circuit)`
  - `analyzeStateTransitionTable(circuit, projection, options)`
  - `buildTimingChannelProjection(circuit, projection)`

Ziel:
- UI-Komponenten rendern nur noch
- die Fachlogik, welche Signale kanonisch sichtbar sind, lebt an einer Stelle

Wichtige Eigenschaft:
- diese Schicht ist **read-only**
- sie liest den Circuit und berechnet ein Analysemodell
- sie haengt nicht an `timingHistory`, nicht am Race-Monitor und nicht an
  laufender UI-State-Interaktion

Damit wird vermieden, dass STT-Logik seitlich andere Simulationspfade
beeinflusst.

### 2. Klares Projektionsmodell definieren

Sinnvolle Datenstruktur:
- `ProjectedSignal`
  - `id`
  - `label`
  - `role`
  - `visibility`
  - `groupKey`
  - `source`

Moegliche Rollen:
- `state`
- `state_inverted`
- `output`
- `input`
- `clock`
- `reset`
- `enable`
- `select`
- `display_mirror`
- `internal_helper`

Moegliche Sichtbarkeit:
- `canonical`
- `derived`
- `debug`

Wirkung:
- STT kann auf `canonical` filtern
- Timing kann standardmaessig `canonical` zeigen und optional `derived/debug`
  zuschalten
- Duplikate wie `Q`, `!Q`, LED-Mirror und SOP-Helfer lassen sich systematisch
  gruppieren statt spaeter wieder herauszuheuristisieren

### 3. Synthese-Metadaten fuer FSM-Exporte bereitstellen

`synthesizeFsm()` sollte nicht nur Gates/Wires erzeugen, sondern auch
strukturierte Hinweise fuer spaetere Projektion.

Praktisch gedacht:
- pro erzeugtem Gate oder Ausgangspfad eine kleine Annotation
- mindestens:
  - fachlicher Name
  - Rollenklasse
  - Sichtbarkeit
  - Gruppenschluessel

Beispiel:
- D-FF `Q1` -> `role=state`, `visibility=canonical`, `groupKey=state:Q1`
- NOT auf `Q1` -> `role=state_inverted`, `visibility=derived`, `groupKey=state:Q1`
- LED an `Q1` -> `role=display_mirror`, `visibility=derived`, `groupKey=state:Q1`
- FSM-Ausgang `Y` -> `role=output`, `visibility=canonical`, `groupKey=output:Y`

Wichtig:
- diese Metadaten muessen **nur** die Projektion verbessern
- sie sollen nicht die eigentliche Simulationssemantik aendern

### 4. STT als echte statische Analyse berechnen

Die STT sollte aus einer **Analyseebene** kommen, nicht aus dem sichtbaren
Blinkzustand auf dem Canvas.

Vorgeschlagene Berechnung:
1. kanonische Zustandsbits aus der Projektion lesen
2. relevante Eingaenge klassifizieren
3. Steuerleitungen und Datenleitungen trennen
4. einen isolierten Analyse-Buffer aus `initBuffer()` erzeugen
5. fuer jede Kombination den Buffer explizit setzen
6. genau einen abstrahierten Sequenzschritt rechnen
7. daraus `Q(t)`, `Q(t+1)` und fachliche Outputs lesen

Wichtig:
- die Analyse darf nie direkt von `timingHistory` oder sichtbaren Panelwerten
  abhaengen
- dieselbe Struktur muss immer dieselbe STT erzeugen

### 5. Projektweiten Reduced-STT-Modus standardisieren

Fuer alle groesseren sequenziellen Schaltungen sollte es einen expliziten,
projektweit einheitlichen Reduced-Modus geben.

Gedanke:
- nicht "zu viele Variablen -> irgendetwas reduzieren"
- sondern ein festes, nachvollziehbares Regelwerk:
  - `state`
  - `clock`
  - `reset`
  - `enable`
  - `select`
  - optionale weitere Steuerleitungen
  - Datenleitungen werden fixiert oder gruppiert

Dafuer braucht es ein kleines Klassifikationsmodell:
- `control`
- `data`
- `derived`
- `hidden`

Wirkung:
- die verkleinerte STT wird reproduzierbar
- dieselben Gate-Klassen bekommen dieselbe Reduktionslogik
- das Verhalten ist dokumentierbar und testbar

### 6. Timing und STT muessen dieselbe Projektion teilen, aber unterschiedliche Modi haben

Wichtig ist die Trennung:

- `Timing`
  - zeitlich
  - live
  - eventbasiert
  - darf blinken und Verlaeufe zeigen

- `STT`
  - statisch
  - relationell
  - kombinatorisch/abstrahiert pro Zustand
  - darf gerade **nicht** wie Timing reagieren

Beide sollten dieselben kanonischen Signale kennen, aber unterschiedliche
Berechnungsmodi nutzen.

### 7. Sinnvolle Code-Aufteilung

Naheliegende Richtung fuer neue Dateien:
- `src/core/analysis/sequentialProjection.ts`
- `src/core/analysis/stateTransitionProjection.ts`
- `src/core/analysis/timingChannelProjection.ts`

Bestehende Dateien wuerden dann eher konsumieren als selbst analysieren:
- `src/components/panels/TruthTableModal.tsx`
- `src/components/panels/TimingDiagram.tsx`
- `src/components/panels/truthTableAnalysis.ts`

FSM-spezifische Annotation bleibt nahe an:
- `src/fsm/synthesis/synthesize.ts`

### 8. Schutz vor Seiteneffekten

Damit die neue Logik andere Systeme nicht kaputtmacht, sollte sie diese Regeln
einhalten:

- keine direkte Mutation des echten `circuit`
- keine Mutation von `customState` im Live-Store
- keine Abhaengigkeit von sichtbaren Blink-/Panel-Zustaenden
- keine Race-/Timing-Historie als Quelle fuer STT
- eigene Tests fuer Analysefunktionen ohne UI

Kurz:
- **Analysepfad getrennt vom Live-Simulationspfad**

### 9. Leitplanken fuer die spaetere Umsetzung

Diese Punkte sind absichtlich als Guard Rails festzuhalten, damit die spaetere
Implementierung nicht wieder in lokale Workarounds abrutscht.

- kein gate-spezifisches Wegpatchen einzelner FSM-Exporte
- keine Kopplung der STT an blinkende Live-LEDs oder `timingHistory`
- keine implizite Ableitung fachlicher Signale allein aus sichtbaren
  Ausgangsgattern
- keine Vermischung von Race-, Timing- und STT-Lifecycle in denselben
  Hilfszustand
- Standardansicht immer aus kanonischer Projektion, Debug-/Internals-Sicht nur
  als bewusster Zusatzmodus

Damit bleibt die Loesung:
- projektweit wiederverwendbar
- fuer neue sequenzielle Gate-Klassen erweiterbar
- testbar, ohne andere Simulationslogik seitlich zu destabilisieren

### 10. Empfohlene Umsetzungsreihenfolge

Technisch am risikoaermsten waere:

1. kleines Projektionsmodell und Typen einfuehren
2. FSM-Synthese mit minimalen Rollenmetadaten annotieren
3. read-only `buildSequentialProjection()` bauen
4. STT auf die neue statische Analyse umstellen
5. Reduced-STT-Modus auf dieselbe Analyse aufsetzen
6. Timing-Kanalbildung auf dieselbe Projektion umstellen
7. danach UI- und Focused-Audit-Regressionen erweitern

### 11. Erwartetes Ergebnis

Wenn das sauber umgesetzt ist, gilt projektweit:
- sequenzielle Schaltungen bekommen eine stabile STT
- breite Designs bekommen eine nachvollziehbare verkuerzte STT
- Timing bleibt live, aber geordnet
- FSM-Exporte werden als fachliche Systeme statt als bloeÃŸe Gate-Rohstruktur
  dargestellt
- neue Sequenzial-Gates profitieren automatisch von derselben Projektionslogik,
  statt dass jede Klasse einzeln nachgepflegt werden muss
## Sinnvolle Naechste Validierungsobjekte

Die naechsten Regressionen sollten nicht nur einzelne Views pruefen, sondern
geloest die neuen Projektionsinvarianten absichern:

- sm_projection_batch_consistency
  - alle Gates einer Synthese tragen denselben projectionBatchId
  - zwei getrennte Synthesen bleiben voneinander isoliert
  - gemischte Batches fallen sauber auf die generische STT-Logik zurueck
- sm_projection_canonical_stt
  - isolierte synthetisierte FSMs zeigen nur CLK/RST/fachliche EingÃ¤nge
    / kanonische State-Bits / fachliche Outputs
  - keine Standardanzeige von !Q, LED-Mirrors oder Helper-Nets
- sm_projection_timing_canonical_channels
  - Timing zeigt dieselben kanonischen Kanaele wie die STT-Projektion
  - Reihenfolge und Gruppierung bleiben stabil
  - keine doppelten State-/Mirror-Zeilen in der Standardansicht
- sm_projection_reduced_view
  - breite FSMs mit mehr als acht relevanten Signalen liefern eine determinis-
    tische reduzierte STT
  - Steuerleitungen werden erkennbar, Daten-/Hilfssignale bleiben ausgefiltert
- sm_projection_mixed_fallback
  - eine bewusst gemischte FSM-/Nicht-FSM-Schaltung nutzt weiterhin die
    generische STT und bricht nicht in eine halb-projizierte Sonderansicht
    auseinander
