# UI Manual Verification Plan

Datum: 2026-03-21
Repo: `<repo-root>`
Status: **aktuell**
Zweck: manuelle End-to-End-Pruefung der zuletzt verifizierten UI-relevanten
Aenderungen rund um FSM-Editor, FSM-Exportprojektion, STT, Timing-Diagramm und
Race-Panel.

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

1. Zwei getrennte projizierte FSMs auf das Canvas legen.
2. Zunaechst pruefen, dass sie separat waehlbar sind.
3. Danach einen Ausgang der ersten FSM in die zweite einkoppeln.
4. STT und Timing erneut oeffnen.
5. Zusaetzlich einen rohen Zusatzpfad testen, z. B.
   `PUSH_BTN -> AND -> OUTPUT_LED`, der mit einem projizierten Teil mischt.

Erwartung:

- getrennte FSMs bleiben separat auswaehlbar
- direkt verkettete FSMs werden bewusst als gemeinsamer technischer Fallback
  behandelt
- die STT zeigt in solchen Faellen keinen scheinbar gueltigen Kompaktmodus
- der Fallback-Hinweis bleibt fachlich klar, z. B.:
  - mehrere Projektionsbatches erkannt
  - Eingaenge nur teilweise projiziert
  - Zustandsbits nur teilweise projiziert
  - Ausgaenge gemischt oder nur teilweise projiziert

## Abschnitt G - Nachtraeglich veraenderte projizierte FSM

1. Mit einer sauberen projizierten FSM starten, fuer die `FSM kompakt`
   verfuegbar ist.
2. In genau dieses System einen rohen Baustein einhaengen oder den projizierten
   Teil manuell erweitern.
3. Wahrheitstabelle / STT erneut oeffnen.

Erwartung:

- die kompakte FSM-Sicht ist fuer dieses geaenderte System nicht mehr
  verfuegbar
- statt eines schwer lesbaren Teilprojektionszustands erscheint der explizite
  Hinweis, dass die synthetisierte FSM nachtraeglich veraendert oder ergaenzt
  wurde
- die Ansicht bleibt bewusst technisch voll

## Abschnitt H - Breite projizierte FSM: reduzierte Sicht

1. Eine breite FSM aufbauen, bei der `Eingaenge + State-Bits > 8` liegt.
2. Diese FSM synthetisieren.
3. STT oeffnen.

Erwartung:

- die STT bleibt renderbar und fachlich lesbar
- bei breiten projected-Faellen wird eine reduzierte bzw. kontrollierte
  kompakte Sicht verwendet
- kein unklarer Wechsel zwischen sinnvoll reduzierter und chaotischer Vollsicht

## Abschnitt I - Legacy-Download-Fall

1. Diese Datei laden:
   - `validation/fsm-export-fixes/cases/downloads/2026-03-19/FSM_EXPORT_19.03.26.lgsc.json`
2. Timing Diagramm oeffnen.
3. STT oeffnen.
4. Die Simulation einige Sekunden laufen lassen.

Erwartung:

- der Legacy-Fall wird weiter akzeptiert
- Timing bleibt lesbar und kanonisch genug
- die STT bleibt fachlich stabil und springt nicht mit blinkenden Signalschnipseln
- der Altfall muss nicht neu gespeichert oder neu synthetisiert werden, damit
  die Projektion greift

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
2. Race-Panel oeffnen und denselben Vorfall mehrfach ausloesen.
3. Danach die betroffene Ursache loeschen.
4. Danach `Monitor reset` pruefen.

Erwartung:

- identische Race-Funde werden nicht endlos dupliziert
- stale Eintraege verschwinden, wenn die Ursache geloescht wurde
- `Monitor reset` leert Liste und Markierungen
- weiterhin physisch aktive Ursachen duerfen spaeter erneut auftauchen

## Abschnitt M - Custom-IC-Grenzen und Hierarchie-Policy

Vorbereitete Lade-Dateien:

- `validation/manual-fixtures/custom-ic-hierarchy/hier0_half_adder_raw.lgsc.json`
- `validation/manual-fixtures/custom-ic-hierarchy/hier0_half_adder_host.lgsc.json`
- `validation/manual-fixtures/custom-ic-hierarchy/hier0_reg4_raw.lgsc.json`
- `validation/manual-fixtures/custom-ic-hierarchy/hier0_reg4_host.lgsc.json`
- `validation/manual-fixtures/custom-ic-hierarchy/hier0_nested_half_adder_attempt.lgsc.json`

Wichtige feste Namen beim Speichern:

- den Half-Adder exakt als `HIER0_HALF_ADDER` speichern
- den REG4-Wrapper exakt als `HIER0_REG4_WRAP` speichern
- die Host-Dateien referenzieren genau diese beiden Custom-IC-Typen

1. Eine kleine Rohgatter-Schaltung bauen, z. B. einen Half-Adder mit zwei
   `INPUT_SWITCH`, `XOR`, `AND` und zwei `OUTPUT_LED`.
2. Diese ueber `Custom IC` als neues IC mit dem exakten Namen
   `HIER0_HALF_ADDER` speichern, Portnamen bewusst setzen und das IC
   anschliessend aus der Palette wieder auf die Leinwand legen.
3. Das neue IC in einer kleinen Oberbaugruppe verwenden, z. B. mit zwei
   Schaltern an den Eingaengen und zwei LEDs an den Ausgaengen.
4. Das HDL-Modal fuer Verilog und VHDL oeffnen und pruefen, dass oberhalb des
   Exporttexts ein expliziter Hinweis erscheint, dass one-level Custom-ICs
   strukturell aufgeloest werden.
5. Danach die vorbereitete REG4-Datei laden und diese als Custom IC mit dem
   exakten Namen `HIER0_REG4_WRAP` speichern, wieder platzieren und ebenfalls
   in einer Oberbaugruppe exportieren. Im HDL-Modal den Hinweis fuer den
   sequentiellen one-level-Fall ebenfalls pruefen.
6. Anschliessend eine Schaltung oeffnen, die bereits ein Custom IC auf dem
   Canvas enthaelt, und erneut den `Custom IC`-Dialog oeffnen.
7. Bereits vor dem Speichern pruefen, dass im Dialog ein gelber Inline-Hinweis
   zur deaktivierten Nested-Hierarchie sichtbar ist und der Weiter-Button nicht
   den normalen aktiven Zustand hat.
8. Danach trotzdem versuchen, diese Schaltung erneut als neues Custom IC zu
   speichern.
9. Den angezeigten Hinweistext genau pruefen.

Erwartung:

- one-level kombinatorische Custom-ICs bleiben exportierbar
- one-level sequentielle Custom-ICs bleiben exportierbar
- das HDL-Modal benennt fuer one-level-Faelle explizit, dass strukturelles
  Flattening statt roher `CIC_*`-Bloecke verwendet wird
- verschachtelte Custom-ICs werden nicht still oder zufaellig zugelassen
- der Dialog zeigt die Nested-Sperre schon vor dem Speichern sichtbar an und
  versteckt sie nicht nur hinter einem spaeten Alert
- der Dialog blockiert die Erzeugung verschachtelter Custom-ICs mit einem
  expliziten Hinweis, dass aktuell nur one-level Custom-IC-Grenzen kanonisch
  abgesichert sind
- der Blockierhinweis benennt klar, dass verschachtelte Custom-ICs vorerst
  bewusst deaktiviert bleiben
- es darf kein Fall entstehen, in dem eine nested Oberbaugruppe scheinbar
  gespeichert wird, spaeter aber erst beim Export scheitert

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
