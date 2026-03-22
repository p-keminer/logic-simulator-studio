# Golden Corpus v1 Acceptance

**Verified on:** 2026-03-22 (post integrated RAM/decode/bus Golden run)
**Purpose:** Define the accepted baseline for Golden Corpus v1 after the v1.9.0 corpus expansion and runner verification.

## Current Accepted State

- `validation/golden-corpus-v1.json` is valid JSON.
- `validation/golden-corpus-v1.md` matches the real artifact layout.
- `validation/golden-corpus-v1-acceptance.json` is now generated from the same runner pass as summary and report, so the machine-readable acceptance baseline no longer drifts independently.
- Golden Corpus v1 exists as an executed regression gate.
- **P2-4 Export-Determinism ACTIVE (runner v1.9.0):** live `generateVerilog()` / `generateVHDL()` re-export + diff checks run against the stored golden artifacts.
- **External HDL verification ACTIVE (runner v1.9.0):** iverilog, verilator, yosys, and ghdl syntax/lint checks plus scenario-based iverilog/vvp and ghdl simulations run for all non-boundary corpus cases.
- All 60 golden HDL exports are regenerated from the real exporter baseline and verified byte-exact by the live diff gate.
- The fifteen v2 pilot seeds `gc_v2_1_mux_fabric`, `gc_v2_2_datapath_slice`, `gc_v2_3_shift_pipeline`, `gc_v2_4_ram_readback`, `gc_v2_5_decode_tree`, `gc_v2_6_custom_halfadder`, `gc_v2_7_bus_conflict_system`, `gc_v2_8_sequential_feedback`, `gc_v2_9_custom_reg4_pipeline`, `gc_v2_10_custom_tribuf_wrap`, `gc_v2_11_custom_hc194_wrap`, `gc_v2_12_nested_halfadder_parent`, `gc_v2_13_deep_nested_halfadder_boundary`, `gc_v2_14_mixed_datapath_extended`, and `gc_v2_15_ram_decode_capture_bus` are now part of the accepted baseline.
- `gc_v2_6_custom_halfadder`, `gc_v2_9_custom_reg4_pipeline`, `gc_v2_10_custom_tribuf_wrap`, and `gc_v2_11_custom_hc194_wrap` establish four accepted one-level custom-IC hierarchy paths; `gc_v2_12_nested_halfadder_parent` adds the first direct nested-combinational pass case, and `gc_v2_13_deep_nested_halfadder_boundary` adds the first explicitly accepted deeper hierarchy boundary case.
- `gc_v2_15_ram_decode_capture_bus` adds the first larger integrated RAM/decode/bit-select/hold/capture system case, so bus-, memory- and decode-semantics are no longer only covered as separate subcases.
- Partial `--slug` runs must not overwrite the canonical acceptance/report artifacts; they are now forced into no-write mode so targeted debugging cannot silently poison the repo baseline.
- The canonical status in repo docs is now:
  - Golden Corpus v1 exists
  - Golden Corpus v1 is automatically executed
  - Golden Corpus v1 is wired into CI
  - Golden Corpus v1 runner v1.9.0 has live re-export + byte-accurate diff gating
  - Golden Corpus v1 runner v1.9.0 has external HDL syntax/lint + scenario-based simulation coverage

## Completeness Checks

| Check | Expected | Verified |
|---|---:|---:|
| Corpus index entries | 30 | 30 |
| Stored circuit files (`.lgsc.json`) | 30 | 30 |
| Verilog exports (`.v`) | 30 | 30 |
| VHDL exports (`.vhd`) | 30 | 30 |
| Slug to file mapping | exact 1:1 | pass |
| JSON parseability | valid | pass |

## Verified Coverage

