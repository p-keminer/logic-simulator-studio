# Current Fix Verification And Maturity Audit

Datum: 2026-03-07
Repo: <repo-root>
Server: <dev-server> und <private-dev-server>
Rohdaten: validation/fix-verification-summary.json, validation/ui-summary-current.json, validation/command-summary.json

## Kurzfazit

Der aktuelle Tri-State-Fix ist nur teilweise bestaetigt.

Bestaetigt:
- `SignalValue` wurde auf `0 | 1 | 2` erweitert und `HI_Z = 2` eingefuehrt in `<repo-root>/src/core/types.ts:5`.
- `TRIBUF`, `74HC595`, `74HC373` und `74HC374` liefern bei deaktiviertem `OE` jetzt im Simulator `HI_Z`.
- Die UI zeigt `Z` in Wahrheitstabelle, Zustandsanalyse, Wire/LED-Port-Farben und Timing-Linien an.
- Direkte Tri-State-Ausgaenge sind jetzt ueber alle Ebenen konsistent: Simulator zeigt `2`, Verilog simuliert `z`, VHDL simuliert `'Z'`.
- Die bestehende Kernsuite `src/__tests__` ist gruen: `662` Tests bestanden.

Nicht bestaetigt bzw. weiterhin problematisch:
- Das Modell ist noch kein echtes `0/1/Z/X`-Signalmodell. `Z` wird vor jedem Downstream-Gate zu `0` sanitisiert.
- Dadurch bleibt ein echter Semantikbruch zwischen internem Simulator und exportiertem HDL bestehen, sobald `Z` durch weitere Logik gelesen wird.
- Mehrtreiber-/Bus-Aufloesung existiert weiterhin nicht.
- `npm test`, `npm run build` und `npm run lint` sind im aktuellen Repo-Stand nicht gruen.

## Bestaetigte Fixes

### 1. Direkte Tri-State-Ausgaenge

Verifiziert an:
- `tri_led_z`
- `hc373_oe_z`
- `hc374_oe_z`

Befund:
- Interner Simulator: `HI_Z = 2` an den Gate-Ausgaengen.
- UI: Wahrheitstabelle bzw. Anzeige zeigt `Z` korrekt an.
- Verilog: `iverilog`, `verilator` und `yosys` akzeptieren den direkten `TRIBUF`-Export.
- VHDL: `ghdl` analysiert und simuliert den direkten `TRIBUF`-Export erfolgreich.

Externer Differenztest:
- `tri_led_z`: Simulator `2`, Verilog `z`, VHDL `'Z'`.
- Das ist fachlich konsistent, solange `Z` nur als Ausgang beobachtet und nicht weiterverarbeitet wird.

### 2. Sequentielle Tri-State-Bausteine

Verifiziert an:
- `74HC373`
- `74HC374`

Befund:
- Interner Simulator liefert bei `OE=1` korrekt `HI_Z`.
- HDL-Modal im UI stimmt mit dem Exporttext ueberein.
- `74HC374` kompiliert in Verilog/VHDL unauffaellig.
- `74HC373` kompiliert ebenfalls, aber `verilator` meldet auf `<repo-root>/validation/generated-exports-current/hc373_oe_z.v:25` einen `LATCH`-Warning. Das ist fuer ein level-sensitives Latch inhaltlich erwartbar und nicht automatisch ein Produktfehler.

### 3. D-Flipflop-UI

Verifiziert an `dff_led`:
- Die Browser-Zustandstabelle enthaelt die korrekte Zeile `D=1, CLK=1, Q(t)=0, Q(t+1)=1, Output=1`.
- Der frueher beobachtete Output-Lag fuer diesen Basisfall ist im aktuellen Stand nicht mehr reproduziert worden.

## Echte Restfehler und Architekturgrenzen

### 1. Downstream-Logik hinter `Z` ist weiter inkonsistent

Schweregrad: hoch

Reproduktion:
- Audit-Schaltung `tri_not_sanitized`
- Aufbau: `INPUT_SWITCH(a) -> TRIBUF -> NOT -> OUTPUT_LED`
- Fall: `a = 1`, `oe = 1`

Ist-Verhalten:
- Interner Simulator: `TRIBUF.y = 2`, danach Sanitization `2 -> 0`, also `NOT.out = 1`
- UI-Wahrheitstabelle zeigt denselben Befund: Zwischenwert `Z`, Endausgang `1`
- Exportiertes Verilog simuliert `Y = x`
- Exportiertes VHDL simuliert `Y = 'X'`

Technische Ursache:
- `<repo-root>/src/core/simulation/tickEngine.ts:199`
- `<repo-root>/src/core/simulation/engine.ts:56`
- `<repo-root>/src/core/simulation/eventScheduler.ts:476`

