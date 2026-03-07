# Gate Gap Analysis & Testability Mapping

**Project:** logic-gate-simulator
**Generated:** 2026-03-07
**Scope:** All registered gates from `src/core/registry/index.ts`

---

## 1. Executive Summary

| Category | Count |
|---|---|
| Total registered gate types | 71 |
| Gates missing both toVerilog + toVHDL | **17** (logic_basic + logic_multi) |
| Gates missing toVerilog only | 0 |
| Gates missing toVHDL only | 0 |
| Gates with tri-state outputs | 6 (TRIBUF, RAM256, ROM256, 74HC373, 74HC374, 74HC595) |
| Gates without `defaultInputValues` on active-low control pins | **8 suspicious** |
| Gates with `stateKeys` defined | 19 |
| Gates with `isSynchronous: true` | 16 |

**Most critical gaps:**
1. All `logic_basic` and `logic_multi` gates (AND, OR, NOT, NAND, NOR, XOR, XNOR, BUFFER, and 3/4-input variants) have **no HDL export** — these are the most commonly used gates in any circuit.
2. Several tri-state gates are missing `defaultInputValues` on their active-low `/OE` pins, leading to unsafe simulator defaults.
3. 74HC161 vs 74HC163 async-vs-synchronous clear distinction must be validated.

---

## 2. HDL Export Gaps

### 2.1 Missing toVerilog + toVHDL (`export-risk`)

These gates are used in almost every circuit but **cannot be exported to HDL**:

| typeId | Category | Description |
|---|---|---|
| AND | logic_basic | 2-input AND |
| OR | logic_basic | 2-input OR |
| NOT | logic_basic | Inverter |
| NAND | logic_basic | 2-input NAND |
| NOR | logic_basic | 2-input NOR |
| XOR | logic_basic | 2-input XOR |
| XNOR | logic_basic | 2-input XNOR |
| BUFFER | logic_basic | Buffer |
| AND3 | logic_multi | 3-input AND |
| AND4 | logic_multi | 4-input AND |
| NAND3 | logic_multi | 3-input NAND |
| NAND4 | logic_multi | 4-input NAND |
| OR3 | logic_multi | 3-input OR |
| OR4 | logic_multi | 4-input OR |
| NOR3 | logic_multi | 3-input NOR |
| NOR4 | logic_multi | 4-input NOR |
| XOR3 | logic_multi | 3-input XOR |

**Impact:** Any design using basic gates cannot be exported. This is the single highest-priority fix.

**Recommended fix:** Add `toVerilog` / `toVHDL` using simple `assign` statements (e.g., `assign out = a & b; // AND`).

### 2.2 IO / Display gates (not-applicable)

These gates are intentionally excluded from HDL export (user interface only):

| typeId | Reason |
|---|---|
| INPUT_SWITCH | Becomes module input port |
| PUSH_BUTTON | Becomes module input port |
| CLOCK | Becomes module input port (clk) |
| OUTPUT_LED | Becomes module output port |
| CONST_HIGH | Replaced by `1'b1` / `'1'` literals |
| CONST_LOW | Replaced by `1'b0` / `'0'` literals |
| SEVEN_SEG | Display only |
| DOT_MATRIX | Display only |
| STEPPER | Display only |
| ADC | Simulation only |
| TEXT_NOTE | Annotation |
| JUNCTION | Internal routing |
| BIN_CTR7S | Has toVerilog/toVHDL but category=output (display integrated) |
| BIN_CTR_99 | Has toVerilog/toVHDL but category=output (display integrated) |

---

## 3. Missing or Unsafe `defaultInputValues` (`core-risk`)

Active-low control pins without `defaultInputValues` default to `0` (active) — which is the **unsafe/dangerous** default.

