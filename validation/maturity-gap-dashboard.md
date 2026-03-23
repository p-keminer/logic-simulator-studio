# Logic Gate Simulator - Maturity Gap Dashboard

**Project:** logic-gate-simulator
**Generated:** 2026-03-20
**Basis:** focused-nine-summary.json, focused-nine-ui-summary.json, contract-runner-summary.json, golden-corpus-v1-summary.json, gate-gap-analysis.md, gate-inventory.json, testability-mapping.json, all 86 gate contracts

---

## Overview

This dashboard consolidates maturity evidence across seven criteria. Each criterion is assessed on the basis of confirmed test results from the focused-nine audit and the gate inventory. Claims marked `[CONFIRMED]` are backed by test evidence. Claims marked `[INFERRED]` are derived from source analysis or inventory data without a failing test.

**Overall maturity level: BETA / APPROACHING-PRODUCTION**

**Last updated 2026-03-23:** All P0 blockers and P1-1 through P1-7 remain resolved. Contract Runner v1 now stands at 447 pass, 0 fail, 0 unsupported and is green in CI. Golden Corpus v1 stands at 28 pass, 0 fail, 2 expected_limit across 30 circuits and now runs live export-determinism plus external HDL syntax/lint and scenario-based simulation, including the fifteen v2 pilot seeds `gc_v2_1_mux_fabric`, `gc_v2_2_datapath_slice`, `gc_v2_3_shift_pipeline`, `gc_v2_4_ram_readback`, `gc_v2_5_decode_tree`, `gc_v2_6_custom_halfadder`, `gc_v2_7_bus_conflict_system`, `gc_v2_8_sequential_feedback`, `gc_v2_9_custom_reg4_pipeline`, `gc_v2_10_custom_tribuf_wrap`, `gc_v2_11_custom_hc194_wrap`, `gc_v2_12_nested_halfadder_parent`, `gc_v2_13_deep_nested_halfadder_boundary`, `gc_v2_14_mixed_datapath_extended`, and `gc_v2_15_ram_decode_capture_bus`. Four one-level hierarchical/custom-IC HDL paths are now verified via structural flattening, the trace-depth hardening slice has been extended across all landed `gc_v2_*` seeds, the corpus includes a first direct nested-combinational custom-IC golden pass case, it now also carries the first explicit deeper hierarchy exporter boundary as a stable expected_limit regression, it absorbs a larger state-heavy mixed datapath from the focused regression set into the Golden baseline, and it now adds a first larger integrated RAM/decode/bit-select/hold/capture system case. The Golden-Strang ist damit im aktuellen Scope als stabile Pilot-v2-Basis abgeschlossen; weitere Breite oder tiefere Hierarchie sind nur noch optionale Folgeexpansion. The FSM projection/export work is now likewise closed for the current scope: projection metadata, `projectionBatchId`, the central sequential projection helper, static/reduced STT core helpers, explicit clean/legacy/modified/mixed semantics, shared STT/timing panel semantics, early editor/canvas guardrails, and the fixture-backed boundary wall for projected+raw, chained, observer, mixed-islands, shared-observer, and shared-helper cases are in place. The race-panel lifecycle work is now structurally completed for the current scope: store-side pruning, a central manual reset path, signaturbasierte Incident-Dedupe, shared monitor-state helpers, and structure-fingerprint pruning are in place. The API-/Broker path is now likewise closed for the current `API1-01` scope: the visible broker flow `Key -> Chat -> Reset -> Delete` is reducer-backed, manually verified, and covered by local UI smokes for happy path, stale-session recovery, route-specific rate limits, configuration errors, policy blocks, and provider/upstream failures. P1-7 (Focused-Nine UI Audit) remains green at 12 smoke PASS, 5 semantic PASS, 0 semantic WARN. CI still has 6 jobs: quality-gates, contract-runner, golden-corpus, focused-nine-ui, focused-nine-core, hdl-toolchain. Test suite: **1020/1020**. Focused-nine core: **12/12 PASS, 0 tooling warnings**. Remaining open work is now mainly P2: branch protection, CI performance, deeper hierarchy/custom-IC verification, API staging/observability/rollout beyond the now closed local app-flow scope, and a later FSM follow-up via Netzlisten-Minimierung / Bool-Minimierung instead of more current-scope projection groundwork.

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
| MS_JK_FF: master state `qM` not in stateKeys  partially observable only | gate-gap-analysis.md 6 | core-risk |
| BIN_CTR7S/BIN_CTR_99: dual-write of `count` + `cnt0..cnt3`  inconsistency risk | gate-gap-analysis.md 6 | core-risk |

