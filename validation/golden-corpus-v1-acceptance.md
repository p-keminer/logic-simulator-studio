# Golden Corpus v1 Acceptance

**Verified on:** 2026-03-07
**Purpose:** Define the accepted baseline for Golden Corpus v1 before the executable runner is integrated.

## Current Accepted State

- `validation/golden-corpus-v1.json` is valid JSON.
- `validation/golden-corpus-v1.md` matches the real artifact layout.
- Golden Corpus v1 currently exists as a stored regression corpus, not yet as an executed regression gate.
- The canonical status in repo docs is now:
  - Golden Corpus v1 exists
  - Golden Corpus v1 is not yet automatically executed
  - Golden Corpus v1 is not yet wired into CI

## Completeness Checks

| Check | Expected | Verified |
|---|---:|---:|
| Corpus index entries | 12 | 12 |
| Stored circuit files (`.lgsc.json`) | 12 | 12 |
| Verilog exports (`.v`) | 12 | 12 |
| VHDL exports (`.vhd`) | 12 | 12 |
| Slug to file mapping | exact 1:1 | pass |
| JSON parseability | valid | pass |

## Verified Coverage

| Class | Count | Slugs |
|---|---:|---|
| combinational | 3 | `gc_c1_basic_gates`, `gc_c2_half_adder`, `gc_c3_sr_latch` |
| sequential | 4 | `gc_s1_dff_assr`, `gc_s2_jkff_toggle`, `gc_s3_74hc74`, `gc_s4_reg4_enable` |
| tristate | 2 | `gc_t1_tribuf_direct`, `gc_t2_bus_mux` |
| mixed | 3 | `gc_m1_dff_chain`, `gc_m2_283_adder`, `gc_m3_counter_gate` |

## Known Boundaries

- `gc_t2_bus_mux` is intentionally documented as an exporter limitation / expected model boundary.
- Golden Corpus v1 is a baseline regression corpus, not a replacement for `focused-nine`.
- `focused-nine` remains the high-risk suite.
- Golden Corpus v1 is the basis-regression suite that still needs an executable runner.

## Runner Acceptance Criteria

When the runner lands, it should be accepted against this corpus only if all of the following hold:

1. All 12 corpus entries are discovered from `validation/golden-corpus-v1.json`.
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
6. The runner must not reclassify Golden Corpus v1 as "fully CI-covered" until CI wiring exists.

## Non-Goals For v1 Acceptance

- No requirement yet for full UI replay.
- No requirement yet for full external HDL differential simulation on every corpus case.
- No requirement yet for corpus execution inside CI on this acceptance step.

## Relationship To Canonical Docs

The following files should remain consistent with this acceptance baseline:

- `validation/README.md`
- `validation/maturity-gap-dashboard.md`
- `validation/maturity-priority-list.json`
- `validation/industry-lite-roadmap.md`
- `validation/golden-corpus-v1.md`
- `validation/golden-corpus-v1.json`
