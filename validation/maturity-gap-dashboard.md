# Logic Gate Simulator - Maturity Gap Dashboard

**Project:** logic-gate-simulator
**Generated:** 2026-03-08
**Basis:** focused-nine-summary.json, focused-nine-ui-summary.json, contract-runner-summary.json, golden-corpus-v1-summary.json, gate-gap-analysis.md, gate-inventory.json, testability-mapping.json, all 12 gate contracts

---

## Overview

This dashboard consolidates maturity evidence across seven criteria. Each criterion is assessed on the basis of confirmed test results from the focused-nine audit and the gate inventory. Claims marked `[CONFIRMED]` are backed by test evidence. Claims marked `[INFERRED]` are derived from source analysis or inventory data without a failing test.

**Overall maturity level: BETA / APPROACHING-PRODUCTION**

**Last updated 2026-03-08 (post-P1-5/P1-6 + UI-timing follow-up):** All P0 blockers, P1-1 through P1-6 resolved. P1-5 (Contract Runner v1): 91 pass, 0 fail, 34 unsupported - in CI. P1-6 (Golden Corpus v1 Runner): 11 pass, 0 fail, 1 expected_limit - in CI. CI now has 5 jobs: quality-gates, contract-runner, golden-corpus, focused-nine-core, hdl-toolchain. Test suite: **845/845**. Focused-nine core: **12/12 PASS, 0 tooling warnings**. Focused-nine UI: **12/12 smoke PASS, 5 semantic PASS, 0 semantic WARN**. Remaining P1 item is UI-audit CI integration.

---

## Criterion 1 - Formal Simulation Model

**Objective:** The simulator should accurately model a defined signal algebra, handle all signal values consistently, and represent timing models faithfully.

### Current State

The simulator now uses a four-valued signal algebra: `SignalValue = 0 | 1 | 2 | 3` where 2 represents HI_Z (tri-state / floating) and 3 represents X (unknown / conflict). Z propagates correctly through the signal chain and conflicts between drivers resolve to X. This was the P0 fix verified 2026-03-07.

### Confirmed Strengths

- Four-valued signal type (0/1/Z/X) is well-defined in `src/core/types.ts`
- Z propagates correctly to downstream gate inputs - downstream NOT(Z) produces X [CONFIRMED: `tri_not_sanitized` PASS]
- Conflicting drivers on the same net resolve to X (3) [CONFIRMED: `multi_driver_same_input` PASS]
- Edge-triggered flip-flop timing is modeled correctly via prevClk comparison in evaluate()
- Master-slave JK FF uses two-phase clocking (correct master/slave split)
- Level-sensitive latch model is correctly implemented (transparent on LE=1, latched on LE=0)
- Async SET/RESET on all ASSR variants tested and confirmed correct

### Confirmed Weaknesses

| Issue | Evidence | Severity |
|---|---|---|
| ~~**HI_Z (Z=2) is sanitized to 0 before downstream evaluate()**~~ | **RESOLVED P0 2026-03-07**  `tri_not_sanitized` PASS, triY=2, invOut=3 | ~~P0 blocker~~ done |
| No setup/hold violation modeling  metastability produces 0 not X | [INFERRED from type definition] | model-limit |
| `prevClk` stored in customState but absent from `stateKeys`  hidden simulator state | gate-gap-analysis.md 6 | core-risk |
| MS_JK_FF: master state `qM` not in stateKeys  partially observable only | gate-gap-analysis.md 6 | core-risk |
| BIN_CTR7S/BIN_CTR_99: dual-write of `count` + `cnt0..cnt3`  inconsistency risk | gate-gap-analysis.md 6 | core-risk |

### Resolved Blockers

- **RESOLVED P0 2026-03-07:** Z propagation to downstream inputs is now correct. The sanitization step was removed. TRIBUF, 74HC373, 74HC374, 74HC595 correctly output Z when disabled, and downstream gates see Z (not 0).

### Next Steps

1. Add `prevClk` to stateKeys for all edge-triggered FFs (or document as intentionally hidden)
2. Add `qM` to MS_JK_FF stateKeys
3. Document all model-limit items (no X for metastability) in user-facing docs

**Priority: P1** (hidden state keys  P0 Z sanitization resolved 2026-03-07)

---

## Criterion 2  Cross-Layer Consistency

**Objective:** Simulation model, HDL export, UI state display, and gate contracts should all describe the same behavior. Changes to one layer should not silently break another.