### Resolved Blockers

- **RESOLVED P0 2026-03-07:** Z propagation to downstream inputs is now correct. The sanitization step was removed. TRIBUF, 74HC373, 74HC374, 74HC595 correctly output Z when disabled, and downstream gates see Z (not 0).

### Next Steps

1. Document all model-limit items (no X for metastability, no setup/hold modeling) in user-facing docs
2. Decide whether `qM` in MS_JK_FF should remain hidden or become user-visible metadata
3. Audit remaining non-FF sequential gates for dual-write / hidden-state clarity

**Priority: P2** (model-limit documentation and residual sequential metadata hygiene)

---

## Criterion 2  Cross-Layer Consistency

**Objective:** Simulation model, HDL export, UI state display, and gate contracts should all describe the same behavior. Changes to one layer should not silently break another.

### Current State

The four-value signal model (0/1/Z/X) is now consistent across simulation and HDL export for all focused-nine test cases, and Golden Corpus v1 now adds external HDL syntax/lint plus scenario-based simulation across all non-boundary corpus cases. Basic gate HDL export (AND/OR/NOT etc.) was added in the P0 phase. No exhaustive cross-layer equivalence proof exists yet, but the highest-risk focused-nine and golden-corpus slices now execute against external HDL tools.

### Confirmed Strengths

- Gate contracts (86 files in `validation/contracts/`) document expected behavior independent of implementation
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
| Der aktuelle FSM0-Projektionspfad ist fuer den aktuellen Scope geschlossen; spaetere Folgearbeit bleibt Netzlisten-Minimierung / Bool-Minimierung fuer breite Synthese statt weiterer Grundsemantik | `validation/fsm0/work-package.md` | P2 |
| Race-Panel-Eintraege und Race-Markierungen sind fuer den aktuellen Produktumfang strukturell abgesichert: Incident-Store mit `count`/`firstSeen`/`lastSeen`, gemeinsamer Monitor-State, Reset-/Prune-/Dedupe-Pfad und Struktur-Fingerprint-Pruning sind verifiziert; spaetere Vertiefung bleibt optional | `validation/race-panel-fixes/work-package.md` | abgeschlossen im aktuellen Scope |
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

Verification covers 884/884 vitest tests, 12/12 focused-nine simulation + toolchain cases, 447/447 contract runner cases (0 unsupported cases), and 28/30 golden corpus cases plus 2 expected_limit. Multi-driver behavior is now formally defined and tested. The testability mapping (`testability-mapping.json`) defines 14 test patterns across 18 gate classes (124 required pattern slots). Contract Runner v1 now provides automated behavioral verification across 86 gate contracts. Golden Corpus v1 Runner provides structural, syntax, and scenario-based HDL regression across 30 reference circuits.

### Confirmed Strengths

- Testability mapping is comprehensive and machine-readable
- Gate contracts define precise behavioral expectations with input/output tables
- Focused-nine audit covers 12 high-risk cases  all now pass [CONFIRMED: focused-nine-summary.json]
- Contract Runner v1 verifies 86 gate contracts (447 cases)  447 pass, 0 unsupported [CONFIRMED: contract-runner-summary.json]
- Golden Corpus v1 Runner verifies 30 reference circuits  28 pass, 2 expected_limit [CONFIRMED: golden-corpus-v1-summary.json]
- Risk classes are assigned per-gate, enabling risk-weighted test prioritization
- Multi-driver conflict behavior is now defined and verified: conflicting drivers -> X (3) [CONFIRMED]

### Confirmed Weaknesses

| Issue | Evidence | Severity |
|---|---|---|
| Truth-table / step-sequence automation exists only for contracted gates and golden-corpus structure checks, not for the full gate inventory | contract-runner-summary.json, golden-corpus-v1-summary.json | P2 |
| Forbidden-input-combination not tested for SR_LATCH S=R=1 | testability-mapping.json | P2 |
| 26 documentation-gap entries  gate behavior partially undocumented | gate-gap-analysis.md 10 | P2 |
| Custom ICs remain outside the static contract model | gate-gap-analysis.md 8 | P2 |

