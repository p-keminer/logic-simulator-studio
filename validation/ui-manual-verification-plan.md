# UI Manual Verification Plan

Datum: 2026-03-23
Repo: `<repo-root>`
Status: **aktuell**
Zweck: manuelle End-to-End-Pruefung der zuletzt verifizierten UI-relevanten
Aenderungen rund um FSM-Editor, FSM-Exportprojektion, STT, Timing-Diagramm und
Race-Panel sowie den sichtbaren Broker-Dialog.

## Vorbedingungen

- App lokal starten (`npm run dev` oder dein ueblicher Startweg)
- nach groesseren Code-Aenderungen mit hartem Reload arbeiten
- fuer die Legacy-Pruefung steht diese Datei bereit:
  - `validation/fsm-export-fixes/cases/downloads/2026-03-19/FSM_EXPORT_19.03.26.lgsc.json`

## Zielumfang

Dieses Manual deckt vor allem diese heute aktive UI-Semantik ab:

- responsive Toolbar-/Panel-Chrome
- Reachability- und Strukturhinweise im FSM-Editor
- kanonische Timing-/STT-Projektion fuer saubere projizierte FSMs
- bewusste Fallbacks fuer verkettete oder gemischte Sequential-Systeme
- System-Selektor fuer mehrere getrennte Analyse-Subsysteme
- konservatives Copy/Paste synthetisierter FSMs
- explizite Behandlung nachtraeglich veraenderter projizierter FSMs
- Legacy-Bridge fuer aeltere gespeicherte Exporte
- Timing-Persistenz und Rueckscrollen bis zum ersten gehaltenen Takt
- Race-Dedupe, Auto-Prune und manueller Reset
- Broker-Key-/Chat-/Reset-/Delete-Flow ueber den standardmaessig sichtbaren
  API-/Broker-Dialog

## Abschnitt A - Basis und Responsive Chrome

1. App starten.
2. Fensterbreite mehrfach ueber und unter die kompakten Toolbar-Schwellen
   bringen.
3. Auf kleiner Breite pruefen, dass das Toolbar-Overflow-Menue sichtbar bleibt.
4. HDL-Export, Timing, Wahrheitstabelle und Race-Panel auf kleiner Breite
   oeffnen.
5. FSM-Editor oeffnen und auf kleiner Breite das rechte Panel per `Panel`
   ein- und ausblenden.

Erwartung:

- die Haupttoolbar bleibt auf kleiner Breite bedienbar
- das Overflow-Menue schliesst per Aussenklick und per `Escape`
- der FSM-Editor wechselt in einen kompakten Toolbar-Modus
- das rechte FSM-Panel erscheint auf kleiner Breite als schliessbares Overlay
- HDL-Export und Race-Panel bleiben im Viewport bedienbar

## Abschnitt B - FSM-Editor: Reachability und Strukturhinweise

1. Im FSM-Editor eine kleine FSM bauen:
   - `S0` als Startzustand
   - `S1` erreichbar
   - `DEAD` als isolierter zusaetzlicher Zustand ohne erreichbaren Pfad
2. Auf den Canvas selbst schauen.
3. Das rechte FSM-Panel offen lassen.
4. `DEAD` doppelklicken und den State-Editor oeffnen.

Erwartung:

- im Canvas erscheint ein Hinweisbanner fuer unerreichbare Zustaende
- der unerreichbare Zustand ist orange markiert und traegt ein Warn-Badge
- in der Zustandstabelle steht `Synthese: 2/3 Zustaende erreichbar`
- der unerreichbare Zustand ist dort explizit als "wird nicht synthetisiert"
  gekennzeichnet
- im State-Editor erscheint ebenfalls der Hinweis, dass dieser Zustand
  unerreichbar ist und nicht synthetisiert wird

## Abschnitt C - Frisch synthetisierte FSM: kanonische STT und Timing

1. Eine kleine saubere FSM neu auf das Canvas synthetisieren.
2. Timing Diagramm oeffnen.
3. Danach Wahrheitstabelle / STT oeffnen.
4. In der STT zuerst `FSM kompakt`, danach `Technisch voll` pruefen.

Erwartung:

- Timing zeigt im passenden Projektionspfad nur die kanonischen Kanaele:
  `CLK`, `RST`, fachliche Eingaenge, `Qn` und fachliche Outputs
- keine Doppelanzeige von `!Q`, LED-Mirror oder zufaelligen Hilfssignalen
- `FSM kompakt` ist verfuegbar, wenn die Projektion sauber ist
- `Technisch voll` bleibt als Rohsicht erreichbar, falls der Modus angeboten
  wird
- die Tabelle wirkt statisch und nicht wie eine Live-Mitschrift blinkender LEDs

## Abschnitt D - Mehrere getrennte Systeme: System-Selektor

