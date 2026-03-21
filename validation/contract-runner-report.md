# Contract Runner v1 Report

Generated: 2026-03-21T16:25:31.580Z
Runner version: 1.4.0

## Summary

| Metric | Value |
|---|---|
| Contracts loaded | 86 |
| Total cases | 447 |
| Executed (pass + fail) | 447 |
| Passed | 447 |
| Failed | 0 |
| Unsupported (skipped) | 0 |

## Per-Gate Results

### 74HC00 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### 74HC04 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### 74HC08 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### 74HC138 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### 74HC148 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### 74HC151 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### 74HC153 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### 74HC161 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | clk-parallel-load | PASS | - |
| async-control-override | clrn-clear | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| counter-rollover | near-max-to-max | PASS | - |
| counter-rollover | rco-at-max | PASS | - |
| counter-rollover | max-to-zero | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| load-shift-mode | parallel-load | PASS | - |
| load-shift-mode | count-after-load | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 14, fail: 0, unsupported: 0, total: 14

### 74HC163 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | clk-parallel-load | PASS | - |
| reset-to-known-state | sync-clear-waits-for-edge | PASS | - |
| reset-to-known-state | sync-clear-on-edge | PASS | - |
| counter-rollover | near-max-to-max | PASS | - |
| counter-rollover | rco-at-max | PASS | - |
| counter-rollover | max-to-zero | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| load-shift-mode | parallel-load | PASS | - |
| load-shift-mode | count-after-load | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 14, fail: 0, unsupported: 0, total: 14

### 74HC194 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | clk-basic-edge | PASS | - |
| async-control-override | clrn-clear | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| shift-sequence | load-then-shift-right | PASS | - |
| load-shift-mode | parallel-load | PASS | - |
| load-shift-mode | shift-left-mode | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 12, fail: 0, unsupported: 0, total: 12

### 74HC283 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### 74HC32 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### 74HC373 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | latch-transparent-D=1 | PASS | - |
| sequential-step-sequence | latch-hold-after-disable | PASS | - |
| hold-state | en-inactive-Q=0 | PASS | - |
| hold-state | en-inactive-Q=1 | PASS | - |
| oe-tristate | oe-inactive-hiz | PASS | - |
| oe-tristate | oe-active-driven | PASS | - |
| multi-driver-conflict | conflicting-drivers-resolve-to-x | PASS | - |
| multi-driver-conflict | single-driver-wins-over-z | PASS | - |
| multi-driver-conflict | all-z-bus-stays-z | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 11, fail: 0, unsupported: 0, total: 11

### 74HC374 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | clk-wide-parallel-capture | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| oe-tristate | oe-inactive-hiz | PASS | - |
| oe-tristate | oe-active-driven | PASS | - |
| multi-driver-conflict | conflicting-drivers-resolve-to-x | PASS | - |
| multi-driver-conflict | single-driver-wins-over-z | PASS | - |
| multi-driver-conflict | all-z-bus-stays-z | PASS | - |
| reset-to-known-state | stateInit-all-zero | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 15, fail: 0, unsupported: 0, total: 15

### 74HC595 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | shift-ds1-in | PASS | - |
| sequential-step-sequence | latch-stcp-transfer | PASS | - |
| async-control-override | mr-clear-shift | PASS | - |
| shift-sequence | shift-then-latch-lower-nibble | PASS | - |
| oe-tristate | oe-inactive-hiz | PASS | - |
| oe-tristate | oe-active-driven | PASS | - |
| reset-to-known-state | mr-then-stcp-reset | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 9, fail: 0, unsupported: 0, total: 9

### 74HC74 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | clk1-edge-capture-D=0 | PASS | - |
| sequential-step-sequence | clk1-edge-capture-D=1 | PASS | - |
| sequential-step-sequence | clk2-edge-capture-D=0 | PASS | - |
| sequential-step-sequence | clk2-edge-capture-D=1 | PASS | - |
| async-control-override | pre1-preset | PASS | - |
| async-control-override | clr1-clear | PASS | - |
| async-control-override | pre2-preset | PASS | - |
| async-control-override | clr2-clear | PASS | - |
| forbidden-input-combination | combo-0 | PASS | - |
| forbidden-input-combination | combo-1 | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| clock-edge-detection | clk1-0->0 | PASS | - |
| clock-edge-detection | clk1-0->1 | PASS | - |
| clock-edge-detection | clk1-1->0 | PASS | - |
| clock-edge-detection | clk1-1->1 | PASS | - |
| clock-edge-detection | clk2-0->0 | PASS | - |
| clock-edge-detection | clk2-0->1 | PASS | - |
| clock-edge-detection | clk2-1->0 | PASS | - |
| clock-edge-detection | clk2-1->1 | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 21, fail: 0, unsupported: 0, total: 21