### Resolved Blockers

- **RESOLVED P0 2026-03-07:** Multi-driver simulation behavior is now defined: conflicting drivers on the same net resolve to X (3). The `multi_driver_same_input` test confirms conflict detection and X resolution.
- **RESOLVED / EXPANDED 2026-03-20:** Contract Runner v1 executes automatically, runs as a CI gate, and now covers 86 contracts with 447 pass, 0 fail, 0 unsupported. Shared-bus multi-driver conflict cases are now executed for TRIBUF, 74HC373, 74HC374, and RAM256.

### Next Steps

1. Add forbidden-input-combination assertions to SR_LATCH, JK_FF_ASSR, 74HC74 tests
2. Extend the contract model for dynamic custom-IC verification instead of adding more static duplicate specs
3. Broaden multi-driver verification from representative shared-bus fixtures to larger composed circuit scenarios in Golden Corpus v2

**Priority: P2** (further test pattern expansion  Contract Runner v1 and Golden Corpus v1 now operational and in CI)

---

## Criterion 4  External Reference Toolchain

**Objective:** HDL exports should be accepted by industry-standard tools (iverilog, verilator, yosys, ghdl) without errors or suppressible warnings. Output should be synthesizable.

### Current State

All 12 focused-nine cases pass all tools without errors or warnings. Golden Corpus v1 now adds external HDL syntax/lint checks (iverilog, verilator, yosys, ghdl) and scenario-based iverilog/vvp + ghdl simulation for all non-boundary cases. 74HC373 Verilog latch warning resolved via Verilog-2001 export with `/* verilator lint_off LATCH */`...`/* verilator lint_on LATCH */` inline pragmas (P1-1, 2026-03-07), and 74HC283 VHDL arithmetic export now compiles cleanly under GHDL.

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
3. Expand the current golden-corpus HDL scenarios toward larger traces and hierarchical designs
4. Add a read-only sequential projection layer for canonical FSM export semantics, static/reduced STT, and end-to-end timing/STT validation

**Priority: P1/P2** (broader regression automation plus FSM export projection semantics)

---

## Criterion 5  Hierarchy and Large Design Support

**Objective:** The simulator should handle hierarchical designs (custom ICs, subcircuits) and scale to circuits with many gates without correctness degradation.

### Current State

Custom ICs exist (`category=custom`) but were explicitly excluded from the gate contract analysis  they are dynamically registered at runtime and cannot be statically verified. Two hierarchy-specific regression paths now exist via `gc_v2_6_custom_halfadder` and `gc_v2_9_custom_reg4_pipeline`, which verify one-level custom-IC HDL flattening in both combinational and sequential reuse patterns, but broader hierarchy coverage and static contract strategy remain open. Multi-driver bus conflict behavior is now correctly modeled.

### Confirmed Strengths

- Custom IC registration exists in the registry infrastructure [INFERRED from registry code]
- Gate contracts include `hierarchy` section in the schema for documenting subcircuit containment
- Multi-driver conflict on a shared net now correctly produces X  bus topologies are no longer silently wrong [CONFIRMED: focused-nine-summary.json]

### Confirmed Weaknesses

| Issue | Evidence | Severity |
|---|---|---|
| Custom ICs: no contracts, no static analysis possible | gate-gap-analysis.md 8 | P2 |
| Golden Corpus v1 covers 30 circuits and now includes fifteen broader v2 pilot seeds, but hierarchy/custom-IC coverage still remains intentionally narrow beyond the landed direct nested combinational case and the newly documented deeper hierarchy boundary | `golden-corpus-v1.json`  30 reference circuits including `gc_v2_1_mux_fabric` through `gc_v2_15_ram_decode_capture_bus`; four one-level custom-IC HDL paths, a first direct nested combinational custom-IC pass path, one explicit deeper exporter boundary, a promoted larger state-heavy mixed datapath, and a first integrated RAM/decode/bit-select/hold/capture system case are covered, but broader deeper hierarchy remains open | P2 |
| ~~STT variable limit (max 8) blocks state inspection for all ICs with >8 inputs+state~~ | **PARTIALLY RESOLVED (post-P0):** STT now renders a "Reduzierte Ansicht" (reduced view) for wide sequentials  8-64 rows of meaningful data instead of error message | P2 (residual) |
| FSM-Editor-Synthese skaliert strukturell; der aktuelle Projektions-/Boundary-Scope ist abgeschlossen, aber breite Synthese braucht spaeter weiterhin eine verdichtete Netzlistenstufe statt der heutigen Guardrail-Blockade | `validation/fsm0/work-package.md` | P2 |