1. Eine saubere synthetisierte FSM auf das Canvas legen.
2. Diese FSM vollstaendig kopieren/einfuegen.
3. Wahrheitstabelle / STT oeffnen.
4. Timing Diagramm im Modus `ausgewählt` oeffnen.
5. Zwischen beiden Systemen umschalten.
6. Danach statt Copy/Paste optional eine zweite FSM separat synthetisieren und
   denselben Check wiederholen.

Erwartung:

- sowohl STT als auch Timing zeigen einen `System`-Selektor, sobald mehrere
  getrennte Analyse-Subsysteme existieren
- die beiden Systeme sind eindeutig getrennt und haben unterschiedliche
  kanonische Signalnamen, z. B. `CLK` und `CLK_1`
- beim Umschalten passen Eingaenge, State-Bits und Outputs jeweils genau zu
  dem gewaehlten System
- im Timing erscheint der `System`-Selektor nur im Modus `ausgewählt`,
  nicht im Modus `vollstaendig`
- STT und Timing zeigen denselben fachlichen Isolationshinweis fuer das
  ausgewaehlte projizierte System, statt zwei verschiedene Erklerungstexte

## Abschnitt E - Copy/Paste und Teilkopie projizierter FSMs

1. Eine einzelne synthetisierte FSM auf dem Canvas markieren und komplett
   kopieren/einfuegen.
2. STT und Timing fuer Original und Kopie pruefen.
3. Danach nur einen Teil derselben FSM markieren und erneut kopieren/einfuegen.
4. Optional eine projizierte FSM mit zusaetzlichen rohen Beobachter- oder
   Zusatzgattern vollstaendig kopieren/einfuegen.

Erwartung:

- eine Vollkopie bekommt eine neue, eindeutige Projektionsgruppe
- die Vollkopie bleibt als eigenes System analysierbar
- eine Teilkopie behaelt **keine** halbgeltige FSM-Kompaktsicht
- rohe Zusatzgatter bleiben roh und werden nicht faelschlich projiziert

## Abschnitt F - Verkettete oder gemischte Sequential-Faelle

Empfohlene Fixture:

- `validation/manual-fixtures/fsm-chained/fsm0_direct_chained_batches_fixture.lgsc.json`
- Kontext / Kurzbeschreibung:
  `validation/manual-fixtures/fsm-chained/README.md`

1. Die Fixture `fsm0_direct_chained_batches_fixture.lgsc.json` laden.
2. STT und Timing oeffnen.
3. Optional denselben Fall haendisch nachbauen, indem zwei getrennte
   projizierte FSMs zuerst separat angelegt und danach direkt verkettet werden.
4. Zusaetzlich einen rohen Zusatzpfad testen, z. B.
   `PUSH_BTN -> AND -> OUTPUT_LED`, der mit einem projizierten Teil mischt.

Erwartung:

- getrennte FSMs bleiben nur **vor** der direkten Verkettung separat auswaehlbar
- direkt verkettete FSMs werden bewusst als gemeinsamer technischer Fallback
  behandelt
- die STT zeigt in solchen Faellen keinen scheinbar gueltigen Kompaktmodus
- Timing und STT erklaeren den Mixed-Fall fachlich gleich als gemischtes
  projiziertes Sequential-Subsystem statt als unterschiedliche Sondertexte
- der Fallback-Hinweis bleibt fachlich klar, z. B.:
  - mehrere Projektionsbatches erkannt
  - Eingaenge nur teilweise projiziert
  - Zustandsbits nur teilweise projiziert
  - Ausgaenge gemischt oder nur teilweise projiziert

## Abschnitt G - Nachtraeglich veraenderte projizierte FSM

Empfohlene Fixture:

- `validation/manual-fixtures/fsm-mixed/fsm0_projected_raw_modified_fixture.lgsc.json`
- Kontext / Kurzbeschreibung:
  `validation/manual-fixtures/fsm-mixed/README.md`

1. Die Fixture `fsm0_projected_raw_modified_fixture.lgsc.json` laden.
2. Wahrheitstabelle / STT oeffnen.
3. Timing fuer dasselbe System oeffnen.
4. Optional denselben Fall noch einmal haendisch nachbauen, indem in eine
   saubere projizierte FSM ein roher sequentialer Zusatzpfad eingekoppelt wird.

Erwartung:

- die kompakte FSM-Sicht ist fuer dieses geaenderte System nicht mehr
  verfuegbar
- statt eines schwer lesbaren Teilprojektionszustands erscheint der explizite
  Hinweis, dass die synthetisierte FSM nachtraeglich veraendert oder ergaenzt
  wurde
- die Ansicht bleibt bewusst technisch voll
- derselbe Modified-Hinweis erscheint jetzt konsistent in STT und Timing fuer
  das aktive Analyse-Subsystem
- solange nur dieses eine gemischte System auf dem Canvas liegt, erscheint
  **kein** `System`-Selektor; das ist korrekt