### 74HC86 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### ALU4 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### AND — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### AND3 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### AND4 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### AND_C — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### BIN_CTR7S — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| counter-rollover | near-max-to-max | PASS | - |
| counter-rollover | rco-at-max | PASS | - |
| counter-rollover | max-to-zero | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| sequential-step-sequence | clk-enable-count-step | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 11, fail: 0, unsupported: 0, total: 11

### BIN_CTR_99 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| counter-rollover | near-max-to-max | PASS | - |
| counter-rollover | max-to-zero | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| sequential-step-sequence | clk-enable-count-step | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 10, fail: 0, unsupported: 0, total: 10

### BUFFER — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### CMP1 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### CMP4 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### DEMUX2 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### DEMUX4 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### D_FF — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | clk-edge-capture-D=0 | PASS | - |
| sequential-step-sequence | clk-edge-capture-D=1 | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| reset-to-known-state | stateInit-all-zero | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 11, fail: 0, unsupported: 0, total: 11

### D_FF_ASSR — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| async-control-override | s-preset | PASS | - |
| async-control-override | r-reset | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| sequential-step-sequence | clk-edge-capture-D=0 | PASS | - |
| sequential-step-sequence | clk-edge-capture-D=1 | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 13, fail: 0, unsupported: 0, total: 13

### D_FF_R — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| async-control-override | rst-reset | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| sequential-step-sequence | clk-edge-capture-D=0 | PASS | - |
| sequential-step-sequence | clk-edge-capture-D=1 | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 12, fail: 0, unsupported: 0, total: 12

### D_LATCH — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | latch-transparent-D=1 | PASS | - |
| sequential-step-sequence | latch-hold-after-disable | PASS | - |
| hold-state | en-inactive-Q=0 | PASS | - |
| hold-state | en-inactive-Q=1 | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 6, fail: 0, unsupported: 0, total: 6

### JK_FF — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | clk-JK-set | PASS | - |
| sequential-step-sequence | clk-JK-reset | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| reset-to-known-state | stateInit-all-zero | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 11, fail: 0, unsupported: 0, total: 11

### JK_FF_ASSR — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| async-control-override | s-preset | PASS | - |
| async-control-override | r-reset | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| sequential-step-sequence | clk-JK-set | PASS | - |
| sequential-step-sequence | clk-JK-reset | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 13, fail: 0, unsupported: 0, total: 13

### JUNCTION — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |

pass: 1, fail: 0, unsupported: 0, total: 1

### MS_JK_FF — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| reset-to-known-state | stateInit-all-zero | PASS | - |
| sequential-step-sequence | master-transparent-while-clk-high | PASS | - |
| sequential-step-sequence | slave-transfers-on-falling-edge | PASS | - |
| sequential-step-sequence | toggle-after-full-clock-cycle | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 6, fail: 0, unsupported: 0, total: 6

### MUX2 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### MUX4 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### NAND — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### NAND3 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### NAND4 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### NAND_C — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### NOR — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### NOR3 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### NOR4 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### NOR_C — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### NOT — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### OR — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### OR3 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### OR4 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### OR_C — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### PIPO4 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| reset-to-known-state | stateInit-all-zero | PASS | - |
| sequential-step-sequence | clk-wide-parallel-capture | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 10, fail: 0, unsupported: 0, total: 10

### PIPO8 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| reset-to-known-state | stateInit-all-zero | PASS | - |
| sequential-step-sequence | clk-wide-parallel-capture | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 10, fail: 0, unsupported: 0, total: 10

### PISO4 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| load-shift-mode | parallel-load | PASS | - |
| load-shift-mode | shift-after-load | PASS | - |
| shift-sequence | serial-drain-after-load | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| sequential-step-sequence | clk-parallel-load | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 12, fail: 0, unsupported: 0, total: 12

### RAM256 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| oe-tristate | oe-inactive-hiz | PASS | - |
| oe-tristate | oe-active-driven | PASS | - |
| multi-driver-conflict | conflicting-drivers-resolve-to-x | PASS | - |
| multi-driver-conflict | single-driver-wins-over-z | PASS | - |
| multi-driver-conflict | all-z-bus-stays-z | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 7, fail: 0, unsupported: 0, total: 7

### REG4 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| async-control-override | rst-reset | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| sequential-step-sequence | clk-enabled-data-capture | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 11, fail: 0, unsupported: 0, total: 11

### REG8 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| async-control-override | rst-reset | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| sequential-step-sequence | clk-wide-parallel-capture | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 11, fail: 0, unsupported: 0, total: 11

