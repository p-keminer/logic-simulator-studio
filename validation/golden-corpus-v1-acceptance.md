# Golden Corpus v1 Acceptance

**Verified on:** 2026-03-19 (post-expansion verification run)
**Purpose:** Define the accepted baseline for Golden Corpus v1 after the v1.8.0 corpus expansion and runner verification.

## Current Accepted State

- `validation/golden-corpus-v1.json` is valid JSON.
- `validation/golden-corpus-v1.md` matches the real artifact layout.
- Golden Corpus v1 exists as an executed regression gate.
- **P2-4 Export-Determinism ACTIVE (runner v1.8.0):** live `generateVerilog()` / `generateVHDL()` re-export + diff checks run against the stored golden artifacts.
- **External HDL verification ACTIVE (runner v1.8.0):** iverilog, verilator, yosys, and ghdl syntax/lint checks plus scenario-based iverilog/vvp and ghdl simulations run for all non-boundary corpus cases.
- All 48 golden HDL exports are regenerated from the real exporter baseline and verified byte-exact by the live diff gate.
- The nine v2 pilot seeds `gc_v2_1_mux_fabric`, `gc_v2_2_datapath_slice`, `gc_v2_3_shift_pipeline`, `gc_v2_4_ram_readback`, `gc_v2_5_decode_tree`, `gc_v2_6_custom_halfadder`, `gc_v2_7_bus_conflict_system`, `gc_v2_8_sequential_feedback`, and `gc_v2_9_custom_reg4_pipeline` are now part of the accepted baseline.
- `gc_v2_6_custom_halfadder` and `gc_v2_9_custom_reg4_pipeline` establish two accepted one-level custom-IC hierarchy paths and verify HDL export via structural flattening of registered custom ICs.
- The canonical status in repo docs is now:
  - Golden Corpus v1 exists
  - Golden Corpus v1 is automatically executed
  - Golden Corpus v1 is wired into CI
  - Golden Corpus v1 runner v1.8.0 has live re-export + byte-accurate diff gating
  - Golden Corpus v1 runner v1.8.0 has external HDL syntax/lint + scenario-based simulation coverage

## Completeness Checks

| Check | Expected | Verified |
|---|---:|---:|
| Corpus index entries | 24 | 24 |
| Stored circuit files (`.lgsc.json`) | 24 | 24 |
| Verilog exports (`.v`) | 24 | 24 |
| VHDL exports (`.vhd`) | 24 | 24 |
| Slug to file mapping | exact 1:1 | pass |
| JSON parseability | valid | pass |

## Verified Coverage

| Class | Count | Slugs |
|---|---:|---|
| combinational | 5 | `gc_c1_basic_gates`, `gc_c2_half_adder`, `gc_c3_sr_latch`, `gc_v2_1_mux_fabric`, `gc_v2_6_custom_halfadder` |
| sequential | 8 | `gc_s1_dff_assr`, `gc_s2_jkff_toggle`, `gc_s3_74hc74`, `gc_s4_reg4_enable`, `gc_s5_dff_basic`, `gc_s7_hc161_vs_hc163`, `gc_s8_hc194_modes`, `gc_v2_8_sequential_feedback` |
| tristate | 2 | `gc_t1_tribuf_direct`, `gc_t2_bus_mux` |
| mixed | 9 | `gc_m1_dff_chain`, `gc_m2_283_adder`, `gc_m3_counter_gate`, `gc_v2_2_datapath_slice`, `gc_v2_3_shift_pipeline`, `gc_v2_4_ram_readback`, `gc_v2_5_decode_tree`, `gc_v2_7_bus_conflict_system`, `gc_v2_9_custom_reg4_pipeline` |

## Known Boundaries

- `gc_t2_bus_mux` remains intentionally classified as `expected_limit`.
- Golden Corpus v1 is a baseline regression corpus, not a replacement for `focused-nine`.
- `focused-nine` remains the concentrated high-risk suite.
- Golden Corpus v1 is the broader basis-regression suite and now runs as a CI-backed regression gate with live exporter diffs and external HDL verification.

## Runner Acceptance Criteria

Golden Corpus v1 is accepted against this corpus only if all of the following hold:

1. All 24 corpus entries are discovered from `validation/golden-corpus-v1.json`.
2. Every discovered slug resolves to:
   - one circuit file
   - one Verilog export
   - one VHDL export
3. The runner distinguishes clearly between:
   - `pass`
   - `expected_limit`
   - `unsupported`
   - `fail`
4. `gc_t2_bus_mux` must not be silently reported as a normal clean pass if the known exporter limitation is still present.
5. The runner output must be deterministic enough for CI classification.
6. The runner must preserve the known `expected_limit` classification in CI and local runs.

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
