# Golden Corpus v1 Report

Generated: 2026-03-21T16:16:39.124Z
Runner version: 1.9.0
Corpus version: 1.9.0

## Summary

| Metric | Value |
|---|---|
| Total cases | 26 |
| Executed | 26 |
| Passed | 25 |
| Failed | 0 |
| Expected limit | 1 |
| Unsupported | 0 |

**Verdict:** PASS (1 known limit)

## Per-Class Summary

| Class | Pass | Fail | Expected Limit | Unsupported | Total |
|---|---|---|---|---|---|
| combinational | 5 | 0 | 0 | 0 | 5 |
| sequential | 9 | 0 | 0 | 0 | 9 |
| tristate | 2 | 0 | 1 | 0 | 3 |
| mixed | 9 | 0 | 0 | 0 | 9 |

## Per-Case Results

### gc_c1_basic_gates — PASS

- **Class:** combinational
- **Title:** AND + OR + NOT chain
- **Reason:** 27 checks passed

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
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_c1_basic_gates.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_c1_basic_gates.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_c1_basic_gates.v |
| vhdl-entity-name | PASS | entity gc_c1_basic_gates found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 3 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_c1_basic_gates.vhd |
| verilog-external-sim | PASS | 3 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 3 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_c2_half_adder — PASS

- **Class:** combinational
- **Title:** Half Adder (XOR + AND fan-out)
- **Reason:** 26 checks passed

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
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_c2_half_adder.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_c2_half_adder.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_c2_half_adder.v |
| vhdl-entity-name | PASS | entity gc_c2_half_adder found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 2 input ports declared |
| vhdl-output-ports | PASS | All 2 output port(s) declared |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_c2_half_adder.vhd |
| verilog-external-sim | PASS | 3 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 3 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_c3_sr_latch — PASS

- **Class:** combinational
- **Title:** SR-Latch (cross-coupled NOR)
- **Reason:** 26 checks passed

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
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_c3_sr_latch.v |
| verilog-verilator-lint | PASS | Verilator UNOPTFLAT waived for intentional cross-coupled NOR latch. |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_c3_sr_latch.v |
| vhdl-entity-name | PASS | entity gc_c3_sr_latch found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 2 input ports declared |
| vhdl-output-ports | PASS | All 2 output port(s) declared |
| vhdl-checkpoint-shadow | PASS | Shadow signal pattern (_q) found in VHDL |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_c3_sr_latch.vhd |
| verilog-external-sim | PASS | 3 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 3 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_s1_dff_assr — PASS

- **Class:** sequential
- **Title:** D-FF with async Set + Reset
- **Reason:** 26 checks passed

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
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_s1_dff_assr.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_s1_dff_assr.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_s1_dff_assr.v |
| vhdl-entity-name | PASS | entity gc_s1_dff_assr found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 4 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_s1_dff_assr.vhd |
| verilog-external-sim | PASS | 4 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 4 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_s2_jkff_toggle — PASS

- **Class:** sequential
- **Title:** JK-FF toggle mode (J=K=1 static)
- **Reason:** 26 checks passed

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
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_s2_jkff_toggle.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_s2_jkff_toggle.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_s2_jkff_toggle.v |
| vhdl-entity-name | PASS | entity gc_s2_jkff_toggle found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 3 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |
| vhdl-checkpoint-branches | PASS | All 3 VHDL branch patterns verified |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_s2_jkff_toggle.vhd |
| verilog-external-sim | PASS | 3 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 3 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_s3_74hc74 — PASS

- **Class:** sequential
- **Title:** 74HC74 Dual D-FF with Preset/Clear
- **Reason:** 25 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_s3_74hc74.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_s3_74hc74.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_s3_74hc74.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_s3_74hc74, name=gc_s3_74hc74 |
| circuit-gate-types | PASS | All expected gates found: 74HC74 |
| circuit-inputs | PASS | All 8 inputs found |
| circuit-outputs | PASS | Expected 2 output(s), found 2 LED(s) |
| verilog-module-name | PASS | module gc_s3_74hc74 found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 8 input ports declared |
| verilog-output-ports | PASS | All 2 output port(s) declared |
| verilog-checkpoint-sensitivity | PASS | Sensitivity list found: posedge clk1 or negedge pre1 or negedge clr1 |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_s3_74hc74.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_s3_74hc74.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_s3_74hc74.v |
| vhdl-entity-name | PASS | entity gc_s3_74hc74 found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 8 input ports declared |
| vhdl-output-ports | PASS | All 2 output port(s) declared |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_s3_74hc74.vhd |
| verilog-external-sim | PASS | 5 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 5 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_s4_reg4_enable — PASS