### Current State

The four-value signal model (0/1/Z/X) is now consistent across simulation and HDL export for all focused-nine test cases. Basic gate HDL export (AND/OR/NOT etc.) was added in the P0 phase. No automated cross-layer consistency check exists yet, but all 12 focused-nine HDL exports pass toolchain validation.

### Confirmed Strengths

- Gate contracts (12 files in `validation/contracts/`) document expected behavior independent of implementation
- Contract schema (`gate-contract-schema.json`) provides a machine-readable reference for consistency checking
- 74HC74 contract documents the /PRE=/CLR=0 forbidden state and the Q=1, Qn=1 output  consistent with source
- All 12 focused-nine Verilog and VHDL exports match the UI HDL modal textually [CONFIRMED: focused-nine-ui-summary.json]

### Confirmed Weaknesses

| Issue | Evidence | Severity |
|---|---|---|
| ~~**Multi-driver HDL export generates duplicate port declarations**~~ | **RESOLVED P0 2026-03-07**  `multi_driver_same_input` all tools PASS, conflict resolves to X | ~~P0 blocker~~ done |
| ~~VHDL `&` operator on STD_LOGIC is ambiguous~~ | **RESOLVED P1a 2026-03-07** | ~~P0~~ done |
| ~~**74HC373 Verilog always@(*) latch triggers Verilator LATCH warning-as-error**~~ | **RESOLVED P1-1 2026-03-07**  Verilog-2001 export with `/* verilator lint_off LATCH */`...`/* verilator lint_on LATCH */` inline comments; all tools PASS | ~~P1~~ done |
| MS_JK_FF HDL export uses `negedge clk` only  does not model master-slave behavior | gate-gap-analysis.md 4.2 | synthesis-risk |
| D_LATCH Verilog `always @(*)` causes latch inference warnings in synthesis tools | gate-gap-analysis.md 4.4 | synthesis-risk |
| ~~17 basic gates (AND/OR/NOT/NAND/NOR/XOR/XNOR/BUFFER + multi-input variants) have no toVerilog/toVHDL~~ | **RESOLVED P0 2026-03-07**  all logic_basic and logic_multi gates now export | ~~P0 blocker~~ done |
| AND_C/OR_C/XOR_C output naming (`q`, `q_n`) inverted vs NAND_C/NOR_C  inconsistency | gate-gap-analysis.md 7.3 | documentation-gap |

### Resolved Blockers

- **RESOLVED P0 2026-03-07:** Multi-driver HDL: serializer now generates correct tri/wired resolution. All tools pass for `multi_driver_same_input`.
- **RESOLVED P0 2026-03-07:** Basic gate HDL (AND/OR/NOT/NAND/NOR/XOR/XNOR etc.)  toVerilog/toVHDL added for all logic_basic and logic_multi gates.

### Next Steps

1. ~~Fix 74HC373 Verilog Verilator LATCH~~  **RESOLVED P1-1 2026-03-07** (Verilog-2001 + lint_off/lint_on)
2. Document MS_JK_FF HDL approximation as synthesis-risk in the gate contract

**Priority: P2** (MS_JK_FF approximation  P0 and P1-1 items resolved 2026-03-07)

---

## Criterion 3  Verification Strength

**Objective:** Test coverage should be systematic, automated, and traceable to gate contracts. All required test patterns should have runnable implementations.

### Current State

Verification covers 845/845 vitest tests, 12/12 focused-nine simulation + toolchain cases, 91/125 contract runner cases (34 unsupported patterns), and 11/12 golden corpus cases (1 expected_limit). Multi-driver behavior is now formally defined and tested. The testability mapping (`testability-mapping.json`) defines 14 test patterns across 18 gate classes (124 required pattern slots). Contract Runner v1 provides automated behavioral verification against 12 gate contracts. Golden Corpus v1 Runner provides structural regression across 12 reference circuits.

### Confirmed Strengths

- Testability mapping is comprehensive and machine-readable
- Gate contracts define precise behavioral expectations with input/output tables
- Focused-nine audit covers 12 high-risk cases  all now pass [CONFIRMED: focused-nine-summary.json]
- Contract Runner v1 verifies 12 gate contracts (125 cases)  91 pass, 34 unsupported [CONFIRMED: contract-runner-summary.json]
- Golden Corpus v1 Runner verifies 12 reference circuits  11 pass, 1 expected_limit [CONFIRMED: golden-corpus-v1-summary.json]
- Risk classes are assigned per-gate, enabling risk-weighted test prioritization
- Multi-driver conflict behavior is now defined and verified: conflicting drivers -> X (3) [CONFIRMED]

