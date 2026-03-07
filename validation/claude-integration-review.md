# Claude Integration Review

Datum: 2026-03-07
Repo: `<repo-root>`

## Zweck

Dieses Dokument integriert die Ergebnisse der beiden parallelen Claude-Instanzen
und trennt belastbare Befunde von noch unbestaetigten oder zu scharf
eingestuften Aussagen.

Die beiden grossen Beitraege waren:

- HDL-/Golden-Corpus-/Differenztest-Infrastruktur
- Gate-Inventory / Contract-Schema / Gap-Analyse

Beides ist wertvoll. Ein Teil der Priorisierung muss aber gegen den echten
Codezustand korrigiert werden.

## Belastbar bestaetigt

### 1. Contract- und Inventurarbeit ist strategisch richtig

Die neue Struktur unter `validation/` ist fachlich sinnvoll:

- `gate-contract-schema.json`
- `gate-inventory.json`
- `contracts/*.json`
- `gate-gap-analysis.md`
- `testability-mapping.json`

Damit existiert jetzt zum ersten Mal eine Spezifikationsbasis fuer:

- Gate-Klassifikation
- Testpattern-Ableitung
- Risiko-Klassifikation
- spaetere automatische Testgenerierung

### 2. Die grossen Kernrisiken bleiben unveraendert

Diese Punkte sind weiterhin die fachlich haertesten Blocker:

1. `Z` wird vor Downstream-Gates nach `0` sanitisiert.
2. Das Signalmodell kennt noch kein `X`.
3. Mehrtreiber-/Bus-Aufloesung fehlt weiterhin.

Direkt bestaetigt im Code:

- [tickEngine.ts](<repo-root>/src/core/simulation/tickEngine.ts#L199)
- [engine.ts](<repo-root>/src/core/simulation/engine.ts#L56)
- [eventScheduler.ts](<repo-root>/src/core/simulation/eventScheduler.ts#L476)
- [types.ts](<repo-root>/src/core/types.ts#L5)

### 3. `/OE`-Defaults fuer Tri-State-Bausteine sind ein echter P1-Befund

Das ist kein spekulativer Contract-Befund, sondern ein echter Produkt-/Semantikpunkt.

Direkt bestaetigt:

- [tristate.gate.ts](<repo-root>/src/gates/definitions/tristate.gate.ts)
- [ic74xx.gates.ts](<repo-root>/src/gates/ic74xx/ic74xx.gates.ts#L457)
- [ic74xx.gates.ts](<repo-root>/src/gates/ic74xx/ic74xx.gates.ts#L913)
- [ic74xx.gates.ts](<repo-root>/src/gates/ic74xx/ic74xx.gates.ts#L998)

Befund:

- `TRIBUF`, `74HC373`, `74HC374`, `74HC595` haben keinen `defaultInputValues`-Eintrag fuer `oe`.
- Damit defaultet unverbundenes `/OE` intern effektiv auf `0`, also aktiv.
- Das ist fuer aktive-low Output-Enable fachlich unguenstig und sollte korrigiert werden.

### 4. Verifikation fuer `74HC161` vs `74HC163` und `74HC595` bleibt wichtig

Diese Contract-Befunde sind inhaltlich plausibel und sollten als naechste
gezielte Verifikation behandelt werden:

- `74HC161` async clear vs `74HC163` sync clear
- `74HC595`: `/MR` darf nur das Shift-Register, nicht das Output-Latch betreffen

Das sind gute naechste Differential-Test-Kandidaten.

## Korrekturbedarf an den Claude-Befunden

### 1. Der behauptete P0-Export-Gap fuer Basisgatter ist zu scharf

Die Contract-/Gap-Analyse markiert Basisgatter wie `AND`, `OR`, `NOT`, `NAND`,
`NOR`, `XOR`, `XNOR`, `BUFFER` und Multi-Input-Varianten als "nicht exportierbar",
weil sie keine gate-spezifischen `toVerilog()` / `toVHDL()`-Methoden besitzen.

Das ist in dieser Form **kein bestaetigter Produktblocker**.

Direkt im Code bestaetigt:

- [verilog.ts](<repo-root>/src/core/io/verilog.ts#L230)
- [verilog.ts](<repo-root>/src/core/io/verilog.ts#L305)
- [verilog.ts](<repo-root>/src/core/io/verilog.ts#L311)
- [vhdl.ts](<repo-root>/src/core/io/vhdl.ts#L109)
- [vhdl.ts](<repo-root>/src/core/io/vhdl.ts#L320)

Befund:

- Der zentrale Exporter hat einen Fallback-Pfad fuer Gatter ohne `toVerilog()`.
- In Verilog wird ueber `defaultGateVerilog()` und `PRIM_MAP` auf Primitive abgebildet.
- In VHDL wird ueber `VHDL_PRIM` und den Default-Pfad ebenfalls primitive Logik emittiert.

Damit gilt:

- `fehlendes hasToVerilog/hasToVHDL im Gate-Inventar != nicht exportierbar`
- Dieser Punkt ist derzeit eher ein `documentation-gap` oder `contract-model-gap`
  als ein echter `P0`-Produktfehler.

### 2. Die Inventur ist noch nicht stabil genug fuer harte Kennzahlen

Die von Claude genannten Gate-Zahlen sind nicht konsistent:

- frueherer Bericht: `71`
- spaeterer Bericht: `83`
- aktuelles `gate-inventory.json`: `86`

Das bedeutet:

- die Inventur ist nuetzlich,
- aber die Generator-/Zaehllogik oder Scope-Abgrenzung ist noch nicht stabil genug,
  um daraus harte Projekt-KPIs abzuleiten.

Dieser Punkt ist ein `tooling-gap`, nicht ein Logikfehler.

## Echte Priorisierung nach Integration

### P0: Semantik-Kern

Diese drei Themen blockieren die naechste Professionalisierungsstufe wirklich:

1. `Z -> 0`-Sanitization entfernen
2. `X` in das Signalmodell einfuehren
3. echte Mehrtreiber-/Bus-Aufloesung einfuehren

Ohne diese drei bleibt das Projekt nicht konsistent zwischen:

- Simulator
- UI
- Verilog
- VHDL

### P1: Sicherheits- und Modellierungsdetails

1. `defaultInputValues: { oe: 1 }` fuer:
   - `TRIBUF`
   - `74HC373`
   - `74HC374`
   - `74HC595`
2. gezielte Contract-basierte Regressionen fuer:
   - `74HC161`
   - `74HC163`
   - `74HC194`
   - `74HC595`

### P2: Verifikationsinfrastruktur konsolidieren

1. Golden-Corpus und HDL-Diff-Laeufe an die Contracts anbinden
2. Inventur-/Contract-Generator stabilisieren
3. Gate-Zahlen und Risikoklassen reproduzierbar machen

## Empfohlener naechster Arbeitsschritt

Nicht sofort neue Features.

Stattdessen:

1. HDL-Diff-Infrastruktur von Claude 1 gegen die neun Fokusmuster laufen lassen.
2. Die Contract-Daten aus Claude 2 als Testplan-Quelle verwenden.
3. Danach den eigentlichen Kernumbau `0/1/Z/X + Bus-Resolution` beginnen.

## Konkrete Fokusmuster fuer den naechsten Verifikationslauf

1. `TRIBUF -> NOT`
2. `74HC373` mit `OE`
3. `74HC374` mit `OE`
4. `74HC595` seriell plus `OE`
5. Multi-Driver auf einem Netz
6. `74HC161` ueber mehrere Takte mit Clear
7. `74HC163` ueber mehrere Takte mit Clear
8. `74HC194` mit Shift/Load/Hold
9. `D_FF`, `JK_FF`, `T_FF` mit STT und Timing

Wenn diese neun Muster konsistent gruen sind, ist das Projekt technisch deutlich
naeher an einem "consistent design tool". Erst danach lohnt sich die feinere
Restoptimierung.
