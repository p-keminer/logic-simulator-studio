# Golden Corpus v1 Report

Generated: 2026-03-08T01:31:34.686Z
Runner version: 1.0.0
Corpus version: 1.0.0

## Summary

| Metric | Value |
|---|---|
| Total cases | 12 |
| Executed | 12 |
| Passed | 11 |
| Failed | 0 |
| Expected limit | 1 |
| Unsupported | 0 |

**Verdict:** PASS (1 known limit)

## Per-Class Summary

| Class | Pass | Fail | Expected Limit | Unsupported | Total |
|---|---|---|---|---|---|
| combinational | 3 | 0 | 0 | 0 | 3 |
| sequential | 4 | 0 | 0 | 0 | 4 |
| tristate | 1 | 0 | 1 | 0 | 2 |
| mixed | 3 | 0 | 0 | 0 | 3 |

## Per-Case Results

### gc_c1_basic_gates — PASS

- **Class:** combinational
- **Title:** AND + OR + NOT chain
- **Reason:** 19 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_c1_basic_gates.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_c1_basic_gates.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_c1_basic_gates.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_c1_basic_gates, name=gc_c1_basic_gates |
| circuit-gate-types | PASS | All expected gates found: AND, OR, NOT |
| circuit-inputs | PASS | All 3 inputs found |
| circuit-outputs | PASS | Expected 1 output(s), found 1 LED(s) |
| verilog-module-name | PASS | module gc_c1_basic_gates found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 3 input ports declared |
| verilog-output-ports | PASS | All 1 output port(s) declared |
| verilog-checkpoint-ports | PASS | All 4 checkpoint ports found |
| verilog-checkpoint-wires | PASS | All 2 internal wires found |
| verilog-checkpoint-primitives | PASS | All 3 primitives found |
| vhdl-entity-name | PASS | entity gc_c1_basic_gates found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 3 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |

### gc_c2_half_adder — PASS

- **Class:** combinational
- **Title:** Half Adder (XOR + AND fan-out)
- **Reason:** 18 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_c2_half_adder.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_c2_half_adder.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_c2_half_adder.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_c2_half_adder, name=gc_c2_half_adder |
| circuit-gate-types | PASS | All expected gates found: XOR, AND |
| circuit-inputs | PASS | All 2 inputs found |
| circuit-outputs | PASS | Expected 2 output(s), found 2 LED(s) |
| verilog-module-name | PASS | module gc_c2_half_adder found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 2 input ports declared |
| verilog-output-ports | PASS | All 2 output port(s) declared |
| verilog-checkpoint-ports | PASS | All 4 checkpoint ports found |
| verilog-checkpoint-primitives | PASS | All 2 primitives found |
| vhdl-entity-name | PASS | entity gc_c2_half_adder found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 2 input ports declared |
| vhdl-output-ports | PASS | All 2 output port(s) declared |

### gc_c3_sr_latch — PASS

- **Class:** combinational
- **Title:** SR-Latch (cross-coupled NOR)
- **Reason:** 18 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_c3_sr_latch.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_c3_sr_latch.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_c3_sr_latch.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_c3_sr_latch, name=gc_c3_sr_latch |
| circuit-gate-types | PASS | All expected gates found: SR_LATCH |
| circuit-inputs | PASS | All 2 inputs found |
| circuit-outputs | PASS | Expected 2 output(s), found 2 LED(s) |
| verilog-module-name | PASS | module gc_c3_sr_latch found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 2 input ports declared |
| verilog-output-ports | PASS | All 2 output port(s) declared |
| verilog-checkpoint-gate-primitives | PASS | All 2 gate primitives found |
| vhdl-entity-name | PASS | entity gc_c3_sr_latch found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 2 input ports declared |
| vhdl-output-ports | PASS | All 2 output port(s) declared |
| vhdl-checkpoint-shadow | PASS | Shadow signal pattern (_q) found in VHDL |

### gc_s1_dff_assr — PASS

- **Class:** sequential
- **Title:** D-FF with async Set + Reset
- **Reason:** 18 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_s1_dff_assr.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_s1_dff_assr.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_s1_dff_assr.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_s1_dff_assr, name=gc_s1_dff_assr |
| circuit-gate-types | PASS | All expected gates found: D_FF_ASSR |
| circuit-inputs | PASS | All 4 inputs found |
| circuit-outputs | PASS | Expected 1 output(s), found 1 LED(s) |
| verilog-module-name | PASS | module gc_s1_dff_assr found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 4 input ports declared |
| verilog-output-ports | PASS | All 1 output port(s) declared |
| verilog-checkpoint-sensitivity | PASS | Sensitivity list found: posedge clk or posedge r or posedge s |
| verilog-checkpoint-branches | PASS | All 3 branch patterns verified |
| vhdl-entity-name | PASS | entity gc_s1_dff_assr found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 4 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |

### gc_s2_jkff_toggle — PASS

- **Class:** sequential
- **Title:** JK-FF toggle mode (J=K=1 static)
- **Reason:** 18 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_s2_jkff_toggle.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_s2_jkff_toggle.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_s2_jkff_toggle.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_s2_jkff_toggle, name=gc_s2_jkff_toggle |
| circuit-gate-types | PASS | All expected gates found: JK_FF |
| circuit-inputs | PASS | All 3 inputs found |
| circuit-outputs | PASS | Expected 1 output(s), found 1 LED(s) |
| verilog-module-name | PASS | module gc_s2_jkff_toggle found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 3 input ports declared |
| verilog-output-ports | PASS | All 1 output port(s) declared |
| verilog-checkpoint-branches | PASS | All 3 branch patterns verified |
| vhdl-entity-name | PASS | entity gc_s2_jkff_toggle found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 3 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |
| vhdl-checkpoint-branches | PASS | All 3 VHDL branch patterns verified |

### gc_s3_74hc74 — PASS

- **Class:** sequential
- **Title:** 74HC74 Dual D-FF with Preset/Clear
- **Reason:** 17 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_s3_74hc74.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_s3_74hc74.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_s3_74hc74.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_s3_74hc74, name=gc_s3_74hc74 |
| circuit-gate-types | PASS | All expected gates found: IC_74HC74 |
| circuit-inputs | PASS | All 8 inputs found |
| circuit-outputs | PASS | Expected 2 output(s), found 2 LED(s) |
| verilog-module-name | PASS | module gc_s3_74hc74 found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 8 input ports declared |
| verilog-output-ports | PASS | All 2 output port(s) declared |
| verilog-checkpoint-sensitivity | PASS | Sensitivity list found: posedge clk1 or negedge pre1 or negedge clr1 |
| vhdl-entity-name | PASS | entity gc_s3_74hc74 found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 8 input ports declared |
| vhdl-output-ports | PASS | All 2 output port(s) declared |

### gc_s4_reg4_enable — PASS

- **Class:** sequential
- **Title:** REG4 with clock enable
- **Reason:** 17 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_s4_reg4_enable.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_s4_reg4_enable.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_s4_reg4_enable.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_s4_reg4_enable, name=gc_s4_reg4_enable |
| circuit-gate-types | PASS | All expected gates found: REG4 |
| circuit-inputs | PASS | All 7 inputs found |
| circuit-outputs | PASS | Expected 4 output(s), found 4 LED(s) |
| verilog-module-name | PASS | module gc_s4_reg4_enable found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 7 input ports declared |
| verilog-output-ports | PASS | All 4 output port(s) declared |
| verilog-checkpoint-always-pattern | PASS | Always-block pattern found: always @(posedge clk or posedge rst) |
| vhdl-entity-name | PASS | entity gc_s4_reg4_enable found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 7 input ports declared |
| vhdl-output-ports | PASS | All 4 output port(s) declared |

### gc_t1_tribuf_direct — PASS

- **Class:** tristate
- **Title:** Single TRIBUF — OE control
- **Reason:** 18 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_t1_tribuf_direct.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_t1_tribuf_direct.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_t1_tribuf_direct.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_t1_tribuf_direct, name=gc_t1_tribuf_direct |
| circuit-gate-types | PASS | All expected gates found: TRIBUF |
| circuit-inputs | PASS | All 2 inputs found |
| circuit-outputs | PASS | Expected 1 output(s), found 1 LED(s) |
| verilog-module-name | PASS | module gc_t1_tribuf_direct found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 2 input ports declared |
| verilog-output-ports | PASS | All 1 output port(s) declared |
| verilog-checkpoint-pattern | PASS | Checkpoint pattern found: assign w_0 = (~oe) ? a : 1'bz |
| vhdl-entity-name | PASS | entity gc_t1_tribuf_direct found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 2 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |
| vhdl-checkpoint-pattern | PASS | VHDL checkpoint tokens verified |

### gc_t2_bus_mux — EXPECTED LIMIT