- sobald zusaetzlich ein weiteres analysierbares System vorhanden ist, bleibt
  das gemischte System unter dem projizierten Fachlabel wie `Y` erkennbar und
  kippt nicht auf ein rohes Zusatzlabel wie `RAW_LED`

## Abschnitt G1 - Getrennte projizierte FSMs mit gemeinsamem Roh-Observer

Empfohlene Fixture:

- `validation/manual-fixtures/fsm-observer/fsm0_observer_split_batches_fixture.lgsc.json`
- Kontext / Kurzbeschreibung:
  `validation/manual-fixtures/fsm-observer/README.md`

1. Die Fixture `fsm0_observer_split_batches_fixture.lgsc.json` laden.
2. Jetzt zuerst STT oeffnen.
3. Danach Timing im Modus `ausgewählt` oeffnen.
4. Optional denselben Fall noch einmal haendisch nachbauen, indem zwei
   getrennte projizierte FSMs nur ueber ein rohes `AND` plus rohe `OUTPUT_LED`
   beobachtet werden.

Erwartung:

- der gemeinsame rohe Observer-Pfad zieht die beiden projizierten FSMs
  **nicht** in einen gemeinsamen Mixed-Fallback
- in STT bleibt ein `System`-Selektor verfuegbar
- die Systeme bleiben fachlich unter `Y` und `Y_1` selektierbar
- Timing zeigt dieselbe getrennte Systemauswahl wie STT
- weder STT noch Timing kippen auf das rohe Beobachterlabel `OBS`
- sobald statt des reinen Observers eine echte Rueckkopplung oder direkte
  Verkettung in den projizierten Kern entsteht, darf der Fall wieder bewusst
  in den `mixed`-/technischen Fallback kippen

## Abschnitt G2 - Mehrere getrennte gemischte Sequential-Inseln

Empfohlene Fixture:

- `validation/manual-fixtures/fsm-islands/fsm0_multiple_mixed_islands_fixture.lgsc.json`
- Kontext / Kurzbeschreibung:
  `validation/manual-fixtures/fsm-islands/README.md`

1. Die Fixture `fsm0_multiple_mixed_islands_fixture.lgsc.json` laden.
2. STT oeffnen.
3. Timing im Modus `ausgewählt` oeffnen.
4. Zwischen den Systemen im Selektor wechseln.

Erwartung:

- obwohl beide Teilnetze gemischt/technisch sind, bleiben sie als zwei
  getrennte Analyse-Systeme selektierbar
- der `System`-Selektor zeigt keine doppelte Mehrdeutigkeit wie zweimal `Y`,
  sondern eindeutige Labels wie `Y` und `Y_1`
- eine Insel bleibt der `modified`-Fall, die andere der dokumentierte
  `mixed`-/verkettete Fall
- STT und Timing zeigen dieselbe Systemliste und dieselbe Einordnung

## Abschnitt G3 - Mehrere gemischte Inseln mit gemeinsamem Roh-Observer

Empfohlene Fixture:

- `validation/manual-fixtures/fsm-islands/fsm0_mixed_islands_shared_observer_fixture.lgsc.json`
- Kontext / Kurzbeschreibung:
  `validation/manual-fixtures/fsm-islands/README.md`

1. Die Fixture `fsm0_mixed_islands_shared_observer_fixture.lgsc.json` laden.
2. STT oeffnen.
3. Timing im Modus `ausgewählt` oeffnen.
4. Zwischen den Systemen im Selektor wechseln.

Erwartung:

- obwohl beide technischen Inseln ueber einen gemeinsamen rohen Observer-Zweig
  verbunden sind, bleiben sie als zwei Systeme selektierbar
- der `System`-Selektor kippt nicht auf ein einziges Beobachterlabel wie
  `OBS`
- die Systeme bleiben eindeutig z. B. als `Y` und `Y_1` beschriftet
- beide Inseln bleiben in diesem Repro `modified_projected_fsm`
- STT und Timing zeigen dieselbe Systemliste und dieselbe Einordnung

## Abschnitt G4 - Mehrere gemischte Inseln mit gemeinsamer roher Feed-forward-Hilfslogik

Empfohlene Fixture:

- `validation/manual-fixtures/fsm-islands/fsm0_shared_helper_islands_fixture.lgsc.json`
- Kontext / Kurzbeschreibung:
  `validation/manual-fixtures/fsm-islands/README.md`

1. Die Fixture `fsm0_shared_helper_islands_fixture.lgsc.json` laden.
2. STT oeffnen.
3. Timing im Modus `ausgewählt` oeffnen.
4. Zwischen den Systemen im Selektor wechseln.

Erwartung:

- obwohl beide technischen Inseln ueber gemeinsame rohe Feed-forward-
  Hilfslogik aus Eingangsquellen zusammenhaengen, bleiben sie als zwei Systeme
  selektierbar
