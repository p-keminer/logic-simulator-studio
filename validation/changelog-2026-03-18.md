# Changelog — 2026-03-18

## Übersicht

Drei unabhängige Arbeitspakete wurden in dieser Session abgeschlossen:

| # | Paket | Status |
|---|---|---|
| 1 | Track 2: Golden Corpus v1 — Sequential-Erweiterung | abgeschlossen |
| 2 | P2-4: Export-Determinismus (Runner v1.1.0) | abgeschlossen |
| 3 | P2-1: MS_JK_FF Synthesis-Approximations-Warnung | abgeschlossen |

---

## 1. Track 2 — Golden Corpus v1 Sequential-Erweiterung

**Vorher:** 12 Circuits (3 kombinatorisch, 4 sequentiell, 2 tristate, 3 mixed)
**Nachher:** 15 Circuits (+3 sequentiell)

### Neue Circuits

| Slug | Klasse | Gate(s) | Schwerpunkt |
|---|---|---|---|
| `gc_s5_dff_basic` | sequential | `D_FF` | Q und Q̅ als Output-Ports; `output reg` vs. `output wire`; Shadow-Signal-Paar in VHDL |
| `gc_s7_hc161_vs_hc163` | sequential | `74HC161` + `74HC163` | Async Clear (161) vs. Sync Clear (163) nebeneinander; `negedge clrn` im Sensitivity-Check; zwei getrennte `cnt_`-Extra-Regs |
| `gc_s8_hc194_modes` | sequential | `74HC194` | Alle 4 S1/S0-Modi (hold, shift-right, shift-left, parallel load); `STD_LOGIC_VECTOR'(s1 & s0)` VHDL-Cast; `reg_dut` Extra-Reg |

### Geänderte Dateien

```
validation/golden-corpus-v1.json                          +3 Einträge (15 total)
validation/golden-corpus-v1-acceptance.md                 Zähler 12→15, Datum aktualisiert
validation/generated-circuits-golden/gc_s5_dff_basic.lgsc.json    (neu)
validation/generated-circuits-golden/gc_s7_hc161_vs_hc163.lgsc.json (neu)
validation/generated-circuits-golden/gc_s8_hc194_modes.lgsc.json  (neu)
validation/generated-exports-golden/gc_s5_dff_basic.v             (neu)
validation/generated-exports-golden/gc_s5_dff_basic.vhd           (neu)
validation/generated-exports-golden/gc_s7_hc161_vs_hc163.v        (neu)
validation/generated-exports-golden/gc_s7_hc161_vs_hc163.vhd      (neu)
validation/generated-exports-golden/gc_s8_hc194_modes.v           (neu)
validation/generated-exports-golden/gc_s8_hc194_modes.vhd         (neu)
```

---

## 2. P2-4 — Export-Determinismus (Runner v1.1.0)

### Ziel

Sicherstellen, dass jede zukünftige Änderung am HDL-Exporter, die einen Golden-Artifact still verändert, als `fail` gemeldet wird.

### Umsetzung

**`validation/run-golden-corpus-v1.mjs`** auf Version `1.1.0` angehoben.

Zwei neue Checks pro Circuit:

| Check-ID | Was wird geprüft |
|---|---|
| `verilog-reexport-diff` | `generateVerilog(circuit)` live aufgerufen, Ausgabe byte-genau gegen `.v`-Golden verglichen |
| `vhdl-reexport-diff` | `generateVHDL(circuit)` live aufgerufen, Ausgabe byte-genau gegen `.vhd`-Golden verglichen |

**Normalisierung:** Trailing-Newlines werden auf beiden Seiten angeglichen, damit reine Zeilenende-Unterschiede keinen Falschen Alarm auslösen.

**Fallback:** Läuft der Runner ohne `vite-node`, werden die Diff-Checks als `unsupported` klassifiziert statt `fail`.

### Gefundene und behobene Bugs (durch den Diff aufgedeckt)

**TypeID-Fehler in drei Circuit-Dateien:**

Die Golden-Circuit-JSONs verwendeten `IC_74HC74`, `IC_74HC283`, `IC_74HC161` als `typeId`. Das Gate-Registry kennt jedoch nur `74HC74`, `74HC283`, `74HC161` (kein `IC_`-Präfix). Der Exporter hat diese Gates daher lautlos übersprungen und leere Module erzeugt.