| Class | Count | Slugs |
|---|---:|---|
| combinational | 7 | `gc_c1_basic_gates`, `gc_c2_half_adder`, `gc_c3_sr_latch`, `gc_v2_1_mux_fabric`, `gc_v2_6_custom_halfadder`, `gc_v2_12_nested_halfadder_parent`, `gc_v2_13_deep_nested_halfadder_boundary` |
| sequential | 9 | `gc_s1_dff_assr`, `gc_s2_jkff_toggle`, `gc_s3_74hc74`, `gc_s4_reg4_enable`, `gc_s5_dff_basic`, `gc_s7_hc161_vs_hc163`, `gc_s8_hc194_modes`, `gc_v2_8_sequential_feedback`, `gc_v2_11_custom_hc194_wrap` |
| tristate | 3 | `gc_t1_tribuf_direct`, `gc_t2_bus_mux`, `gc_v2_10_custom_tribuf_wrap` |
| mixed | 11 | `gc_m1_dff_chain`, `gc_m2_283_adder`, `gc_m3_counter_gate`, `gc_v2_2_datapath_slice`, `gc_v2_3_shift_pipeline`, `gc_v2_4_ram_readback`, `gc_v2_5_decode_tree`, `gc_v2_7_bus_conflict_system`, `gc_v2_9_custom_reg4_pipeline`, `gc_v2_14_mixed_datapath_extended`, `gc_v2_15_ram_decode_capture_bus` |

## Known Boundaries

- `gc_t2_bus_mux` remains intentionally classified as `expected_limit`.
- `gc_v2_13_deep_nested_halfadder_boundary` remains intentionally classified as `expected_limit`.
- Golden Corpus v1 is a baseline regression corpus, not a replacement for `focused-nine`.
- `focused-nine` remains the concentrated high-risk suite.
- Golden Corpus v1 is the broader basis-regression suite and now runs as a CI-backed regression gate with live exporter diffs and external HDL verification.

## Runner Acceptance Criteria

Golden Corpus v1 is accepted against this corpus only if all of the following hold:

1. All 30 corpus entries are discovered from `validation/golden-corpus-v1.json`.
2. Every discovered slug resolves to:
   - one circuit file
   - one Verilog export
   - one VHDL export
3. The runner distinguishes clearly between:
   - `pass`
   - `expected_limit`
   - `unsupported`
   - `fail`
4. `gc_t2_bus_mux` and `gc_v2_13_deep_nested_halfadder_boundary` must not be silently reported as normal clean passes while their known exporter limitations are still present.
5. The runner output must be deterministic enough for CI classification.
6. The runner must preserve the known `expected_limit` classification in CI and local runs.

## Scope Decision

Golden Corpus v2 is **accepted as closed in the current scope**.

Reasoning against the official expansion plan:

| Expansion Requirement | Current Decision | Notes |
|---|---|---|
| Trace-depth hardening on landed v2 seeds | closed | Hardened across all landed `gc_v2_*` seeds |
| Larger system breadth | closed in current scope | Covered by `gc_v2_14_mixed_datapath_extended` and `gc_v2_15_ram_decode_capture_bus` |
| Hierarchy beyond one-level | closed in current scope with explicit boundary | Direct nested pass exists; deeper hierarchy remains documented as `expected_limit`, not as a hidden gap |
| Bus/memory/conflict semantics on system level | closed in current scope | Shared-bus conflict, RAM readback, decode tree, and integrated RAM/decode/capture are present in the executable corpus |
| Stable acceptance/reporting gate | closed | Summary, report, and machine-readable acceptance are generated together; partial slug runs cannot overwrite canonical artifacts |

Optional later expansion remains valid, but it is no longer part of the
current required acceptance scope:

- broader large-system seeds beyond the current v2 pilot group
- deeper reusable hierarchy pass cases beyond the documented boundary case
- further trace-depth growth for future larger/state-heavier designs

## Non-Goals For v1 Acceptance

- No requirement yet for full UI replay.
- No requirement yet for exhaustive external HDL differential simulation on every possible trace.
- No requirement yet for full branch-protection enforcement in GitHub Settings on this acceptance step.

## Relationship To Canonical Docs

The following files should remain consistent with this acceptance baseline:

- `validation/README.md`
- `validation/maturity-gap-dashboard.md`
- `validation/maturity-priority-list.json`
- `validation/industry-lite-roadmap.md`
- `validation/golden-corpus-v1.md`
- `validation/golden-corpus-v1.json`