- der `System`-Selektor zeigt zwei eindeutige Labels wie `Y` und `Y_1`
- beide Inseln bleiben in diesem Repro `modified_projected_fsm`
- STT und Timing zeigen dieselbe Systemliste und dieselbe Einordnung

## Abschnitt H - Breite projizierte FSM: reduzierte Sicht

Empfohlene Fixture:

- `validation/manual-fixtures/fsm-wide/fsm0_wide_reduced_fixture.fsm.json`
- Kontext / Kurzbeschreibung:
  `validation/manual-fixtures/fsm-wide/README.md`

1. Die Fixture `fsm0_wide_reduced_fixture.fsm.json` in den FSM-Editor laden.
2. Den neuen Editor-Guardrail-Banner direkt nach dem Laden lesen.
3. STT oeffnen.
4. Den Banner fuer die reduzierte Sicht genau lesen.
5. Danach bewusst `Synthetisieren` ausloesen.
6. Falls die Ansicht einen `Ansicht`-Selektor zeigt, pruefen, ob `Technisch voll`
   fuer diesen breiten projected-Fall bewusst nicht mehr angeboten wird.

Erwartung:

- schon im FSM-Editor erscheint vor der eigentlichen Synthese ein klarer
  Guardrail-Hinweis, dass die breite unverdichtete SOP spaeter bewusst
  blockiert werden wuerde
- die STT bleibt renderbar und fachlich lesbar
- bei breiten projected-Faellen wird eine reduzierte bzw. kontrollierte
  kompakte Sicht verwendet
- der Reduktionshinweis nennt jetzt explizit
  - das repraesentative Zustandsbit
  - weggelassene Steuer-Eingaenge, falls gekappt wurde
  - sichtbare reduzierte Zeilen vs. fachlich relevante Vollzeilen
- die eigentliche Canvas-Synthese wird fuer diesen breiten Roh-SOP-Fall bewusst
  blockiert, bevor eine chaotische Gate-/Leitungswolke erzeugt wird
- die Fehlermeldung erklaert, dass die unverdichtete SOP zu gross waere und
  spaeter eine verdichtete Synthese (z. B. Quine-McCluskey / Bool-Minimierung)
  noetig ist
- kein unklarer Wechsel zwischen sinnvoll reduzierter und chaotischer Vollsicht

## Abschnitt H2 - Fruehe Canvas-Rueckmeldung fuer projizierte FSM-Semantik

1. Die Fixture `validation/manual-fixtures/fsm-mixed/fsm0_projected_raw_modified_fixture.lgsc.json` laden.
2. Direkt auf den Hauptcanvas oberhalb der Zeichenflaeche schauen, ohne STT
   oder Timing zu oeffnen.
3. Danach `validation/manual-fixtures/fsm-chained/fsm0_direct_chained_batches_fixture.lgsc.json` laden.
4. Wieder zuerst nur den Canvas-Hinweis lesen.
5. Danach den Legacy-Fall
   `validation/fsm-export-fixes/cases/downloads/2026-03-19/FSM_EXPORT_19.03.26.lgsc.json`
   laden und erneut zuerst nur den Canvas-Hinweis lesen.
6. Optional zwei getrennte saubere projizierte FSMs auf dem Canvas halten,
   ohne sie direkt zu verketten.

Erwartung:

- der Canvas zeigt den `modified`-Fall bereits vor STT/Timing als fruehen
  Warnhinweis
- der Canvas zeigt den direkt verketteten/gemischten Fall bereits vor
  STT/Timing als fruehen Warnhinweis
- der Canvas zeigt den Legacy-Fall bereits vor STT/Timing als Info-Hinweis
- bei zwei getrennten sauberen projizierten FSMs darf zusaetzlich ein
  frueher Hinweis auf mehrere getrennte projizierte Systeme erscheinen
- diese fruehen Hinweise widersprechen den spaeteren STT-/Timing-Texten nicht,
  sondern greifen dieselbe fachliche Semantik vor
- jeder dieser fruehen Hinweise laesst sich fuer den aktuellen Analysezustand
  direkt per `×` wegklicken

## Abschnitt I - Legacy-Download-Fall

1. Diese Datei laden:
   - `validation/fsm-export-fixes/cases/downloads/2026-03-19/FSM_EXPORT_19.03.26.lgsc.json`
2. Timing Diagramm oeffnen.
3. STT oeffnen.
4. Die Simulation einige Sekunden laufen lassen.
5. Dieselbe geladene Legacy-FSM vollstaendig kopieren/einfuegen.
6. Timing im Modus `ausgewählt` und STT erneut oeffnen.
7. In beiden Panels pruefen, dass jetzt wieder zwei Systeme mit fachlichen
   Legacy-Labels wie `Y` und `Y_1` separat selektierbar sind.
8. Danach in genau einen der Legacy-Pfade eine rohe Zusatzlogik einhaengen,
   z. B. `RST` und `CLK` in ein zusaetzliches `AND` fuehren und dieses Signal
   in den bestehenden Legacy-Logikkegel einkoppeln.
