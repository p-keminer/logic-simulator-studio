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
  freigegeben sind
- es darf kein Fall entstehen, in dem ein eigentlich geblockter Nested-Fall
  scheinbar gespeichert wird, spaeter aber erst beim Export scheitert

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