- **Class:** sequential
- **Title:** REG4 with clock enable
- **Reason:** 25 checks passed

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
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_s4_reg4_enable.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_s4_reg4_enable.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_s4_reg4_enable.v |
| vhdl-entity-name | PASS | entity gc_s4_reg4_enable found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 7 input ports declared |
| vhdl-output-ports | PASS | All 4 output port(s) declared |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_s4_reg4_enable.vhd |
| verilog-external-sim | PASS | 4 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 4 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_t1_tribuf_direct — PASS

- **Class:** tristate
- **Title:** Single TRIBUF — OE control
- **Reason:** 26 checks passed

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
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_t1_tribuf_direct.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_t1_tribuf_direct.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_t1_tribuf_direct.v |
| vhdl-entity-name | PASS | entity gc_t1_tribuf_direct found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 2 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |
| vhdl-checkpoint-pattern | PASS | VHDL checkpoint tokens verified |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_t1_tribuf_direct.vhd |
| verilog-external-sim | PASS | 3 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 3 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_t2_bus_mux — EXPECTED LIMIT

- **Class:** tristate
- **Title:** Two-driver wired-OR bus (TRIBUF × 2)
- **Reason:** Skipped external HDL simulation for documented multi-driver boundary.

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
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_t2_bus_mux.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_t2_bus_mux.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_t2_bus_mux.v |
| vhdl-entity-name | PASS | entity gc_t2_bus_mux found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 4 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_t2_bus_mux.vhd |
| external-hdl-sim-scenario | EXPECTED LIMIT | Skipped external HDL simulation for documented multi-driver boundary. |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |
| known-boundary | EXPECTED LIMIT | Documented exporter limitation: multi-driver tri-state bus — buf1 output (w_0) is driven but not exported as output p... |

### gc_m1_dff_chain — PASS

- **Class:** mixed
- **Title:** Two D-FFs in series (pipeline stage)
- **Reason:** 24 checks passed

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
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_m1_dff_chain.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_m1_dff_chain.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_m1_dff_chain.v |
| vhdl-entity-name | PASS | entity gc_m1_dff_chain found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 2 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_m1_dff_chain.vhd |
| verilog-external-sim | PASS | 6 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 6 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_m2_283_adder — PASS

- **Class:** mixed
- **Title:** 74HC283 4-bit adder (A=7, B=8 → S=15)
- **Reason:** 27 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_m2_283_adder.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_m2_283_adder.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_m2_283_adder.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_m2_283_adder, name=gc_m2_283_adder |
| circuit-gate-types | PASS | All expected gates found: 74HC283 |
| circuit-inputs | PASS | All 9 inputs found |
| circuit-outputs | PASS | Expected 5 output(s), found 5 LED(s) |
| verilog-module-name | PASS | module gc_m2_283_adder found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 9 input ports declared |
| verilog-output-ports | PASS | All 5 output port(s) declared |
| verilog-checkpoint-pattern | PASS | Checkpoint pattern found: wire [4:0] sum_dut = {1'b0,a4,a3,a2,a1} + {1'b0,b4,b3,b2,b1} |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_m2_283_adder.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_m2_283_adder.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_m2_283_adder.v |
| vhdl-entity-name | PASS | entity gc_m2_283_adder found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 9 input ports declared |
| vhdl-output-ports | PASS | All 5 output port(s) declared |
| vhdl-checkpoint-pattern | PASS | VHDL checkpoint tokens verified |
| vhdl-checkpoint-output-shadows | PASS | Output shadow signals (_q) found in VHDL |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_m2_283_adder.vhd |
| verilog-external-sim | PASS | 2 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 2 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_m3_counter_gate — PASS