Diese drei Stellen sanitizen `HI_Z` vor der Gate-Evaluation nach `0`.

Einordnung:
- Das ist kein reiner Tooling-Unterschied, sondern ein echter Semantikbruch zwischen Simulator/UI und HDL-Export.
- Damit ist das Projekt noch nicht konsistent ueber `Simulator -> Tabelle -> Timing -> HDL` hinweg, sobald `Z` weiterverarbeitet wird.

### 2. Kein `X`-Wert im Signalmodell

Schweregrad: hoch

Fundstelle:
- `<repo-root>/src/core/types.ts:5`

Befund:
- Das Signalmodell kennt nur `0 | 1 | 2`.
- Ein echter Konflikt-/Unknown-Wert existiert nicht.

Auswirkung:
- Konflikte koennen intern nicht fachlich korrekt dargestellt werden.
- Das ist die Hauptluecke zum Ziel `0/1/Z/X`.

### 3. Mehrtreiber-/Bus-Aufloesung fehlt weiterhin

Schweregrad: hoch

Reproduktion:
- Audit-Schaltung `multi_driver_same_input`
- Zwei Quellen treiben denselben LED-Eingang.

Befund im Simulator:
- Nur ein Draht ueberlebt in der Ziel-Port-Abbildung.
- Rohdaten: `wiresIntoLedInput = [w1, w2]`, aber `survivingWireInMap = w2`.

Fundstellen:
- `<repo-root>/src/core/simulation/tickEngine.ts:153`
- `<repo-root>/src/core/simulation/engine.ts:23`
- `<repo-root>/src/core/io/verilog.ts:71`
- `<repo-root>/src/core/io/vhdl.ts:73`

Auswirkung:
- Kein echter Bus mit mehreren Treibern.
- Kein echtes Tri-State-Netzmodell.
- Kein formal korrekter Konfliktfall.

Zusatzbefund am Export:
- Die Multi-Driver-Audit-Schaltung erzeugt sogar kaputten HDL-Text mit doppelten Portnamen.
- Verilog und VHDL schlagen dort extern fehl.

### 4. Event-Scheduler loest Konflikte falsch auf

Schweregrad: hoch

Fundstelle:
- `<repo-root>/src/core/simulation/eventScheduler.ts:308`

Befund:
- Bei mehreren unterschiedlichen Treiberwerten wird `finalValue = 0` gesetzt.
- Fachlich waere hier mindestens `X` oder eine definierte Mehrtreiber-Resolution noetig.

### 5. Hierarchie ist nur teilweise vorhanden

Schweregrad: mittel

Fundstelle:
- `<repo-root>/src/components/panels/CustomICModal.tsx:69`

Befund:
- Es gibt benutzerdefinierte ICs und damit eine Form von Hierarchie.
- `registerCustomIC()` definiert aber nur `evaluate()` und `stateUpdate()`, kein `toVerilog()` und kein `toVHDL()`.

Auswirkung:
- Hierarchische Wiederverwendung ist fuer die Simulation vorhanden.
- HDL-Export fuer hierarchische Designs ist nicht first-class abgesichert.

### 6. Breite sequentielle Tabellen bleiben ein UI-Limit

Schweregrad: niedrig bis mittel

Verifiziert an:
- `hc373_oe_z`
- `hc374_oe_z`

Befund:
- Die UI meldet korrekt den Variablen-Limit-Fall.
- Das ist kein Logikbug, aber eine klare Werkzeuggrenze fuer groessere sequenzielle Zustandsraeume.

## Tooling- und Workflow-Befunde

### 1. `npm test` ist im Repo-Root weiter rot

Befund:
- `src/__tests__` ist gruen.
- `npm test` faellt trotzdem, weil drei generierte Artefakt-Dateien unter `.claude/validation/*.test.js` mitlaufen.
- Diese importieren falsch relativ nach `../src/...` statt in die echte Projektstruktur.

Betroffene Dateien:
- `<repo-root>/.claude/validation/logicsim-report.test.js:4`
- `<repo-root>/.claude/validation/logicsim-extra-report.test.js:4`
- `<repo-root>/.claude/validation/logicsim-deep-report.test.js:4`

Einordnung:
- Das ist kein App-Logikfehler, aber ein echter QA-/Repo-Hygiene-Fehler.

### 2. `npm run build` ist nicht gruen

Befund:
- Release-Build faellt trotz gruenem `npx tsc --noEmit`.

Wesentliche Fehlerstellen:
- `<repo-root>/src/components/panels/TimingDiagram.tsx:211` ungenutzter Parameter `snap`
- `<repo-root>/src/__tests__/gates/ic74xx.test.ts:8`
- `<repo-root>/src/__tests__/gates/ic74xx.test.ts:17`
- `<repo-root>/src/__tests__/gates/ic74xx.test.ts:19`
- `<repo-root>/src/__tests__/gates/ic74xx.test.ts:21`
- weitere `noUnusedLocals`-/`noUnusedParameters`-Befunde in Testdateien