| typeId | Problem port | Active-level | Effect if unconnected | Verdict |
|---|---|---|---|---|
| TRIBUF | `/OE` | 0 | Output driven (enabled) | **unsafe default** |
| 74HC373 | `/OE` | 0 | All outputs driven | **unsafe default** |
| 74HC374 | `/OE` | 0 | All outputs driven | **unsafe default** |
| 74HC595 | `/OE` | 0 | All outputs driven | **unsafe default** |
| D_FF_ASSR | `s`, `r` | 1 (active-high) | No override (hold) | safe, but undocumented |
| JK_FF_ASSR | `s`, `r` | 1 (active-high) | No override (hold) | safe, but undocumented |
| T_FF_ASSR | `s`, `r` | 1 (active-high) | No override (hold) | safe, but undocumented |
| D_FF_R | `rst` | 1 (active-high) | No reset | safe (hold) |

**Well-handled cases (defaultInputValues present):**
- 74HC74: `/PRE1`, `/CLR1`, `/PRE2`, `/CLR2` → default=1 (inactive) ✓
- 74HC138: `/G2A`, `/G2B` → default=1 (disabled) ✓
- 74HC161, 74HC163: `/CLRN`, `/LDN` → default=1 ✓
- 74HC194: `/CLRN` → default=1 ✓
- 74HC595: `/MR` → default=1 ✓
- RAM256: `/WE`, `/CS`, `/OE` → default=1 (all inactive) ✓
- ROM256: `/CS`, `/OE` → default=1 ✓

---

## 4. Sequential / Timing Risks (`core-risk`, `synthesis-risk`)

### 4.1 Async SR forbidden state handling

| typeId | S=R=1 behavior | Risk |
|---|---|---|
| SR_LATCH | Q=0, Q̄=0 (both low) — deterministic, not a race | `model-limit` |
| D_FF_ASSR | S=R=1 → Q=0 (undefined mapped to reset) | `core-risk` |
| JK_FF_ASSR | S=R=1 → Q=0 | `core-risk` |
| T_FF_ASSR | S=R=1 → Q=0 | `core-risk` |
| SR_FF_EDGE | S=R=1 at CLK↑ → Q=0 | `core-risk` |
| 74HC74 | /PRE=/CLR=0 → Q=1, Q̄=1 (both high) | `core-risk` |

All forbidden states are deterministically resolved but do not simulate the actual hardware race behavior.

### 4.2 Master-Slave FF model simplification

| typeId | MDL behavior | HDL export | Risk |
|---|---|---|---|
| MS_JK_FF | Correct MS simulation (master=transparent CLK=1, slave=falling edge transfer) | `negedge clk` only (simplified) | `synthesis-risk` |

The HDL export for `MS_JK_FF` approximates the master-slave behavior as a simple negedge-triggered FF. A real master-slave JK FF has different behavior with respect to pulse width and hazard sensitivity.

### 4.3 Gates with no `clockInputId` but edge-triggered behavior

| typeId | Issue |
|---|---|
| 74HC74 | Two independent clocks — `clockInputId=null` disables timing risk detection |
| 74HC373 | Level-sensitive latch — no clock, correct |

### 4.4 D_LATCH latch inference

- Verilog: `always @(*)` with blocking assignment `=` — intentional latch inference.
- This causes synthesis tool warnings (correct per spec).
- VHDL: Incomplete `if` (no `else`) infers latch — correct.
- Risk: Users unfamiliar with latch inference may be confused by warnings.

---

## 5. Tri-State / Bus Risks (`core-risk`)

| typeId | Risk |
|---|---|
| TRIBUF | Missing defaultInputValues on /OE (see §3). Hi-Z input on A treated as 0. |
| RAM256 | Transparent write latch (level-sensitive). Verilog: `always @(*)` with latch inference. May cause synthesis warnings or incorrect behavior in some tools. |
| ROM256 | Read is level-sensitive. /OE tri-state. Output Z treated as 8'hzz in Verilog — may not be supported by all synthesis targets. |
| 74HC373 | Missing defaultInputValues on /OE. Unclear if LE and /OE interactions are fully tested. |
| 74HC374 | Missing defaultInputValues on /OE. Internal state update while /OE=1 must be verified. |
| 74HC595 | /OE interaction with dual-clock architecture needs explicit testing. |

**Multi-driver conflict testing required for all tri-state outputs.**

---

## 6. State Visibility Gaps (`ui-risk`, `documentation-gap`)