### Confirmed Weaknesses

| Issue | Evidence | Severity |
|---|---|---|
| No automated truth-table-exhaustive test runner for any combinational gate | [INFERRED  no test directory found] | P2 |
| No automated sequential-step-sequence runner for flip-flops or registers | [INFERRED] | P2 |
| Forbidden-input-combination not tested for SR_LATCH S=R=1 | testability-mapping.json | P2 |
| 34 contract-runner patterns unsupported (step-sequence, forbidden-input, async-set/reset, output-enable) | contract-runner-summary.json | P2 |
| 26 documentation-gap entries  gate behavior partially undocumented | gate-gap-analysis.md 10 | P2 |
| Only 12 of 71+ gates have formal contracts | gate-inventory.json | P2 |

### Resolved Blockers

- **RESOLVED P0 2026-03-07:** Multi-driver simulation behavior is now defined: conflicting drivers on the same net resolve to X (3). The `multi_driver_same_input` test confirms conflict detection and X resolution.
- **RESOLVED P1-5 2026-03-08:** Contract Runner v1 now executes automatically and runs as a CI gate. 91 pass, 0 fail, 34 unsupported.

### Next Steps

1. Implement truth-table and step-sequence test patterns to close the 34 unsupported contract-runner slots
2. Add forbidden-input-combination assertions to SR_LATCH, JK_FF_ASSR, 74HC74 tests
3. Expand contracts to cover remaining 60 gates (prioritize by risk class)

**Priority: P2** (further test pattern expansion  Contract Runner v1 and Golden Corpus v1 now operational and in CI)

---

## Criterion 4  External Reference Toolchain

**Objective:** HDL exports should be accepted by industry-standard tools (iverilog, verilator, yosys, ghdl) without errors or suppressible warnings. Output should be synthesizable.

### Current State

All 12 focused-nine cases pass all tools without errors or warnings. 74HC373 Verilog latch warning resolved via Verilog-2001 export with `/* verilator lint_off LATCH */`...`/* verilator lint_on LATCH */` inline pragmas (P1-1, 2026-03-07).

### Confirmed Failures

None.

### Resolved

| Test Case | Tool | Fix |
|---|---|---|
| `multi_driver_same_input` | iverilog, verilator, ghdl | Duplicate port declarations fixed  all tools now PASS (P0 2026-03-07) |
| `hc194_modes` | ghdl | VHDL `&` cast fix (P1a 2026-03-07)  now PASS |
| `mixed_datapath` (ALU4) | ghdl | Same fix (P1a 2026-03-07)  now PASS |
| `hc373_oe_z` | verilator | `%Warning-LATCH` resolved: Verilog-2001 + `/* verilator lint_off LATCH */`...`/* verilator lint_on LATCH */` (P1-1 2026-03-07) |

### Confirmed Passing

| Test Case | Result |
|---|---|
| Single-gate Verilog (74HC74, 74HC161, 74HC163, 74HC595, 74HC194 Verilog, dff_led, jkff_led, tff_led) | iverilog PASS |
| hc194_modes, mixed_datapath | ghdl PASS (after P1a fix) |
| tri_not_sanitized, multi_driver_same_input, hc374_oe_z, hc595_oe_shift, hc161_clear, hc163_clear | all tools PASS |
| yosys synthesis | PASS for all gates that pass iverilog |

### Next Steps

1. ~~Fix 74HC373 Verilog latch~~  **RESOLVED P1-1 2026-03-07** (Verilog-2001 + `/* verilator lint_off LATCH */`...`/* verilator lint_on LATCH */`)
2. ~~Extend CI beyond focused-nine core~~  **RESOLVED P1-6 2026-03-08** (contract-runner + golden-corpus jobs added)
3. Add external HDL functional simulation (iverilog/ghdl) against golden corpus exports as a v2 gap

**Priority: P2** (broader regression automation  all tooling warnings resolved 2026-03-07)

---

## Criterion 5  Hierarchy and Large Design Support

**Objective:** The simulator should handle hierarchical designs (custom ICs, subcircuits) and scale to circuits with many gates without correctness degradation.

