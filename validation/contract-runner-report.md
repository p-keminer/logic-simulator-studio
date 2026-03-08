# Contract Runner v1 Report

Generated: 2026-03-08T01:31:34.491Z
Runner version: 1.0.0

## Summary

| Metric | Value |
|---|---|
| Contracts loaded | 12 |
| Total cases | 125 |
| Executed (pass + fail) | 91 |
| Passed | 91 |
| Failed | 0 |
| Unsupported (skipped) | 34 |

## Per-Gate Results

### 74HC161 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | clk-parallel-load | PASS | - |
| async-control-override | clrn-clear | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| counter-rollover | unsupported | UNSUPPORTED | unsupported_contract_feature |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| load-shift-mode | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-verilog | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-vhdl | unsupported | UNSUPPORTED | unsupported_contract_feature |

pass: 7, fail: 0, unsupported: 4, total: 11

### 74HC163 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | clk-parallel-load | PASS | - |
| reset-to-known-state | stateInit-all-zero | PASS | - |
| counter-rollover | unsupported | UNSUPPORTED | unsupported_contract_feature |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| load-shift-mode | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-verilog | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-vhdl | unsupported | UNSUPPORTED | unsupported_contract_feature |

pass: 6, fail: 0, unsupported: 4, total: 10

### 74HC194 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | clk-basic-edge | PASS | - |
| async-control-override | clrn-clear | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| shift-sequence | unsupported | UNSUPPORTED | unsupported_contract_feature |
| load-shift-mode | unsupported | UNSUPPORTED | unsupported_contract_feature |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| export-verilog | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-vhdl | unsupported | UNSUPPORTED | unsupported_contract_feature |

pass: 7, fail: 0, unsupported: 4, total: 11

### 74HC373 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | latch-transparent-D=1 | PASS | - |
| sequential-step-sequence | latch-hold-after-disable | PASS | - |
| hold-state | en-inactive-Q=0 | PASS | - |
| hold-state | en-inactive-Q=1 | PASS | - |
| oe-tristate | oe-inactive-hiz | PASS | - |
| oe-tristate | oe-active-driven | PASS | - |
| multi-driver-conflict | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-verilog | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-vhdl | unsupported | UNSUPPORTED | unsupported_contract_feature |

pass: 6, fail: 0, unsupported: 3, total: 9

### 74HC374 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | clk-basic-edge | PASS | - |
| clock-edge-detection | clk-0->0 | PASS | - |
| clock-edge-detection | clk-0->1 | PASS | - |
| clock-edge-detection | clk-1->0 | PASS | - |
| clock-edge-detection | clk-1->1 | PASS | - |
| hold-state | clk-no-edge-Q=0 | PASS | - |
| hold-state | clk-no-edge-Q=1 | PASS | - |
| oe-tristate | oe-inactive-hiz | PASS | - |
| oe-tristate | oe-active-driven | PASS | - |
| multi-driver-conflict | unsupported | UNSUPPORTED | unsupported_contract_feature |
| reset-to-known-state | stateInit-all-zero | PASS | - |
| export-verilog | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-vhdl | unsupported | UNSUPPORTED | unsupported_contract_feature |

pass: 10, fail: 0, unsupported: 3, total: 13

### 74HC595 — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | shift-ds1-in | PASS | - |
| sequential-step-sequence | latch-stcp-transfer | PASS | - |
| async-control-override | mr-clear-shift | PASS | - |
| shift-sequence | unsupported | UNSUPPORTED | unsupported_contract_feature |
| reset-to-known-state | mr-then-stcp-reset | PASS | - |
| export-verilog | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-vhdl | unsupported | UNSUPPORTED | unsupported_contract_feature |

pass: 4, fail: 0, unsupported: 3, total: 7

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
| export-verilog | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-vhdl | unsupported | UNSUPPORTED | unsupported_contract_feature |

pass: 19, fail: 0, unsupported: 2, total: 21

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
| export-verilog | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-vhdl | unsupported | UNSUPPORTED | unsupported_contract_feature |

pass: 9, fail: 0, unsupported: 2, total: 11

### D_LATCH — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | latch-transparent-D=1 | PASS | - |
| sequential-step-sequence | latch-hold-after-disable | PASS | - |
| hold-state | en-inactive-Q=0 | PASS | - |
| hold-state | en-inactive-Q=1 | PASS | - |
| export-verilog | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-vhdl | unsupported | UNSUPPORTED | unsupported_contract_feature |

pass: 4, fail: 0, unsupported: 2, total: 6

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
| export-verilog | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-vhdl | unsupported | UNSUPPORTED | unsupported_contract_feature |

pass: 9, fail: 0, unsupported: 2, total: 11

### SR_LATCH — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| sequential-step-sequence | set-to-1 | PASS | - |
| sequential-step-sequence | clear-to-0 | PASS | - |
| sequential-step-sequence | hold-from-Q=1 | PASS | - |
| forbidden-input-combination | combo-0 | PASS | - |
| reset-to-known-state | async-reset | PASS | - |
| export-verilog | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-vhdl | unsupported | UNSUPPORTED | unsupported_contract_feature |

pass: 5, fail: 0, unsupported: 2, total: 7

### TRIBUF — PASS

| Pattern | Case | Status | Error Class |
|---|---|---|---|
| truth-table-exhaustive | all-rows | PASS | - |
| truth-table-exhaustive | oe-active-pass-through | PASS | - |
| truth-table-exhaustive | oe-inactive-hiz | PASS | - |
| oe-tristate | oe-inactive-hiz | PASS | - |
| oe-tristate | oe-active-driven | PASS | - |
| multi-driver-conflict | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-verilog | unsupported | UNSUPPORTED | unsupported_contract_feature |
| export-vhdl | unsupported | UNSUPPORTED | unsupported_contract_feature |

pass: 5, fail: 0, unsupported: 3, total: 8

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

### Unsupported patterns (deferred to v2+)

- `export-verilog`
- `export-vhdl`
- `multi-driver-conflict`
- `counter-rollover`
- `shift-sequence`
- `load-shift-mode`
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

- `exportSupport` — HDL export testing (covered by focused-nine audit)
- `risks[]` — informational, not automatically verified
- `modelLimits[]` — informational, not automatically verified
- `signalModel.hiZInputHandling` — not exercised
- `signalModel.busCapable` — not exercised (requires multi-gate circuit)

## Limits for v1

- No multi-cycle counter/shift-register verification (counter-rollover, shift-sequence, load-shift-mode)
- No HDL export validation (covered separately by focused-nine core audit)
- No circuit-level tests (multi-driver-conflict requires bus simulation)
- No UI projection tests (ui-state-projection requires browser)
- 74HC74 dual-FF: only FF1 clock (clk1) is exercised for edge detection; FF2 follows same pattern
- Wide ICs (74HC373/374/595): only representative data bit tested for step-sequence, not all 8