### Resolved Blockers

- **RESOLVED P0 2026-03-07:** Multi-driver bus conflict now raises X conflict detection. Users see X (unknown/conflict) signal value at conflicting nodes, not a silently-wrong 0 or 1.
- **PARTIALLY RESOLVED (post-P0):** STT reduced view  wide sequential ICs (74HC373, 74HC374, 74HC595, 74HC161, 74HC163, 74HC194, mixed_datapath) now show a partial but useful state table, confirmed in focused-nine UI audit. [CONFIRMED: focused-nine-ui-summary.json 2026-03-07]

### Next Steps

1. Expand Golden Corpus v2 with large (>20 gates) and hierarchical/custom-IC cases
2. Design a dynamic contract verification approach for custom ICs (runtime invariant checking)
3. Extend the STT reduced view to show more configurable input subsets
4. Add a structural FSM-export projection layer so synthesized FSMs expose canonical state/output signals instead of raw helper nets, with a static/reduced STT path separate from live timing

**Priority: P1/P2** (golden corpus expansion, STT improvements, custom IC contracts, FSM export projection semantics)

---

## Criterion 6  Formal Quality Assurance

**Objective:** There should be a defined QA process: reproducible test runs, pass/fail gates, regression tracking, and documented known issues.

### Current State

A CI pipeline exists (`.github/workflows/quality-gates.yml`) with six jobs:
- `quality-gates`  test/build/lint via `run_quality_gates.sh`
- `contract-runner`  Contract Runner v1 (447 pass, 0 fail, 0 unsupported) via `run_contract_runner.sh`
- `golden-corpus`  Golden Corpus v1 Runner (28 pass, 0 fail, 2 expected_limit) via `run_golden_corpus.sh`
- `focused-nine-ui`  12-case browser/UI regression via `run_focused_nine_ui.sh`
- `focused-nine-core`  12-case simulation + HDL-regression via `run_focused_nine_core.sh`
- `hdl-toolchain`  iverilog/ghdl/yosys/verilator presence check via `check_hdl_toolchain.sh`

Contract Runner, Golden Corpus, Focused-Nine UI, and Focused-Nine Core are real blocking CI gates: exit code != 0 fails the job. The contract and corpus scripts validate summary invariants and reject any `failed > 0` result. `expected_limit` in the Golden Corpus (`gc_t2_bus_mux`) does NOT cause CI failure  it documents a known model boundary. All four fachliche jobs upload their reports as CI artifacts.

### Confirmed Strengths

- Focused-nine audit is structured and machine-readable (JSON format)
- Contract Runner v1 provides automated behavioral verification for 86 gate contracts [CONFIRMED: contract-runner-summary.json  447 pass, CI gate]
- Golden Corpus v1 Runner provides structural plus external HDL regression for 30 reference circuits [CONFIRMED: golden-corpus-v1-summary.json  28 pass, 2 expected_limit, CI gate]
- Focused-Nine UI audit is now a CI gate with 12 smoke PASS and 5 semantic PASS [CONFIRMED: focused-nine-ui-summary.json]
- Gap analysis assigns risk classes to all findings
- Testability mapping defines a prioritized test plan (P0/P1/P2/P3)
- Gate contracts provide specification-level acceptance criteria
- vitest: 884/884 pass  test suite is comprehensive for simulation correctness
- CI uploads reports as artifacts for contract-runner, golden-corpus, focused-nine-core, and focused-nine-ui

### Confirmed Weaknesses