9. STT und Timing fuer genau dieses veraenderte Legacy-System erneut oeffnen.

Erwartung:

- der Legacy-Fall wird weiter akzeptiert
- Timing bleibt lesbar und kanonisch genug
- die STT bleibt fachlich stabil und springt nicht mit blinkenden Signalschnipseln
- STT und Timing markieren den Altfall jetzt gleichermassen als ueber die
  Legacy-Bruecke weiter kanonisch projizierten Fall
- der Altfall muss nicht neu gespeichert oder neu synthetisiert werden, damit
  die Projektion greift
- eine vollstaendig duplizierte geladene Legacy-FSM erscheint wieder als
  eigenes zweites System statt als unscharfer generischer Restfall
- sobald der Legacy-Pfad strukturell veraendert wurde, ist die kompakte
  FSM-Sicht fuer genau dieses System nicht mehr verfuegbar
- STT und Timing behandeln diesen veraenderten Legacy-Fall dann konsistent als
  `modified` und bleiben bewusst technisch

## Abschnitt J - Timing Diagramm: Vollstaendig, Ausgewaehlt und History

1. Eine sequentielle Schaltung mit mehreren sichtbaren Kanaelen offen lassen.
2. Timing Diagramm oeffnen.
3. Zwischen `vollstaendig` und `ausgewählt` wechseln.
4. Im Modus `ausgewählt` eine kleine Signalauswahl setzen.
5. Mehr als 200 Takte laufen lassen.
6. Ganz nach links zurueckscrollen.
7. Danach das Panel schliessen und erneut oeffnen.

Erwartung:

- `vollstaendig` zeigt den ganzen Canvas
- `ausgewählt` zeigt nur das aktive System bzw. die aktive Signalauswahl
- nicht markierte Kanaele tauchen nicht mehr als aktive sichtbare Zeilen auf
- die Auswahl bleibt nach dem erneuten Oeffnen erhalten
- das Diagramm laesst sich wieder bis zum ersten gehaltenen Takt der Store-History
  zurueckscrollen

## Abschnitt K - Timing Diagramm: Sortierung und Zyklusachse

1. Ein Timing-Setup mit sichtbarem Taktkanal offen lassen.
2. Die Sortierbuttons `⇞`, `↑`, `↓`, `⇟` benutzen.
3. Einige Taktzyklen laufen lassen.
4. Auf die kleine Zyklusachse ueber der Wellenform achten.

Erwartung:

- Sortierung funktioniert ueber die echten Buttons
- die Bedienleiste bleibt sichtbar, auch wenn die Wellenform nach rechts laeuft
- die Zyklusachse erscheint ueber sichtbaren Taktkanaelen
- die Reihenfolge bleibt nach Schliessen/Wiederoeffnen erhalten

## Abschnitt L - Race-Panel: Dedupe, Auto-Prune, Reset

1. Einen wiederholbaren Race/Hazard-Fall erzeugen.
   Empfohlene Fixture: `validation/manual-fixtures/race-monitor/race_reconvergent_glitch_repeatable.lgsc.json`
2. Den Schalter `a` einmal umlegen; ein separater Gate-Delay-Umschalter ist aktuell nicht noetig.
3. Sobald oben in der Toolbar `⚠ N` erscheint, das Race-Panel oeffnen und denselben Vorfall durch weiteres Umschalten von `a` mehrfach ausloesen.
4. Danach die betroffene Ursache loeschen.
5. Danach `Monitor reset` pruefen.

Erwartung:

- identische Race-Funde werden nicht endlos dupliziert
- derselbe Incident zeigt stattdessen eine steigende Wiederholungszahl (`×N`)
- `zuerst` / `zuletzt` im Panel bewegen sich sinnvoll mit den Wiederholungen
- stale Eintraege und stale Drahtmarkierungen verschwinden, wenn die Ursache
  geloescht wurde; bei dem empfohlenen reconvergenten Glitch-Fall gilt das
  jetzt auch beim Loeschen eines vorgelagerten NOT-Gatters des delayed-Branches
- `Monitor reset` leert Liste und Markierungen
- weiterhin physisch aktive Ursachen duerfen spaeter erneut auftauchen

## Abschnitt M - Custom-IC-Grenzen und Hierarchie-Policy

Vorbereitete Lade-Dateien:

- `validation/manual-fixtures/custom-ic-hierarchy/hier0_half_adder_raw.lgsc.json`
- `validation/manual-fixtures/custom-ic-hierarchy/hier0_half_adder_host.lgsc.json`
- `validation/manual-fixtures/custom-ic-hierarchy/hier0_reg4_raw.lgsc.json`
- `validation/manual-fixtures/custom-ic-hierarchy/hier0_reg4_host.lgsc.json`
- `validation/manual-fixtures/custom-ic-hierarchy/hier1_nested_half_adder_allowed.lgsc.json`
- `validation/manual-fixtures/custom-ic-hierarchy/hier1_nested_half_adder_host.lgsc.json`
- `validation/manual-fixtures/custom-ic-hierarchy/hier1_nested_reg4_blocked.lgsc.json`