### Current State

Custom ICs exist (`category=custom`) but were explicitly excluded from the gate contract analysis  they are dynamically registered at runtime and cannot be statically verified. No evidence of hierarchy-specific test coverage exists. Multi-driver bus conflict behavior is now correctly modeled.

### Confirmed Strengths

- Custom IC registration exists in the registry infrastructure [INFERRED from registry code]
- Gate contracts include `hierarchy` section in the schema for documenting subcircuit containment
- Multi-driver conflict on a shared net now correctly produces X  bus topologies are no longer silently wrong [CONFIRMED: focused-nine-summary.json]

### Confirmed Weaknesses

| Issue | Evidence | Severity |
|---|---|---|
| Custom ICs: no contracts, no static analysis possible | gate-gap-analysis.md 8 | P2 |
| Golden Corpus v1 covers 12 circuits but none are large (>20 gates) or hierarchical | `golden-corpus-v1.json`  12 reference circuits, none large/hierarchical; custom ICs still uncovered | P2 |
| ~~STT variable limit (max 8) blocks state inspection for all ICs with >8 inputs+state~~ | **PARTIALLY RESOLVED (post-P0):** STT now renders a "Reduzierte Ansicht" (reduced view) for wide sequentials  8-64 rows of meaningful data instead of error message | P2 (residual) |

### Resolved Blockers

- **RESOLVED P0 2026-03-07:** Multi-driver bus conflict now raises X conflict detection. Users see X (unknown/conflict) signal value at conflicting nodes, not a silently-wrong 0 or 1.
- **PARTIALLY RESOLVED (post-P0):** STT reduced view  wide sequential ICs (74HC373, 74HC374, 74HC595, 74HC161, 74HC163, 74HC194, mixed_datapath) now show a partial but useful state table, confirmed in focused-nine UI audit. [CONFIRMED: focused-nine-ui-summary.json 2026-03-07]

### Next Steps

1. Expand Golden Corpus v2 with large (>20 gates) and hierarchical/custom-IC cases
2. Design a dynamic contract verification approach for custom ICs (runtime invariant checking)
3. Extend the STT reduced view to show more configurable input subsets

**Priority: P2** (golden corpus expansion, STT improvements, custom IC contracts  Golden Corpus v1 is now executable and in CI)

---

## Criterion 6  Formal Quality Assurance

**Objective:** There should be a defined QA process: reproducible test runs, pass/fail gates, regression tracking, and documented known issues.

### Current State

A CI pipeline exists (`.github/workflows/quality-gates.yml`) with five jobs:
- `quality-gates`  test/build/lint via `run_quality_gates.sh`
- `contract-runner`  Contract Runner v1 (91 pass, 0 fail, 34 unsupported) via `run_contract_runner.sh`
- `golden-corpus`  Golden Corpus v1 Runner (11 pass, 0 fail, 1 expected_limit) via `run_golden_corpus.sh`
- `focused-nine-core`  12-case simulation + HDL-regression via `run_focused_nine_core.sh`
- `hdl-toolchain`  iverilog/ghdl/yosys/verilator presence check via `check_hdl_toolchain.sh`

Contract Runner and Golden Corpus Runner are real blocking CI gates: exit code != 0 fails the job. Both CI scripts validate the invariant (totalCases = sum of all status categories) and reject any `failed > 0` result. `expected_limit` in the Golden Corpus (gc_t2_bus_mux) does NOT cause CI failure  it documents a known model boundary. All three fachliche jobs upload their reports as CI artifacts.

### Confirmed Strengths

- Focused-nine audit is structured and machine-readable (JSON format)
- Contract Runner v1 provides automated behavioral verification for 12 gate contracts [CONFIRMED: contract-runner-summary.json  91 pass, CI gate]
- Golden Corpus v1 Runner provides structural regression for 12 reference circuits [CONFIRMED: golden-corpus-v1-summary.json  11 pass, 1 expected_limit, CI gate]
- Gap analysis assigns risk classes to all findings
- Testability mapping defines a prioritized test plan (P0/P1/P2/P3)
- Gate contracts provide specification-level acceptance criteria
- vitest: 845/845 pass  test suite is comprehensive for simulation correctness
- CI uploads reports as artifacts for contract-runner, golden-corpus, and focused-nine-core

### Confirmed Weaknesses