Betroffene Dateien:

```
validation/generated-circuits-golden/gc_s3_74hc74.lgsc.json     IC_74HC74  → 74HC74
validation/generated-circuits-golden/gc_m2_283_adder.lgsc.json  IC_74HC283 → 74HC283
validation/generated-circuits-golden/gc_m3_counter_gate.lgsc.json IC_74HC161 → 74HC161
validation/golden-corpus-v1.json  (gates-Arrays der 3 Einträge)
```

**Alle 30 Golden-HDL-Exports neu generiert:**

Nach der TypeID-Korrektur wurden alle `.v`- und `.vhd`-Artefakte aus dem tatsächlichen Exporter regeneriert und als byte-exakte Baseline gespeichert.

### Endergebnis

```
Golden Corpus v1 Runner v1.1.0
14 PASS · 0 FAIL · 1 EXPECTED LIMIT (gc_t2_bus_mux)
```

### Geänderte Dateien

```
validation/run-golden-corpus-v1.mjs                       v1.0.0 → v1.1.0
validation/golden-corpus-v1-acceptance.md                 P2-4-Status dokumentiert
validation/maturity-priority-list.json                    P2-4 status: open → done
validation/generated-circuits-golden/gc_s3_74hc74.lgsc.json      TypeID-Fix
validation/generated-circuits-golden/gc_m2_283_adder.lgsc.json   TypeID-Fix
validation/generated-circuits-golden/gc_m3_counter_gate.lgsc.json TypeID-Fix
validation/golden-corpus-v1.json                          TypeID-Fix in gates-Arrays
validation/generated-exports-golden/*.v   (15 Dateien)    neu generiert
validation/generated-exports-golden/*.vhd (15 Dateien)    neu generiert
```

---

## 3. P2-1 — MS_JK_FF Synthesis-Approximations-Warnung

### Problem

Der HDL-Export für `MS_JK_FF` approximiert das echte Master-Slave-Verhalten als einfaches `negedge`-getriggertes Flip-Flop. Das ist für den Normalbetrieb funktional korrekt, unterscheidet sich aber in einem Punkt:

| Eigenschaft | Simulation (korrekt) | HDL-Export (Annäherung) |
|---|---|---|
| Master-Latch | Level-transparent bei CLK=1 | nicht modelliert |
| Slave-Transfer | bei CLK-Fallflanke | bei CLK-Fallflanke ✓ |
| Pulse-Width-Sensitivität | „ones catching" möglich | nicht vorhanden |

**Warum kein echter Master-Slave in HDL?** Echte Level-sensitive Latches synthetisieren auf modernen Toolchains unzuverlässig (toolabhängige Latch-Inferenz, Verilator/GHDL-Warnungen). Die `negedge`-Annäherung produziert sauberes, portables HDL.

### Umsetzung

Beiden `toVerilog`- und `toVHDL`-Methoden von `MS_JK_FF` wurde ein 6-zeiliger Synthesis-Approximations-Kommentar vorangestellt:

**Verilog:**
```verilog
// MS-JK FF dut -- SYNTHESIS APPROXIMATION
// The simulation model is a true master-slave: master is level-transparent
// while CLK=1; slave transfers on the falling edge. This HDL export
// approximates that behaviour as a single negedge-triggered flip-flop.
// Difference: pulse-width sensitivity ("ones catching") is NOT modelled.
// Do not rely on this export where CLK pulse-width constraints matter.
always @(negedge clk) begin
  ...
```

**VHDL:** äquivalenter `--`-Kommentar vor dem `process`-Block.

### Tests

Alle 845 Tests grün. Keine Logikänderung — ausschließlich Kommentare ergänzt.

### Geänderte Dateien

```
src/gates/sequential/masterSlaveFF.gates.ts   toVerilog + toVHDL: Kommentar ergänzt
validation/maturity-priority-list.json        P2-1 status: open → done
```

---

## Gesamtstatus nach dieser Session

| Metrik | Wert |
|---|---|
| Vitest-Tests | 845/845 PASS |
| Golden Corpus v1 Runner | 14 PASS · 0 FAIL · 1 EXPECTED LIMIT |
| Offene P0-Items | 0 |
| Offene P1-Items | 0 |
| Offene P2-Items | 7 (P2-1 und P2-4 heute geschlossen) |