Wichtige feste Namen beim Speichern:

- den Half-Adder exakt als `HIER0_HALF_ADDER` speichern
- den REG4-Wrapper exakt als `HIER0_REG4_WRAP` speichern
- den direkten Nested-Parent exakt als `HIER1_PARENT_HALF_ADDER` speichern
- die Host-Dateien referenzieren genau diese drei Custom-IC-Typen

1. Eine kleine Rohgatter-Schaltung bauen, z. B. einen Half-Adder mit zwei
   `INPUT_SWITCH`, `XOR`, `AND` und zwei `OUTPUT_LED`.
2. Diese ueber `Custom IC` als neues IC mit dem exakten Namen
   `HIER0_HALF_ADDER` speichern, Portnamen bewusst setzen und das IC
   anschliessend aus der Palette wieder auf die Leinwand legen.
3. Danach `hier0_half_adder_host.lgsc.json` laden. Die Datei ist bewusst nur
   ein Canvas-Scaffold ohne eingebettetes `CIC_*`.
4. `CIC_HIER0_HALF_ADDER` aus der Palette auf die Leinwand ziehen und mit den
   beiden Schaltern sowie den beiden LEDs verdrahten.
5. Das HDL-Modal fuer Verilog und VHDL oeffnen und pruefen, dass oberhalb des
   Exporttexts ein expliziter Hinweis erscheint, dass one-level Custom-ICs
   strukturell aufgeloest werden.
6. Danach die vorbereitete REG4-Datei laden und diese als Custom IC mit dem
   exakten Namen `HIER0_REG4_WRAP` speichern, wieder platzieren und ebenfalls
   in einer Oberbaugruppe exportieren.
7. Danach `hier0_reg4_host.lgsc.json` laden, `CIC_HIER0_REG4_WRAP` aus der
   Palette platzieren, vollstaendig verdrahten und im HDL-Modal den Hinweis
   fuer den sequentiellen one-level-Fall ebenfalls pruefen.
8. Danach die vorbereitete Datei
   `hier1_nested_half_adder_allowed.lgsc.json` laden. Sie enthaelt bereits
   genau ein bestehendes Custom IC (`CIC_HIER0_HALF_ADDER`) plus rohe
   Kombinationslogik.
9. Den `Custom IC`-Dialog oeffnen und bereits vor dem Speichern pruefen, dass
   jetzt ein tuerkiser Inline-Hinweis fuer den freigegebenen direkten
   kombinatorischen Nested-Fall erscheint und der Weiter-Button aktiv bleibt.
10. Diese Schaltung exakt als `HIER1_PARENT_HALF_ADDER` speichern.
11. Danach `hier1_nested_half_adder_host.lgsc.json` laden. Auch diese Datei ist
   bewusst nur ein Host-Scaffold ohne eingebettetes Parent-IC.
12. `HIER1_PARENT_HALF_ADDER` aus der Palette platzieren und die sichtbaren
   Ports `a` und `b` mit den beiden Schaltern sowie `sum_or_carry` mit der
   einzelnen LED verdrahten.
13. Das HDL-Modal oeffnen und pruefen, dass jetzt explizit von rekursiver
   struktureller Aufloesung innerhalb der freigegebenen kombinatorischen
   Nested-Grenze gesprochen wird.
14. Im Exporttext selbst pruefen, dass weder `CIC_HIER1_PARENT_HALF_ADDER`
   noch `CIC_HIER0_HALF_ADDER` als rohe Bloecke stehenbleiben und stattdessen
   nur primitive Logik fuer `sum_or_carry` erscheint.
15. Anschliessend `hier1_nested_reg4_blocked.lgsc.json` laden und erneut den
   `Custom IC`-Dialog oeffnen.
16. Bereits vor dem Speichern pruefen, dass der stateful Nested-Fall weiter
   gelb/orange blockiert bleibt und der Weiter-Button nicht aktiv ist.
17. Den angezeigten Hinweistext genau pruefen.
18. Zusaetzlich den erfolgreich aufgebauten `HIER1_PARENT_HALF_ADDER`-Host ganz
    normal ueber die Toolbar speichern.
19. Danach die gespeicherten Custom ICs loeschen oder die App frisch starten und
    sicherstellen, dass `HIER0_HALF_ADDER` und `HIER1_PARENT_HALF_ADDER` nicht
    mehr lokal vorregistriert sind.
20. Die eben gespeicherte Host-Datei wieder laden.
21. Erwartung: Die Schaltung laedt trotzdem ohne "Unbekannter Gattertyp", weil
    die eingebettete Custom-IC-Library vor der Gate-Validierung rehydriert wird.