- **Class:** mixed
- **Title:** 74HC161 counter + AND gate (detect state 3)
- **Reason:** 26 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_m3_counter_gate.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_m3_counter_gate.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_m3_counter_gate.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_m3_counter_gate, name=gc_m3_counter_gate |
| circuit-gate-types | PASS | All expected gates found: 74HC161, AND |
| circuit-inputs | PASS | All 9 inputs found |
| circuit-outputs | PASS | Expected 1 output(s), found 1 LED(s) |
| verilog-module-name | PASS | module gc_m3_counter_gate found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 9 input ports declared |
| verilog-output-ports | PASS | All 1 output port(s) declared |
| verilog-checkpoint-extra-reg | PASS | Extra reg 'cnt_ctr' found |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_m3_counter_gate.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_m3_counter_gate.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_m3_counter_gate.v |
| vhdl-entity-name | PASS | entity gc_m3_counter_gate found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 9 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |
| vhdl-checkpoint-extra-signal | PASS | Extra signal 'cnt_ctr' found |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_m3_counter_gate.vhd |
| verilog-external-sim | PASS | 5 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 5 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_s5_dff_basic — PASS

- **Class:** sequential
- **Title:** D-FF basic clocking (both Q and Qn outputs)
- **Reason:** 25 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_s5_dff_basic.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_s5_dff_basic.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_s5_dff_basic.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_s5_dff_basic, name=gc_s5_dff_basic |
| circuit-gate-types | PASS | All expected gates found: D_FF |
| circuit-inputs | PASS | All 2 inputs found |
| circuit-outputs | PASS | Expected 2 output(s), found 2 LED(s) |
| verilog-module-name | PASS | module gc_s5_dff_basic found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 2 input ports declared |
| verilog-output-ports | PASS | All 2 output port(s) declared |
| verilog-checkpoint-ports | PASS | All 4 checkpoint ports found |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_s5_dff_basic.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_s5_dff_basic.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_s5_dff_basic.v |
| vhdl-entity-name | PASS | entity gc_s5_dff_basic found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 2 input ports declared |
| vhdl-output-ports | PASS | All 2 output port(s) declared |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_s5_dff_basic.vhd |
| verilog-external-sim | PASS | 3 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 3 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_s7_hc161_vs_hc163 — PASS

- **Class:** sequential
- **Title:** 74HC161 (async clear) vs 74HC163 (sync clear) side-by-side
- **Reason:** 25 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_s7_hc161_vs_hc163.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_s7_hc161_vs_hc163.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_s7_hc161_vs_hc163.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_s7_hc161_vs_hc163, name=gc_s7_hc161_vs_hc163 |
| circuit-gate-types | PASS | All expected gates found: 74HC161, 74HC163 |
| circuit-inputs | PASS | All 9 inputs found |
| circuit-outputs | PASS | Expected 8 output(s), found 8 LED(s) |
| verilog-module-name | PASS | module gc_s7_hc161_vs_hc163 found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 9 input ports declared |
| verilog-output-ports | PASS | All 8 output port(s) declared |
| verilog-checkpoint-wires | PASS | All 2 internal wires found |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_s7_hc161_vs_hc163.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_s7_hc161_vs_hc163.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_s7_hc161_vs_hc163.v |
| vhdl-entity-name | PASS | entity gc_s7_hc161_vs_hc163 found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 9 input ports declared |
| vhdl-output-ports | PASS | All 8 output port(s) declared |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_s7_hc161_vs_hc163.vhd |
| verilog-external-sim | PASS | 3 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 3 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_s8_hc194_modes — PASS

- **Class:** sequential
- **Title:** 74HC194 universal shift register — all 4 S1/S0 modes
- **Reason:** 24 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_s8_hc194_modes.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_s8_hc194_modes.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_s8_hc194_modes.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_s8_hc194_modes, name=gc_s8_hc194_modes |
| circuit-gate-types | PASS | All expected gates found: 74HC194 |
| circuit-inputs | PASS | All 10 inputs found |
| circuit-outputs | PASS | Expected 4 output(s), found 4 LED(s) |
| verilog-module-name | PASS | module gc_s8_hc194_modes found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 10 input ports declared |
| verilog-output-ports | PASS | All 4 output port(s) declared |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_s8_hc194_modes.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_s8_hc194_modes.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_s8_hc194_modes.v |
| vhdl-entity-name | PASS | entity gc_s8_hc194_modes found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 10 input ports declared |
| vhdl-output-ports | PASS | All 4 output port(s) declared |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_s8_hc194_modes.vhd |
| verilog-external-sim | PASS | 6 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 6 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_v2_1_mux_fabric — PASS