### ROM256 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| oe-tristate | oe-inactive-hiz | PASS | - |
| oe-tristate | oe-active-driven | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 4, fail: 0, unsupported: 0, total: 4

### SCHMITT — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### SHIFT4 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| async-control-override | rst-reset | PASS | - |
| shift-sequence | four-step-serial-propagation | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| sequential-step-sequence | clk-edge-capture-D=0 | PASS | - |
| sequential-step-sequence | clk-edge-capture-D=1 | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 13, fail: 0, unsupported: 0, total: 13

### SPLIT4 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### SPLIT8 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### SR_FF_EDGE — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| forbidden-input-combination | combo-0 | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| reset-to-known-state | stateInit-all-zero | PASS | - |
| sequential-step-sequence | clk-SR-set | PASS | - |
| sequential-step-sequence | clk-SR-reset | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 12, fail: 0, unsupported: 0, total: 12

### SR_LATCH — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | set-to-1 | PASS | - |
| sequential-step-sequence | clear-to-0 | PASS | - |
| sequential-step-sequence | hold-from-Q=1 | PASS | - |
| forbidden-input-combination | combo-0 | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 7, fail: 0, unsupported: 0, total: 7

### TRIBUF — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| truth-table-exhaustive | oe-active-pass-through | PASS | - |
| truth-table-exhaustive | oe-inactive-hiz | PASS | - |
| oe-tristate | oe-inactive-hiz | PASS | - |
| oe-tristate | oe-active-driven | PASS | - |
| multi-driver-conflict | conflicting-drivers-resolve-to-x | PASS | - |
| multi-driver-conflict | single-driver-wins-over-z | PASS | - |
| multi-driver-conflict | all-z-bus-stays-z | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 10, fail: 0, unsupported: 0, total: 10

### T_FF — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | clk-T-hold | PASS | - |
| sequential-step-sequence | clk-T-toggle | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| reset-to-known-state | stateInit-all-zero | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 11, fail: 0, unsupported: 0, total: 11

### T_FF_ASSR — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| async-control-override | s-preset | PASS | - |
| async-control-override | r-reset | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| sequential-step-sequence | clk-T-hold | PASS | - |
| sequential-step-sequence | clk-T-toggle | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 13, fail: 0, unsupported: 0, total: 13

### XNOR — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### XOR — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### XOR3 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

### XOR_C — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| export-verilog | generator-smoke-test | PASS | - |
| export-vhdl | generator-smoke-test | PASS | - |

pass: 3, fail: 0, unsupported: 0, total: 3

## Contract Feature Coverage (v1)

### Supported patterns

- `truth-table-exhaustive`
- `sequential-step-sequence`
- `clock-edge-detection`
- `hold-state`
- `async-control-override`
- `reset-to-known-state`
- `forbidden-input-combination`
- `oe-tristate`
- `counter-rollover`
- `shift-sequence`
- `load-shift-mode`
- `multi-driver-conflict`
- `export-verilog`
- `export-vhdl`

### Unsupported patterns (deferred to v2+)

- `ui-state-projection`

### Contract fields consumed by v1

- `typeId` — gate lookup in registry
- `semantics.timingModel` — dispatch to combinational vs sequential runner
- `semantics.clockEdge` / `clockInputId` — edge direction and clock port
- `semantics.asyncControls[]` — async override, OE, and enable detection
- `semantics.stateVariables` — cross-referenced with runtime stateKeys
- `semantics.invalidInputCombinations[]` — forbidden-input test vectors
- `ports.inputs[].role` / `.defaultValue` / `.activeLow` — stimulus generation
- `ports.outputs[].canBeTriState` — Hi-Z expectation check
- `signalModel.allowedOutputValues` — output range validation
- `testability.requiredPatterns[]` — pattern dispatch list

### Contract fields NOT yet consumed

- `exportSupport` — HDL export smoke tests via real generator calls
- `risks[]` — informational, not automatically verified
- `modelLimits[]` — informational, not automatically verified
- `signalModel.hiZInputHandling` — not exercised
- `signalModel.busCapable` — exercised by shared-bus resolution checks

## Limits for v1

- Multi-cycle counter/shift verification is implemented only for gate families with dedicated handlers; other gates may still report unsupported.
- HDL export checks are smoke-tests only; they do not prove full HDL equivalence or synthesis fidelity.
- Shared-bus checks use representative two-driver fixtures, not full graph-level circuit simulation.
- No UI projection tests (ui-state-projection requires browser)
- 74HC74 dual-FF: only FF1 clock (clk1) is exercised for edge detection; FF2 follows same pattern
- Wide ICs (74HC373/374/595): only representative data bit tested for step-sequence, not all 8