22. Direkt danach das HDL-Modal erneut oeffnen und bestaetigen, dass der Export
    weiterhin ohne rohe `CIC_*`-Bloecke funktioniert.

Erwartung:

- one-level kombinatorische Custom-ICs bleiben exportierbar
- one-level sequentielle Custom-ICs bleiben exportierbar
- direkte kanonische kombinatorische Nested-Custom-ICs koennen jetzt bewusst
  gespeichert werden
- der Export loest diesen direkten Nested-Kombinationsfall rekursiv strukturell
  auf
- das HDL-Modal benennt fuer one-level-Faelle explizit, dass strukturelles
  Flattening statt roher `CIC_*`-Bloecke verwendet wird
- das HDL-Modal benennt fuer den freigegebenen Nested-Kombinationsfall
  explizit, dass rekursiv strukturell aufgeloest wird
- gespeicherte Host-/Hierarchie-Dateien bleiben auch nach geloeschter lokaler
  Custom-IC-Palette wieder ladbar, solange die benoetigte Library im Dateiinhalt
  eingebettet ist
- stateful Nested-Custom-ICs werden nicht still oder zufaellig zugelassen
- der Dialog zeigt die Teilfreigabe und die verbleibenden Blockfaelle schon vor
  dem Speichern sichtbar an und versteckt sie nicht nur hinter einem spaeten
  Alert
- stateful oder tiefere Nested-Faelle bleiben mit einem expliziten Hinweis
  blockiert, dass aktuell nur kanonische kombinatorische Nested-Kinder

## Abschnitt N - Broker-Dialog: Key, Chat, Reset, Delete

Vorbedingung:

- App normal im Dev-Build starten:
  `npm run dev`
- lokales Sandbox-Backend oder den vorgesehenen Test-Broker starten

1. App mit einer kleinen offenen Schaltung starten.
2. Den Broker-Dialog ueber die Toolbar oeffnen.
3. Einen gueltigen Test-Key eingeben und `Broker-Key setzen` druecken.
4. Den sichtbaren Session-Zustand pruefen.
5. Eine kurze Chat-Nachricht zur offenen Schaltung senden.
6. Danach `Broker-Reset` ausfuehren.
7. Anschliessend `Broker-Key loeschen`.
8. Danach einen Session-Fehler provozieren, z. B. ueber eine stale Session im
   lokalen Broker oder einen Neustart des Backends zwischen gesetztem Key und
   naechster Aktion.
9. Erneut entweder eine Chat-Nachricht senden, `Broker-Reset` ausloesen oder
   `Broker-Key loeschen`.
10. Zusaetzlich einen echten Chat-Sendefehler ohne Session-Invalidierung
    provozieren, z. B. aktive Session behalten, nur den Broker-Prozess
    stoppen, **vor dem Sendeversuch noch nicht neu starten** und dann eine
    Nachricht senden.
11. Danach den Broker wieder starten, den noch angezeigten Broker-Key zuerst
    loeschen, anschliessend einen neuen Broker-Key setzen und die Nachricht
    erneut senden.
12. Im Fehlerzustand zusaetzlich `Lokal leeren` pruefen.
13. Danach bei inaktivem Dialog eine bewusst ungueltige Broker-Base-URL
    eintragen, z. B. `http://127.0.0.1:`
14. `Broker-Key setzen` versuchen.
15. Danach ein unerlaubtes Schema oder eingebettete Zugangsdaten pruefen,
    z. B. `ftp://127.0.0.1:8787` oder
    `http://user:secret@127.0.0.1:8787`
16. Wieder `Broker-Key setzen` versuchen.
17. Danach einen externen Host pruefen, z. B. `https://example.com/v1`
18. Wieder `Broker-Key setzen` versuchen.
19. Danach mit gueltiger lokaler URL einen normalen Verbindungsversuch starten.
20. Waehend `connecting` kurz pruefen, dass Base-URL, Key und Connect nicht
    parallel erneut veraendert oder abgeschickt werden koennen.
    Falls der Zustand lokal zu kurz sichtbar ist, die Sandbox testweise mit
    `DEV_RESPONSE_DELAY_MS=400 npm run dev` starten und den Check wiederholen.
21. Danach mit aktiver Session eine Chat-Nachricht senden und waehrend
    `sending` pruefen, dass `Broker-Reset`, `Broker-Key loeschen`, das
    Chat-Feld und der Reset-Entwurf nicht parallel weiter bedienbar sind.
22. Anschliessend denselben Gegencheck einmal waehrend `Broker-Reset`
    durchfuehren und pruefen, dass `Nachricht senden` sowie
    `Broker-Key loeschen` bis zum Abschluss des Reset-Round-Trips gesperrt
    bleiben.
23. Danach einen `RATE_LIMITED`-Fall provozieren und pruefen, dass im Dialog
    nicht nur `retryAfter`, sondern auch ein route-spezifischer Countdown auf
    der betroffenen Aktion erscheint, z. B. `Warte 9s`, `Sende in 9s` oder
    `Reset in 9s`.