- **Class:** tristate
- **Title:** Two-driver wired-OR bus (TRIBUF × 2)
- **Reason:** Documented exporter limitation: multi-driver tri-state bus — buf1 output (w_0) is driven but not exported as output port (last-wire-wins). This is a known, intentional model boundary.

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_t2_bus_mux.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_t2_bus_mux.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_t2_bus_mux.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_t2_bus_mux, name=gc_t2_bus_mux |
| circuit-gate-types | PASS | All expected gates found: TRIBUF, TRIBUF |
| circuit-inputs | PASS | All 4 inputs found |
| circuit-outputs | PASS | Expected 1 output(s), found 1 LED(s) |
| verilog-module-name | PASS | module gc_t2_bus_mux found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 4 input ports declared |
| verilog-output-ports | PASS | All 1 output port(s) declared |
| verilog-checkpoint-pattern | FAIL | Checkpoint pattern NOT found: assign w_0 = (~oe1) ? a1 : 1'bz; assign w_1 = (~oe2) ? a2 :  |
| vhdl-entity-name | PASS | entity gc_t2_bus_mux found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 4 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |
| known-boundary | EXPECTED LIMIT | Documented exporter limitation: multi-driver tri-state bus — buf1 output (w_0) is driven but not exported as output p... |

### gc_m1_dff_chain — PASS

- **Class:** mixed
- **Title:** Two D-FFs in series (pipeline stage)
- **Reason:** 16 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_m1_dff_chain.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_m1_dff_chain.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_m1_dff_chain.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_m1_dff_chain, name=gc_m1_dff_chain |
| circuit-gate-types | PASS | All expected gates found: D_FF, D_FF |
| circuit-inputs | PASS | All 2 inputs found |
| circuit-outputs | PASS | Expected 1 output(s), found 1 LED(s) |
| verilog-module-name | PASS | module gc_m1_dff_chain found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 2 input ports declared |
| verilog-output-ports | PASS | All 1 output port(s) declared |
| vhdl-entity-name | PASS | entity gc_m1_dff_chain found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 2 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |

### gc_m2_283_adder — PASS

- **Class:** mixed
- **Title:** 74HC283 4-bit adder (A=7, B=8 → S=15)
- **Reason:** 19 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_m2_283_adder.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_m2_283_adder.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_m2_283_adder.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_m2_283_adder, name=gc_m2_283_adder |
| circuit-gate-types | PASS | All expected gates found: IC_74HC283 |
| circuit-inputs | PASS | All 9 inputs found |
| circuit-outputs | PASS | Expected 5 output(s), found 5 LED(s) |
| verilog-module-name | PASS | module gc_m2_283_adder found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 9 input ports declared |
| verilog-output-ports | PASS | All 5 output port(s) declared |
| verilog-checkpoint-pattern | PASS | Checkpoint pattern found: wire [4:0] sum_dut = {1'b0,a4,a3,a2,a1} + {1'b0,b4,b3,b2,b1} |
| vhdl-entity-name | PASS | entity gc_m2_283_adder found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 9 input ports declared |
| vhdl-output-ports | PASS | All 5 output port(s) declared |
| vhdl-checkpoint-pattern | PASS | VHDL checkpoint tokens verified |
| vhdl-checkpoint-output-shadows | PASS | Output shadow signals (_q) found in VHDL |

### gc_m3_counter_gate — PASS

- **Class:** mixed
- **Title:** 74HC161 counter + AND gate (detect state 3)
- **Reason:** 18 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_m3_counter_gate.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_m3_counter_gate.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_m3_counter_gate.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_m3_counter_gate, name=gc_m3_counter_gate |
| circuit-gate-types | PASS | All expected gates found: IC_74HC161, AND |
| circuit-inputs | PASS | All 9 inputs found |
| circuit-outputs | PASS | Expected 1 output(s), found 1 LED(s) |
| verilog-module-name | PASS | module gc_m3_counter_gate found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 9 input ports declared |
| verilog-output-ports | PASS | All 1 output port(s) declared |
| verilog-checkpoint-extra-reg | PASS | Extra reg 'cnt_ctr' found |
| vhdl-entity-name | PASS | entity gc_m3_counter_gate found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 9 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |
| vhdl-checkpoint-extra-signal | PASS | Extra signal 'cnt_ctr' found |

## What v1 Checks

- Circuit file existence and JSON parseability
- Verilog export existence and structural sanity (module name, ports, endmodule)
- VHDL export existence and structural sanity (entity name, architecture, ports)
- Slug-to-file 1:1 mapping
- Gate type presence in circuit files
- Input/output port consistency between corpus index and artifacts
- Checkpoint string matching against Verilog/VHDL sources
- Known boundary classification (gc_t2_bus_mux)

## What v1 Does NOT Check (Gaps for v2)

- Functional simulation / truth-table verification of circuits
- Re-export and diff against golden exports (export-determinism)
- External HDL tool compilation (iverilog, ghdl)
- Multi-cycle sequential simulation
- UI replay / visual regression
- CI integration (runner is local-only for now)

## Known Boundaries

- **gc_t2_bus_mux**: Documented exporter limitation: multi-driver tri-state bus — buf1 output (w_0) is driven but not exported as output port (last-wire-wins). This is a known, intentional model boundary.

Cases with expected_limit are *not* counted as pass. They document intentional model boundaries that are verified to still exist.