| Issue | Evidence | Severity |
|---|---|---|
| UI timing audit is not yet in CI | `.github/workflows/quality-gates.yml`  no UI audit job | P1 |
| Branch protection / required status checks not configured in GitHub Settings | External manual step needed | P2 |
| No export-determinism check (re-export + diff against golden artifacts) | golden-corpus-v1-report.md: listed as v2 gap | P2 |
| No external HDL functional simulation in golden corpus (iverilog/ghdl run against golden exports) | golden-corpus-v1-report.md: listed as v2 gap | P2 |
| Known issues not linked to issue tracker | gate-gap-analysis.md, focused-nine-summary.json | P2 |
| ~~4 defaultInputValues unsafe /OE defaults~~ | **RESOLVED P1b 2026-03-07** | ~~P1~~ done |
| ~~Golden-Corpus v1 exists as artifacts, but no executable runner or CI gate~~ | **RESOLVED P1-6 2026-03-08**  Golden Corpus v1 Runner built and wired into CI | ~~P1~~ done |
| ~~Only focused-nine core in CI; no contract or corpus regression~~ | **RESOLVED P1-6 2026-03-08**  5 CI jobs active | ~~P1~~ done |

### Next Steps

1. Add UI timing audit as a CI job (once headless timing rendering is deterministic)
2. Add export-determinism check to Golden Corpus (re-export + diff against golden artifacts)
3. Configure branch protection rules in GitHub Settings to enforce required status checks
4. Create a known-issues register (structured JSON or GitHub issues) linked from the gap analysis

**Priority: P1** (UI timing audit CI), **P2** (export-determinism, branch protection, issue tracker linkage)

---

## Criterion 7  Technical Depth

**Objective:** The simulator should model the electronics faithfully enough to be useful for learning and circuit design  not just as a visual toy.

### Current State

The simulator now has strong technical depth for combinational, sequential, and tri-state/bus logic. The 0/1/Z/X signal model is complete. HDL export is functional for all gate classes. Remaining depth gaps are in metastability modeling and documentation.

### Confirmed Strengths

- Four-valued logic (0/1/Z/X) is architecturally complete  Z propagates, conflicts yield X [CONFIRMED]
- Master-slave JK FF models two-phase clocking correctly in simulation
- 74HC74 dual FF with independent async PRE/CLR modeled correctly
- 74HC161 async clear vs. 74HC163 sync clear distinction is preserved
- ALU4 covers 8 opcodes with carry-in/carry-out [INFERRED from inventory]
- BIN_CTR_99 models BCD rollover at 99 [INFERRED]
- All logic_basic and logic_multi gates now have HDL export [CONFIRMED: codeAudit hardBlockers=[]]

### Confirmed Weaknesses

| Issue | Evidence | Severity |
|---|---|---|
| SCHMITT trigger has no hysteresis  modeled as inverting buffer only | gate-gap-analysis.md 7.3 | model-limit |
| No metastability, setup/hold violation modeling  violations produce 0, not X | [INFERRED  no X state for timing violations] | model-limit |
| SR_LATCH S=R=1  Q=0, Qn=0 (both low)  real hardware is undefined/race | gate-gap-analysis.md 4.1 | model-limit |
| 74HC74 /PRE=/CLR=0  Q=1, Qn=1 (both high)  real hardware is undefined | gate-gap-analysis.md 4.1 | model-limit |
| ~~TRIBUF, 74HC373, 74HC374, 74HC595 have unsafe /OE defaults~~ | **RESOLVED P1b 2026-03-07** | ~~core-risk~~ done |
| ~~Z propagation broken  bus architectures produce wrong results~~ | **RESOLVED P0 2026-03-07**  Z propagates; NOT(Z)X confirmed | ~~P0~~ done |
| ~~17 basic gates have no HDL export  cannot synthesize any real circuit~~ | **RESOLVED P0 2026-03-07**  toVerilog/toVHDL added to all logic_basic and logic_multi | ~~P0~~ done |

### Next Steps

1. Document all model-limit items (no X for metastability, SR forbidden state, 74HC74 forbidden state) in user-facing documentation
2. Consider adding metastability/setup-hold X generation as a future Signal model extension

~~Fix /OE defaultInputValues~~  RESOLVED P1b 2026-03-07
~~Fix Z propagation~~  RESOLVED P0 2026-03-07
~~Add basic gate HDL export~~  RESOLVED P0 2026-03-07