24. Erwartung:
    - waehrend des Countdowns bleibt nur die betroffene Aktion gesperrt
    - andere Recovery-Pfade wie `Broker-Key loeschen` oder `Lokal leeren`
      bleiben weiter verfuegbar
    - der Fehlertitel benennt den betroffenen Pfad jetzt ebenfalls klar als
      Key-, Chat- oder Reset-Limit
    - nach Ablauf des Countdowns verschwindet der zugehoerige
      Rate-Limit-Warnkasten wieder automatisch
    - wenn der Nutzer stattdessen vorher schon URL, Key oder Entwurfsfelder
      aktiv bearbeitet, verschwindet der sichtbare Fehlerkasten ebenfalls
      direkt
    - auch andere Fehler benennen jetzt den betroffenen Pfad klarer, z. B.
      Verbindung, Chat, Reset oder Key-Loeschen
    - Busy-Phasen sprechen sichtbar progressbezogen wie `Verbinde...`,
      `Sende...`, `Reset laeuft...` oder `Loesche...`
25. Danach zusaetzlich im Browser-Netzwerk-Tab pruefen, dass nur Broker-Requests und
    kein direkter Provider-Call aus der App sichtbar sind.

Erwartung:

- nach dem Setzen des Keys erscheinen Session-ID und Gueltig-bis im Dialog
- die Basis-URL bleibt waehrend einer aktiven Session gesperrt
- der Chat laeuft ueber den Broker und setzt eine Conversation-ID
- `Broker-Reset` leert die lokale Chat-History und setzt die Conversation-ID
  zurueck, ohne die Session unnoetig zu verlieren
- `Broker-Key loeschen` leert Session, Conversation und lokale Chat-History
  gemeinsam
- ein provozierter Session-Fehler fuehrt fuer Chat, Reset und Delete in
  denselben konsistenten Leerlaufzustand zurueck statt halb-lebende
  Restzustande zu hinterlassen
- ein Broker-Fehler `Session was not found.` zaehlt dabei explizit als
  Session-Invalidierung und darf den Nutzer nicht in einem blockierten
  Zwischenzustand festhalten; nach dem Fehler muss der Dialog wieder einen
  neuen Key annehmen koennen
- bei einem reinen Chat-Sendefehler ohne Session-Invalidierung bleibt der
  Entwurf fuer einen Retry erhalten, aber die fehlgeschlagene User-Nachricht
  taucht nicht als scheinbar gesendeter Turn im Verlauf auf
- nach dem Wiederstart des Brokers funktioniert der Retry erst nach einem
  neuen Broker-Key wieder normal; die alte Session bleibt bewusst stale
- `Lokal leeren` setzt den sichtbaren Broker-Zustand ohne Broker-Round-Trip
  sofort auf leer und erlaubt danach direkt einen neuen Key-/Session-Start
- eine ungueltige Broker-Base-URL darf beim Tippen den Dialog nicht zerlegen;
  erst beim Verbinden erscheint die klare Meldung
  `Broker-Base-URL ist ungueltig`
- nicht erlaubte Schemata oder eingebettete Zugangsdaten in der Broker-URL
  werden ebenfalls klar abgelehnt
- externe Nicht-Loopback-Hosts werden im aktuellen Scope ebenfalls klar
  abgelehnt; zugelassen sind derzeit nur `localhost`, `127.0.0.1` und `::1`
- waehrend eines laufenden Connect-Versuchs bleiben Base-URL, Key und Connect
  gesperrt, damit der Dialog keine konkurrierenden Verbindungszustaende
  aufbauen kann
- im Netzwerk-Tab taucht kein direkter Provider-Call aus der App auf

## Fehlerprotokoll

Wenn etwas auffaellt, pro Befund notieren:

- geladene Schaltung / Quelle
- Schritte bis zum Fehler
- erwartetes Verhalten
- tatsaechliches Verhalten
- betroffene Ansicht (`FSM-Editor`, `STT`, `Timing`, `Race`)
- Screenshot, falls sichtbar

## Abschlusskriterien

Der UI-Stand gilt in diesem Strang als manuell sauber geprueft, wenn:

- der FSM-Editor Reachability sauber sichtbar macht
- frische FSMs kanonische Timing- und STT-Sichten liefern
- getrennte Systeme in STT und Timing gleich waehlbar bleiben
- Copy/Paste projizierter FSMs konservativ und batch-sicher bleibt
- verkettete oder gemischte Systeme bewusst auf klare Fallbacks gehen
- nachtraeglich veraenderte projizierte FSMs explizit als solche erscheinen
- breite projected-Faelle lesbar bleiben
- der Legacy-Download-Fall weiter funktioniert
- Timing-Auswahl, Sortierung, History und Persistenz stabil bleiben
- Race-Dedupe, Auto-Prune und Reset sauber funktionieren