- **Class:** combinational
- **Title:** 16-input selector fabric (dual 74HC151 banks + 74HC153 merge)
- **Reason:** 27 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_v2_1_mux_fabric.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_v2_1_mux_fabric.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_v2_1_mux_fabric.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_v2_1_mux_fabric, name=gc_v2_1_mux_fabric |
| circuit-gate-types | PASS | All expected gates found: 74HC151, 74HC151, 74HC153 |
| circuit-inputs | PASS | All 21 inputs found |
| circuit-outputs | PASS | Expected 2 output(s), found 2 LED(s) |
| verilog-module-name | PASS | module gc_v2_1_mux_fabric found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 21 input ports declared |
| verilog-output-ports | PASS | All 2 output port(s) declared |
| verilog-checkpoint-ports | PASS | All 23 checkpoint ports found |
| verilog-checkpoint-wires | PASS | All 4 internal wires found |
| verilog-checkpoint-pattern | PASS | Checkpoint pattern found: assign w_8 = w_2 ? 1'b0 : ({m1,m0}==2'd0 ? w_4 : |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_v2_1_mux_fabric.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_v2_1_mux_fabric.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_v2_1_mux_fabric.v |
| vhdl-entity-name | PASS | entity gc_v2_1_mux_fabric found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 21 input ports declared |
| vhdl-output-ports | PASS | All 2 output port(s) declared |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_v2_1_mux_fabric.vhd |
| verilog-external-sim | PASS | 3 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 3 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_v2_2_datapath_slice — PASS

- **Class:** mixed
- **Title:** ALU4 accumulator with phase counter
- **Reason:** 28 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_v2_2_datapath_slice.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_v2_2_datapath_slice.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_v2_2_datapath_slice.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_v2_2_datapath_slice, name=gc_v2_2_datapath_slice |
| circuit-gate-types | PASS | All expected gates found: ALU4, REG4, BIN_CTR7S |
| circuit-inputs | PASS | All 8 inputs found |
| circuit-outputs | PASS | Expected 9 output(s), found 9 LED(s) |
| verilog-module-name | PASS | module gc_v2_2_datapath_slice found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 8 input ports declared |
| verilog-output-ports | PASS | All 9 output port(s) declared |
| verilog-checkpoint-ports | PASS | All 17 checkpoint ports found |
| verilog-checkpoint-wires | PASS | All 5 internal wires found |
| verilog-checkpoint-pattern | PASS | Checkpoint pattern found: case ({w_6, w_5, w_4}) |
| verilog-checkpoint-always-pattern | PASS | Always-block pattern found: always @(posedge clk or posedge rst) |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_v2_2_datapath_slice.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_v2_2_datapath_slice.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_v2_2_datapath_slice.v |
| vhdl-entity-name | PASS | entity gc_v2_2_datapath_slice found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 8 input ports declared |
| vhdl-output-ports | PASS | All 9 output port(s) declared |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_v2_2_datapath_slice.vhd |
| verilog-external-sim | PASS | 6 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 6 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_v2_3_shift_pipeline — PASS

- **Class:** mixed
- **Title:** 74HC194 -> 74HC595 shift/latch pipeline
- **Reason:** 30 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_v2_3_shift_pipeline.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_v2_3_shift_pipeline.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_v2_3_shift_pipeline.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_v2_3_shift_pipeline, name=gc_v2_3_shift_pipeline |
| circuit-gate-types | PASS | All expected gates found: 74HC194, 74HC595 |
| circuit-inputs | PASS | All 13 inputs found |
| circuit-outputs | PASS | Expected 12 output(s), found 12 LED(s) |
| verilog-module-name | PASS | module gc_v2_3_shift_pipeline found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 13 input ports declared |
| verilog-output-ports | PASS | All 12 output port(s) declared |
| verilog-checkpoint-ports | PASS | All 8 checkpoint ports found |
| verilog-checkpoint-pattern | PASS | Checkpoint pattern found: assign w_4 = oe ? 1'bz : latch_dut_595[0] |
| verilog-checkpoint-always-pattern | PASS | Always-block pattern found: always @(posedge clk or negedge clrn) |
| verilog-checkpoint-extra-reg | PASS | Extra reg 'shift_dut_595' found |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_v2_3_shift_pipeline.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_v2_3_shift_pipeline.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_v2_3_shift_pipeline.v |
| vhdl-entity-name | PASS | entity gc_v2_3_shift_pipeline found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 13 input ports declared |
| vhdl-output-ports | PASS | All 12 output port(s) declared |
| vhdl-checkpoint-pattern | PASS | VHDL checkpoint tokens verified |
| vhdl-checkpoint-extra-signal | PASS | Extra signal 'shift_dut_595' found |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_v2_3_shift_pipeline.vhd |
| verilog-external-sim | PASS | 14 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 14 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_v2_4_ram_readback — PASS