| Issue | Evidence | Severity |
|---|---|---|
| Branch protection / required status checks not configured in GitHub Settings | External manual step needed | P2 |
| Golden Corpus HDL verification is scenario-based, not exhaustive across arbitrary traces or large designs | golden-corpus-v1-report.md | P2 |
| Known issues not linked to issue tracker | gate-gap-analysis.md, focused-nine-summary.json | P2 |
| ~~4 defaultInputValues unsafe /OE defaults~~ | **RESOLVED P1b 2026-03-07** | ~~P1~~ done |
| ~~Golden-Corpus v1 exists as artifacts, but no executable runner or CI gate~~ | **RESOLVED P1-6 2026-03-08**  Golden Corpus v1 Runner built and wired into CI | ~~P1~~ done |
| ~~Only focused-nine core in CI; no contract or corpus regression~~ | **RESOLVED P1-6 2026-03-08**  core/contract/corpus regression gates established (later expanded to 6 CI jobs total) | ~~P1~~ done |
| ~~UI timing audit is not yet in CI~~ | **RESOLVED P1-7 2026-03-08**  focused-nine-ui job added; 12 smoke PASS, 5 semantic PASS | ~~P1~~ done |

### Next Steps

1. Configure branch protection rules in GitHub Settings to enforce required status checks
2. Create a known-issues register (structured JSON or GitHub issues) linked from the gap analysis
3. Expand Golden Corpus v2 with larger/hierarchical cases and deeper HDL traces
4. Evaluate CI caching/containerization for HDL tool installation and browser bootstrap

**Priority: P2** (export-determinism, branch protection, issue tracker linkage, CI performance)

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
| ~~P1-5~~ | Contract Runner v1  automated gate contract verification | **DONE / EXPANDED P1-5 2026-03-20**  447 pass, 0 fail, 0 unsupported, in CI |
| ~~P1-6~~ | Golden Corpus v1 Runner + CI expansion | **DONE / EXPANDED P1-6 2026-03-20**  28 pass, 2 expected_limit, live exporter diff + external HDL checks established |
| ~~P1-7~~ | Focused-Nine UI audit as CI gate | **DONE P1-7 2026-03-08**  12 smoke PASS, 5 semantic PASS, 6 CI jobs |

### P1  High Priority

| ID | Issue | Criterion |
|---|---|---|
| ~~P1-4~~ | ~~STT variable limit blocks UI verification for all ICs~~ | **PARTIALLY RESOLVED (post-P0):** Reduced-view renders 8-64 rows for wide ICs  remaining gap is full enumeration |
| P1-8 | FSM export projection semantics missing for STT and timing | Crit 2 / Crit 5 |
| P1-9 | Race panel lifecycle semantics missing for reset, pruning, and dedupe | Crit 6 / Crit 7 |

### P2  Medium Priority (completeness and polish)

| ID | Issue | Criterion |
|---|---|---|
| P2-1 | MS_JK_FF HDL export approximates master-slave as negedge-only | Crit 2 |
| P2-3 | Custom IC (category=custom) contracts  no static verification strategy | Crit 5 |
| P2-5 | 26 documentation-gap items in gate inventory | Crit 7 |
| P2-6 | Branch protection / required status checks not configured (GitHub Settings) | Crit 6 |
| P2-7 | Golden Corpus v2 expansion  large/hierarchical circuits, broader HDL coverage | Crit 5 |

---

## Raw Data References

| File | Contents |
|---|---|
| `validation/focused-nine-summary.json` | 12 simulation+toolchain test results (12/12 PASS, 0 tooling warnings) |
| `validation/focused-nine-ui-summary.json` | UI and STT audit results (12/12 smoke PASS, 5 semantic PASS, 0 semantic WARN) |
| `validation/contract-runner-summary.json` | Contract Runner v1 results (447 pass, 0 fail, 0 unsupported, 447 total) |
| `validation/golden-corpus-v1-summary.json` | Golden Corpus v1 results (28 pass, 0 fail, 2 expected_limit, 30 total) |
| `validation/golden-corpus-v1.json` | 24 Golden-Corpus-v1 reference circuits with class, checkpoints, rationale |
| `validation/golden-corpus-v1.md` | Human-readable description of the 24 Golden-Corpus-v1 circuits |
| `validation/gate-gap-analysis.md` | Full gap analysis (11 sections, 323 lines) |
| `validation/gate-inventory.json` | All 83 gate entries with metadata |
| `validation/testability-mapping.json` | 18 gate classes, 14 test patterns, 124 slots |
| `validation/contracts/*.json` | 86 gate contracts |
| `validation/gate-contract-schema.json` | JSON Schema for gate contracts |
| `.github/workflows/quality-gates.yml` | CI pipeline  6 jobs: quality-gates, contract-runner, golden-corpus, focused-nine-ui, focused-nine-core, hdl-toolchain |