| typeId | Issue |
|---|---|
| D_FF, JK_FF, T_FF, etc. | `prevClk` stored in customState but not in `stateKeys`. Hidden state. STT cannot force or read clock state. |
| MS_JK_FF | `qM` (master state) not in `stateKeys`. Only `qS` exposed. Internal master state invisible to STT. |
| BIN_CTR7S | `count` key stored alongside `cnt0..cnt3` for shape rendering. Dual-write pattern — risk of inconsistency if one is updated separately. |
| BIN_CTR_99 | Same dual-write pattern as BIN_CTR7S. |
| PISO4 | `stateKeys=['bit0..bit3']` but internal state also has `prevClk`. |
| PIPO4/PIPO8 | `stateKeys=['bit0..bit3'/'b0..b7']` but state uses `bitN`/`bN`, not `qN`. Naming inconsistency. |
| RAM256 | `stateKeys` not set — entire memory is a single large `data` array. STT cannot enumerate RAM states. |
| ROM256 | `stateKeys` not set — same issue as RAM256. |

---

## 7. Category Modeling Gaps (`documentation-gap`)

### 7.1 Missing isSynchronous declaration

| typeId | Issue |
|---|---|
| D_LATCH | `isSynchronous` not set (not `false`, just absent) |
| 74HC373 | `isSynchronous` not set — latch gate |

These gates work correctly in the simulator, but the absence of `isSynchronous: false` may cause unclear behavior in tools that check this flag.

### 7.2 Missing stateKeys

| typeId | Issue |
|---|---|
| RAM256 | No `stateKeys` — large array state |
| ROM256 | No `stateKeys` — large array state |

### 7.3 Missing description / underdocumented

| typeId | Issue |
|---|---|
| SCHMITT | Documented as buffer. Hysteresis not modeled — `model-limit` |
| SPLIT4, SPLIT8 | "Bus Splitter/Merger" — direction is ambiguous (bidirectional use implied) |
| NAND_C, NOR_C | Output naming (`q`, `q_n`) inverted vs AND_C / OR_C — confusing |

---

## 8. Composite / Custom IC Risks (`model-limit`)

| typeId | Risk |
|---|---|
| Custom ICs (category=`custom`) | Not analyzed in this pass — custom ICs are dynamically defined and registered at runtime. Contract verification cannot be applied statically. Future work needed. |

---

## 9. Testability Mapping by Gate Class

### 9.1 Combinational Gates (`logic_basic`, `logic_multi`, `mux`, `arith`, `bus`)

| Pattern | Priority | Gates |
|---|---|---|
| `truth-table-exhaustive` | **Required** | All combinational gates with ≤4 inputs |
| `export-verilog` | High | All gates with `toVerilog` |
| `export-vhdl` | High | All gates with `toVHDL` |
| `ui-state-projection` | Medium | MUX4, DEMUX4, CMP4, ALU4 |

**Note:** AND, OR, NOT, NAND, NOR, XOR, XNOR, BUFFER — truth-table testing is verifiable in simulation, but HDL export tests will fail until `toVerilog`/`toVHDL` are added.

### 9.2 Latches (`SR_LATCH`, `D_LATCH`, `74HC373`)

| Pattern | Priority | Notes |
|---|---|---|
| `sequential-step-sequence` | **Required** | Test all latch input combinations |
| `hold-state` | **Required** | Verify Q unchanged when enable deactivated |
| `forbidden-input-combination` | **Required** | SR_LATCH: S=R=1; 74HC74: /PRE=/CLR=0 |
| `oe-tristate` | **Required** | 74HC373 |
| `export-verilog` / `export-vhdl` | High | Verify latch inference is correct |

### 9.3 Edge-Triggered FFs (`D_FF`, `JK_FF`, `T_FF`, `D_FF_R`, etc.)

| Pattern | Priority | Notes |
|---|---|---|
| `sequential-step-sequence` | **Required** | All input combinations at CLK↑ |
| `clock-edge-detection` | **Required** | CLK=0→0, CLK=0→1, CLK=1→0, CLK=1→1 transitions |
| `hold-state` | **Required** | Q unchanged when no clock edge |
| `reset-to-known-state` | **Required** | Verify initial Q=0 |
| `async-control-override` | **Required** | All gates with async S/R/PRE/CLR |
| `forbidden-input-combination` | Required | Async S=R=1 scenarios |
| `export-verilog` / `export-vhdl` | High | |