- **Class:** mixed
- **Title:** RAM256 readback path with REG8 capture
- **Reason:** 29 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_v2_4_ram_readback.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_v2_4_ram_readback.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_v2_4_ram_readback.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_v2_4_ram_readback, name=gc_v2_4_ram_readback |
| circuit-gate-types | PASS | All expected gates found: RAM256, REG8 |
| circuit-inputs | PASS | All 21 inputs found |
| circuit-outputs | PASS | Expected 9 output(s), found 9 LED(s) |
| verilog-module-name | PASS | module gc_v2_4_ram_readback found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 21 input ports declared |
| verilog-output-ports | PASS | All 9 output port(s) declared |
| verilog-checkpoint-ports | PASS | All 12 checkpoint ports found |
| verilog-checkpoint-wires | PASS | All 8 internal wires found |
| verilog-checkpoint-pattern | PASS | Checkpoint pattern found: ram_ram[{a7, a6, a5, a4, a3, a2, a1, a0}] = {di7, di6, di5,  |
| verilog-checkpoint-always-pattern | PASS | Always-block pattern found: always @(posedge clk or posedge rst) |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_v2_4_ram_readback.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_v2_4_ram_readback.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_v2_4_ram_readback.v |
| vhdl-entity-name | PASS | entity gc_v2_4_ram_readback found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 21 input ports declared |
| vhdl-output-ports | PASS | All 9 output port(s) declared |
| vhdl-checkpoint-pattern | PASS | VHDL checkpoint tokens verified |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_v2_4_ram_readback.vhd |
| verilog-external-sim | PASS | 8 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 8 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_v2_5_decode_tree — PASS

- **Class:** mixed
- **Title:** 74HC138 decode tree with 74HC373 hold tap and 74HC374 capture
- **Reason:** 31 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_v2_5_decode_tree.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_v2_5_decode_tree.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_v2_5_decode_tree.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_v2_5_decode_tree, name=gc_v2_5_decode_tree |
| circuit-gate-types | PASS | All expected gates found: 74HC138, 74HC148, 74HC373, 74HC374 |
| circuit-inputs | PASS | All 11 inputs found |
| circuit-outputs | PASS | Expected 13 output(s), found 13 LED(s) |
| verilog-module-name | PASS | module gc_v2_5_decode_tree found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 11 input ports declared |
| verilog-output-ports | PASS | All 13 output port(s) declared |
| verilog-checkpoint-ports | PASS | All 8 checkpoint ports found |
| verilog-checkpoint-wires | PASS | All 6 internal wires found |
| verilog-checkpoint-pattern | PASS | Checkpoint pattern found: assign w_9 = oe373 ? 1'bz : latch_lat373[0] |
| verilog-checkpoint-always-pattern | PASS | Always-block pattern found: always @(posedge clk374) |
| verilog-checkpoint-extra-reg | PASS | Extra reg 'reg_reg374' found |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_v2_5_decode_tree.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_v2_5_decode_tree.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_v2_5_decode_tree.v |
| vhdl-entity-name | PASS | entity gc_v2_5_decode_tree found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 11 input ports declared |
| vhdl-output-ports | PASS | All 13 output port(s) declared |
| vhdl-checkpoint-pattern | PASS | VHDL checkpoint tokens verified |
| vhdl-checkpoint-extra-signal | PASS | Extra signal 'reg_reg374' found |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_v2_5_decode_tree.vhd |
| verilog-external-sim | PASS | 12 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 12 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_v2_6_custom_halfadder — PASS

- **Class:** combinational
- **Title:** Custom half-adder hierarchy with raw full-adder oracle
- **Reason:** 30 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_v2_6_custom_halfadder.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_v2_6_custom_halfadder.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_v2_6_custom_halfadder.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_v2_6_custom_halfadder, name=gc_v2_6_custom_halfadder |
| circuit-gate-types | PASS | All expected gates found: CIC_HALF_ADDER, CIC_HALF_ADDER, OR, XOR, XOR, AND, AND, OR, XOR, XOR |
| circuit-inputs | PASS | All 3 inputs found |
| circuit-outputs | PASS | Expected 6 output(s), found 6 LED(s) |
| verilog-module-name | PASS | module gc_v2_6_custom_halfadder found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 3 input ports declared |
| verilog-output-ports | PASS | All 6 output port(s) declared |
| verilog-checkpoint-ports | PASS | All 5 checkpoint ports found |
| verilog-checkpoint-wires | PASS | All 6 internal wires found |
| verilog-checkpoint-pattern | PASS | Checkpoint pattern found: xor g_xor_sum_diff(w_10, w_6, w_7) |
| verilog-checkpoint-always-pattern | PASS | Always-block pattern found: xor g_ha0_flat_xor1(w_0, a, b) |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_v2_6_custom_halfadder.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_v2_6_custom_halfadder.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_v2_6_custom_halfadder.v |
| vhdl-entity-name | PASS | entity gc_v2_6_custom_halfadder found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 3 input ports declared |
| vhdl-output-ports | PASS | All 6 output port(s) declared |
| vhdl-checkpoint-pattern | PASS | VHDL checkpoint tokens verified |
| vhdl-checkpoint-output-shadows | PASS | Output shadow signals (_q) found in VHDL |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_v2_6_custom_halfadder.vhd |
| verilog-external-sim | PASS | 8 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 8 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_v2_7_bus_conflict_system — PASS

- **Class:** mixed
- **Title:** Dual 74HC374 shared-bus conflict monitor
- **Reason:** 29 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_v2_7_bus_conflict_system.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_v2_7_bus_conflict_system.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_v2_7_bus_conflict_system.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_v2_7_bus_conflict_system, name=gc_v2_7_bus_conflict_system |
| circuit-gate-types | PASS | All expected gates found: 74HC374, 74HC374, REG4, REG4, NOT, NOT, AND, AND, XOR |
| circuit-inputs | PASS | All 8 inputs found |
| circuit-outputs | PASS | Expected 7 output(s), found 7 LED(s) |
| verilog-module-name | PASS | module gc_v2_7_bus_conflict_system found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 8 input ports declared |
| verilog-output-ports | PASS | All 7 output port(s) declared |
| verilog-checkpoint-ports | PASS | All 15 checkpoint ports found |
| verilog-checkpoint-wires | PASS | All 6 internal wires found |
| verilog-checkpoint-pattern | PASS | Checkpoint pattern found: and g_conflict0_gate(w_12, w_11, w_10) |
| verilog-checkpoint-always-pattern | PASS | Always-block pattern found: always @(posedge a_clk) |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_v2_7_bus_conflict_system.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_v2_7_bus_conflict_system.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_v2_7_bus_conflict_system.v |
| vhdl-entity-name | PASS | entity gc_v2_7_bus_conflict_system found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 8 input ports declared |
| vhdl-output-ports | PASS | All 7 output port(s) declared |
| vhdl-checkpoint-pattern | PASS | VHDL checkpoint tokens verified |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_v2_7_bus_conflict_system.vhd |
| verilog-external-sim | PASS | 7 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 7 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_v2_8_sequential_feedback — PASS

- **Class:** sequential
- **Title:** Three-stage feedback mesh with seed load and XOR feedback
- **Reason:** 29 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_v2_8_sequential_feedback.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_v2_8_sequential_feedback.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_v2_8_sequential_feedback.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_v2_8_sequential_feedback, name=gc_v2_8_sequential_feedback |
| circuit-gate-types | PASS | All expected gates found: MUX2, XOR, D_FF_R |
| circuit-inputs | PASS | All 6 inputs found |
| circuit-outputs | PASS | Expected 4 output(s), found 4 LED(s) |
| verilog-module-name | PASS | module gc_v2_8_sequential_feedback found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 6 input ports declared |
| verilog-output-ports | PASS | All 4 output port(s) declared |
| verilog-checkpoint-ports | PASS | All 10 checkpoint ports found |
| verilog-checkpoint-wires | PASS | All 6 internal wires found |
| verilog-checkpoint-pattern | PASS | Checkpoint pattern found: xor g_g_xor_fb(w_3, w_2, w_0); |
| verilog-checkpoint-always-pattern | PASS | Always-block pattern found: assign w_4 = en ? w_0 : d; |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_v2_8_sequential_feedback.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_v2_8_sequential_feedback.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_v2_8_sequential_feedback.v |
| vhdl-entity-name | PASS | entity gc_v2_8_sequential_feedback found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 6 input ports declared |
| vhdl-output-ports | PASS | All 4 output port(s) declared |
| vhdl-checkpoint-pattern | PASS | VHDL checkpoint tokens verified |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_v2_8_sequential_feedback.vhd |
| verilog-external-sim | PASS | 8 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 8 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_v2_9_custom_reg4_pipeline — PASS

- **Class:** mixed
- **Title:** Dual REG4 custom-IC pipeline with one-cycle lag
- **Reason:** 27 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_v2_9_custom_reg4_pipeline.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_v2_9_custom_reg4_pipeline.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_v2_9_custom_reg4_pipeline.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_v2_9_custom_reg4_pipeline, name=gc_v2_9_custom_reg4_pipeline |
| circuit-gate-types | PASS | All expected gates found: CIC_REG4_STAGE, CIC_REG4_STAGE, XOR |
| circuit-inputs | PASS | All 7 inputs found |
| circuit-outputs | PASS | Expected 9 output(s), found 9 LED(s) |
| verilog-module-name | PASS | module gc_v2_9_custom_reg4_pipeline found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 7 input ports declared |
| verilog-output-ports | PASS | All 9 output port(s) declared |
| verilog-checkpoint-ports | PASS | All 8 checkpoint ports found |
| verilog-checkpoint-always-pattern | PASS | Always-block pattern found: xor g_cmp_xor(w_8, w_0, w_4) |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_v2_9_custom_reg4_pipeline.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_v2_9_custom_reg4_pipeline.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_v2_9_custom_reg4_pipeline.v |
| vhdl-entity-name | PASS | entity gc_v2_9_custom_reg4_pipeline found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 7 input ports declared |
| vhdl-output-ports | PASS | All 9 output port(s) declared |
| vhdl-checkpoint-pattern | PASS | VHDL checkpoint tokens verified |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_v2_9_custom_reg4_pipeline.vhd |
| verilog-external-sim | PASS | 4 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 4 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_v2_10_custom_tribuf_wrap — PASS

- **Class:** tristate
- **Title:** Custom TRIBUF hierarchy with preserved Z semantics
- **Reason:** 28 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_v2_10_custom_tribuf_wrap.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_v2_10_custom_tribuf_wrap.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_v2_10_custom_tribuf_wrap.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_v2_10_custom_tribuf_wrap, name=gc_v2_10_custom_tribuf_wrap |
| circuit-gate-types | PASS | All expected gates found: CIC_TRIBUF_WRAP |
| circuit-inputs | PASS | All 2 inputs found |
| circuit-outputs | PASS | Expected 1 output(s), found 1 LED(s) |
| verilog-module-name | PASS | module gc_v2_10_custom_tribuf_wrap found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 2 input ports declared |
| verilog-output-ports | PASS | All 1 output port(s) declared |
| verilog-checkpoint-ports | PASS | All 3 checkpoint ports found |
| verilog-checkpoint-pattern | PASS | Checkpoint pattern found: assign w_0 = (~oe) ? a : 1'bz |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_v2_10_custom_tribuf_wrap.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_v2_10_custom_tribuf_wrap.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_v2_10_custom_tribuf_wrap.v |
| vhdl-entity-name | PASS | entity gc_v2_10_custom_tribuf_wrap found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 2 input ports declared |
| vhdl-output-ports | PASS | All 1 output port(s) declared |
| vhdl-checkpoint-pattern | PASS | VHDL checkpoint tokens verified |
| vhdl-checkpoint-output-shadows | PASS | Output shadow signals (_q) found in VHDL |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_v2_10_custom_tribuf_wrap.vhd |
| verilog-external-sim | PASS | 3 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 3 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

### gc_v2_11_custom_hc194_wrap — PASS

- **Class:** sequential
- **Title:** Custom 74HC194 hierarchy with hidden register state
- **Reason:** 30 checks passed

| Check | Status | Detail |
|---|---|---|
| circuit-file-exists | PASS | validation/generated-circuits-golden/gc_v2_11_custom_hc194_wrap.lgsc.json |
| verilog-export-exists | PASS | validation/generated-exports-golden/gc_v2_11_custom_hc194_wrap.v |
| vhdl-export-exists | PASS | validation/generated-exports-golden/gc_v2_11_custom_hc194_wrap.vhd |
| circuit-json-parseable | PASS | Valid JSON |
| circuit-slug-match | PASS | id=gc_v2_11_custom_hc194_wrap, name=gc_v2_11_custom_hc194_wrap |
| circuit-gate-types | PASS | All expected gates found: CIC_HC194_WRAP |
| circuit-inputs | PASS | All 10 inputs found |
| circuit-outputs | PASS | Expected 4 output(s), found 4 LED(s) |
| verilog-module-name | PASS | module gc_v2_11_custom_hc194_wrap found |
| verilog-endmodule | PASS | endmodule found |
| verilog-input-ports | PASS | All 10 input ports declared |
| verilog-output-ports | PASS | All 4 output port(s) declared |
| verilog-checkpoint-ports | PASS | All 6 checkpoint ports found |
| verilog-checkpoint-pattern | PASS | Checkpoint pattern found: assign w_0 = reg_wrap_flat_dut[0] |
| verilog-checkpoint-always-pattern | PASS | Always-block pattern found: always @(posedge clk or negedge clrn) |
| verilog-checkpoint-extra-reg | PASS | Extra reg 'reg_wrap_flat_dut' found |
| verilog-iverilog-syntax | PASS | iverilog accepted validation/generated-exports-golden/gc_v2_11_custom_hc194_wrap.v |
| verilog-verilator-lint | PASS | verilator accepted validation/generated-exports-golden/gc_v2_11_custom_hc194_wrap.v |
| verilog-yosys-read | PASS | yosys accepted validation/generated-exports-golden/gc_v2_11_custom_hc194_wrap.v |
| vhdl-entity-name | PASS | entity gc_v2_11_custom_hc194_wrap found |
| vhdl-architecture | PASS | architecture block found |
| vhdl-input-ports | PASS | All 10 input ports declared |
| vhdl-output-ports | PASS | All 4 output port(s) declared |
| vhdl-checkpoint-pattern | PASS | VHDL checkpoint tokens verified |
| vhdl-checkpoint-extra-signal | PASS | Extra signal 'reg_wrap_flat_dut' found |
| vhdl-ghdl-analyze | PASS | ghdl accepted validation/generated-exports-golden/gc_v2_11_custom_hc194_wrap.vhd |
| verilog-external-sim | PASS | 5 scenario step(s) passed with iverilog/vvp |
| vhdl-external-sim | PASS | 5 scenario step(s) passed with ghdl |
| verilog-reexport-diff | PASS | Re-exported Verilog matches golden artifact exactly |
| vhdl-reexport-diff | PASS | Re-exported VHDL matches golden artifact exactly |

## What v1 Checks

- Circuit file existence and JSON parseability
- Verilog export existence and structural sanity (module name, ports, endmodule)
- VHDL export existence and structural sanity (entity name, architecture, ports)
- Slug-to-file 1:1 mapping
- Gate type presence in circuit files
- Input/output port consistency between corpus index and artifacts
- Checkpoint string matching against Verilog/VHDL sources
- External HDL syntax/lint compilation (iverilog, verilator, yosys, ghdl) when toolchain is present
- Scenario-based external HDL simulation for all non-boundary cases (iverilog/vvp and ghdl)
- **Re-export + byte-accurate diff against golden .v/.vhd artifacts** (export-determinism, v1.1)
- Known boundary classification (gc_t2_bus_mux)

**Export-determinism status:** Exporters loaded — diff checks ran live

## What v1 Does NOT Check (Gaps for v2)

- Exhaustive external HDL verification beyond the curated scenario traces
- Formal or property-based equivalence between runtime model and exported HDL
- Multi-driver bus behavior beyond the documented gc_t2_bus_mux boundary
- UI replay / visual regression

## Known Boundaries

- **gc_t2_bus_mux**: Documented exporter limitation: multi-driver tri-state bus — buf1 output (w_0) is driven but not exported as output port (last-wire-wins). This is a known, intentional model boundary.

Cases with expected_limit are *not* counted as pass. They document intentional model boundaries that are verified to still exist.