Einordnung:
- Kein Laufzeitbug, aber noch kein sauberer Build-Zustand.

### 3. `npm run lint` laeuft in WSL nicht

Befund:
- `node_modules/.bin/eslint` ist nicht executable: `-rw-r--r--`
- dadurch endet `npm run lint` mit `Permission denied`

Einordnung:
- Reiner Tooling-/Environment-Fehler, aber fuer belastbare QA muss das gruen werden.

## Projektfortschritt gegen die Zielkriterien

### Formales Simulationsmodell

Status: teilweise erreicht

Erreicht:
- `0/1/Z` existiert auf Outputs/Wires.
- UI kann `Z` sichtbar machen.

Fehlt:
- kein `X`
- keine Bus-/Mehrtreiber-Resolution
- `Z` wird vor Downstream-Gates nach `0` umgebogen
- Timing-Regeln sind im Code kommentiert, aber nicht als formales Modell dokumentiert

### Konsistenz zwischen allen Ebenen

Status: teilweise erreicht

Erreicht:
- Direkte Tri-State-Ausgaenge sind jetzt konsistent.
- DFF-Basisfall ist in UI/HDL wieder konsistent.

Fehlt:
- `tri_not_sanitized` beweist weiterhin `Simulator/UI != HDL`, sobald `Z` weiterverarbeitet wird.

### Starke Verifikation

Status: solide Basis, aber noch unvollstaendig

Erreicht:
- 662 bestehende Fachtests gruen
- Regressionstests fuer STT und Tri-State vorhanden
- neuer externer HDL-Gegentest ist jetzt praktisch moeglich und wurde hier exemplarisch gefahren

Fehlt:
- keine integrierten Property-Tests
- kein Golden-Corpus im Repo-Workflow
- kein dauerhaft integrierter Differential-Test in `npm test`

### Externe Referenz-Toolchain

Status: erreicht, aber noch nicht integriert

Erreicht:
- `iverilog`, `verilator`, `ghdl`, `yosys` sind nutzbar
- Exporte wurden extern analysiert und fuer direkte Tri-State-Faelle gegengeprueft

Fehlt:
- keine feste Pipeline/CI
- keine automatisierte Semantik-Diff-Suite fuer viele Schaltungen

### Hierarchie und groessere Designs

Status: teilweise erreicht

Erreicht:
- Custom ICs vorhanden

Fehlt:
- kein first-class HDL-Export fuer Custom ICs
- UI-Tabellen skalieren bei breiten sequenziellen Schaltungen nur bis zur Variablen-Grenze

### Formale Qualitaetssicherung

Status: schwach bis mittel

Erreicht:
- Testsuite vorhanden
- neue Audit-Artefakte unter `validation/`

Fehlt:
- kein gruener Default-`npm test`
- kein gruener Default-`npm run build`
- kein gruener Default-`npm run lint`
- keine CI-Workflows im Repo

### Fachliche Tiefe

Status: verbessert, aber noch nicht lehrwerkzeug-robust

Erreicht:
- sequentielle Grundlogik funktioniert stabil
- Tri-State-Ausgaenge werden direkt korrekt sichtbar
- Race-/Glitch-/Loop-Mechanik ist im Scheduler angelegt

Fehlt:
- Konflikte als `X`
- echte Mehrtreiber-/Bus-Semantik
- saubere Trennung zwischen idealisiertem `Z`-Display und echter Netzsemantik

## Priorisierte naechste Schritte

1. `Z/X`-Netzmodell statt reiner Input-Sanitization
   - `SignalValue` auf echtes `0/1/Z/X` erweitern
   - zentrale Net-Resolution fuer mehrere Treiber einfuehren

2. Mehrtreiber-Architektur beheben
   - Single-input-Maps in Simulator und HDL-Generator aufloesen
   - Multi-Driver-Faelle explizit modellieren statt stillschweigend zu ueberschreiben

3. QA gruen machen
   - `.claude/validation/*.test.js` aus dem Default-Testlauf entfernen oder korrekt relocaten
   - `npm run build` reparieren
   - `eslint`-Executable in WSL korrigieren

4. Externen HDL-Diff fest integrieren
   - die jetzt angelegten Validation-Skripte als reproduzierbaren Audit-Lauf behalten
   - weitere repräsentative sequenzielle Schaltungen automatisch gegen `iverilog` und `ghdl` vergleichen

5. Hierarchie exportfaehig machen
   - fuer `CIC_*` entweder HDL-Export implementieren oder die Grenze im UI klar markieren