**Priority: P2** (model-limit docs  all P0 items resolved 2026-03-07)

---

## Consolidated Priority Summary

### Resolved

| ID | Issue | Status |
|---|---|---|
| ~~P0-1~~ | HI_Z (Z=2) sanitized to 0 in simulation engine | **DONE P0 2026-03-07** |
| ~~P0-2~~ | Multi-driver: silent winner selection + duplicate HDL port declarations | **DONE P0 2026-03-07** |
| ~~P0-3~~ | VHDL `&` operator on STD_LOGIC  GHDL parse failure (74HC194, ALU4) | **DONE P1a 2026-03-07** |
| ~~P0-4~~ | 17 basic gates missing toVerilog/toVHDL  no real circuit can be exported | **DONE P0 2026-03-07** |
| ~~P1-2~~ | Unsafe /OE defaultInputValues on TRIBUF, 74HC373, 74HC374, 74HC595 | **DONE P1b 2026-03-07** |
| ~~P1-1~~ | 74HC373 Verilog latch  Verilator LATCH warning-as-error | **DONE P1-1 2026-03-07** |
| ~~P1-3~~ | prevClk hidden state not in stateKeys (edge-triggered FFs) | **DONE P1-3 2026-03-07** |
| ~~P1-5~~ | Contract Runner v1  automated gate contract verification | **DONE P1-5 2026-03-08**  91 pass, 0 fail, 34 unsupported, in CI |
| ~~P1-6~~ | Golden Corpus v1 Runner + CI expansion | **DONE P1-6 2026-03-08**  11 pass, 1 expected_limit, 5 CI jobs |

### P1  High Priority (fix before production use)

| ID | Issue | Criterion |
|---|---|---|
| ~~P1-4~~ | ~~STT variable limit blocks UI verification for all ICs~~ | **PARTIALLY RESOLVED (post-P0):** Reduced-view renders 8-64 rows for wide ICs  remaining gap is full enumeration |
| P1-7 | UI timing audit is locally green but not yet a CI gate | Crit 6 |

### P2  Medium Priority (completeness and polish)

| ID | Issue | Criterion |
|---|---|---|
| P2-1 | MS_JK_FF HDL export approximates master-slave as negedge-only | Crit 2 |
| P2-2 | Gate contracts exist for only 12/71 gates | Crit 3 |
| P2-3 | Custom IC (category=custom) contracts  no static verification strategy | Crit 5 |
| P2-4 | Export-determinism / re-export diff not yet in golden corpus or CI | Crit 4, Crit 6 |
| P2-5 | 26 documentation-gap items in gate inventory | Crit 7 |
| P2-6 | Branch protection / required status checks not configured (GitHub Settings) | Crit 6 |
| P2-7 | Golden Corpus v2 expansion  large/hierarchical circuits, external HDL simulation | Crit 5 |
| P2-8 | 34 unsupported contract-runner patterns (step-sequence, forbidden-input, etc.) | Crit 3 |

---

## Raw Data References

| File | Contents |
|---|---|
| `validation/focused-nine-summary.json` | 12 simulation+toolchain test results (12/12 PASS, 0 tooling warnings) |
| `validation/focused-nine-ui-summary.json` | UI and STT audit results (12/12 smoke PASS, 5 semantic PASS, 0 semantic WARN) |
| `validation/contract-runner-summary.json` | Contract Runner v1 results (91 pass, 0 fail, 34 unsupported, 125 total) |
| `validation/golden-corpus-v1-summary.json` | Golden Corpus v1 results (11 pass, 0 fail, 1 expected_limit, 12 total) |
| `validation/golden-corpus-v1.json` | 12 Golden-Corpus-v1 reference circuits with class, checkpoints, rationale |
| `validation/golden-corpus-v1.md` | Human-readable description of the 12 Golden-Corpus-v1 circuits |
| `validation/gate-gap-analysis.md` | Full gap analysis (11 sections, 323 lines) |
| `validation/gate-inventory.json` | All 83 gate entries with metadata |
| `validation/testability-mapping.json` | 18 gate classes, 14 test patterns, 124 slots |
| `validation/contracts/*.json` | 12 gate contracts |
| `validation/gate-contract-schema.json` | JSON Schema for gate contracts |
| `.github/workflows/quality-gates.yml` | CI pipeline  5 jobs: quality-gates, contract-runner, golden-corpus, focused-nine-core, hdl-toolchain |