### 9.4 Registers (`REG4`, `REG8`, `SHIFT4`, `PISO4`, `PIPO4`, `PIPO8`)

| Pattern | Priority | Notes |
|---|---|---|
| `sequential-step-sequence` | **Required** | Load and hold sequences |
| `reset-to-known-state` | **Required** | Async RST verification |
| `shift-sequence` | **Required** | SHIFT4, PISO4, 74HC194 |
| `load-shift-mode` | **Required** | PISO4, 74HC194 |
| `export-verilog` / `export-vhdl` | High | |

### 9.5 Counters (`BIN_CTR7S`, `BIN_CTR_99`, `74HC161`, `74HC163`)

| Pattern | Priority | Notes |
|---|---|---|
| `sequential-step-sequence` | **Required** | Count through all values |
| `counter-rollover` | **Required** | Verify wrap-around behavior |
| `reset-to-known-state` | **Required** | Async reset (161) vs sync reset (163) |
| `load-shift-mode` | **Required** | 74HC161/163 parallel load |
| `async-control-override` | **Required** | 74HC161 async /CLR |
| `export-verilog` / `export-vhdl` | High | |

**Special:** 74HC161 vs 74HC163 distinction test: apply /CLRN=0 and verify 161 resets immediately, 163 waits for CLK↑.

### 9.6 Memory (`RAM256`, `ROM256`)

| Pattern | Priority | Notes |
|---|---|---|
| `sequential-step-sequence` | **Required** | Write/read cycle |
| `oe-tristate` | **Required** | /OE=1→Hi-Z outputs |
| `multi-driver-conflict` | **Required** | Bus conflict when multiple RAMs connected |
| `export-verilog` / `export-vhdl` | High | Verify latch inference is intentional |

### 9.7 Tri-State Bus `(TRIBUF, 74HC595, 74HC373, 74HC374)`

| Pattern | Priority |
|---|---|
| `oe-tristate` | **Required** |
| `multi-driver-conflict` | **Required** |
| `export-verilog` / `export-vhdl` | High |

---

## 10. Risk Classification Summary

| Risk Class | Count | Description |
|---|---|---|
| `core-risk` | 14 | Logic correctness or simulation accuracy issues |
| `ui-risk` | 3 | STT, state visibility, display-counter dual state |
| `export-risk` | 17 | Missing toVerilog/toVHDL on basic gates |
| `synthesis-risk` | 3 | SR latch loops, MS-JK approximation, latch inference |
| `model-limit` | 5 | Known scope limitations (no metastability, no analog, etc.) |
| `documentation-gap` | 26 | Missing explicit declarations, notes, or contracts |

---

## 11. Priority Recommendations for Next Phase

### P0 — Immediate (blocks HDL export for any real circuit)
1. Add `toVerilog` + `toVHDL` for: AND, OR, NOT, NAND, NOR, XOR, XNOR, BUFFER, AND3, AND4, NAND3, NAND4, OR3, OR4, NOR3, NOR4, XOR3

### P1 — High (correctness, safety)
2. Add `defaultInputValues: { oe: 1 }` to TRIBUF, 74HC373, 74HC374, 74HC595 (unsafe /OE default)
3. Verify 74HC163 clear is truly synchronous (not async copy of 74HC161)
4. Verify 74HC595 /MR resets shift register only, not output latch
5. Verify 74HC374 updates internal state even when /OE=1

### P2 — Medium (verification coverage)
6. Implement `truth-table-exhaustive` test runner for all combinational gates
7. Implement `sequential-step-sequence` test runner for flip-flops
8. Add `forbidden-input-combination` tests for SR, MS-JK, 74HC74

### P3 — Long-term (completeness)
9. Add contracts for remaining combinational gates (AND_C family, CMP1, CMP4, ALU4, etc.)
10. Add contracts for remaining registers (REG4, REG8, SHIFT4, etc.)
11. Add contracts for remaining 74xx ICs (74HC00, 74HC04, 74HC08, etc.)
12. Address custom IC contracts (dynamic verification strategy needed)
