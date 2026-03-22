# Golden Corpus v1

**Created:** 2026-03-07
**Updated:** 2026-03-22
**Status:** executable baseline - 30 circuits, each with `.lgsc.json` + `.v` + `.vhd`

## Overview

Golden Corpus v1 is the broader HDL and simulator regression baseline for LogicSim.
It is intentionally wider than `focused-nine`, but still compact enough to run in CI.

Current class coverage:

| Class | Count | Slugs |
|---|---:|---|
| combinational | 7 | `gc_c1_basic_gates`, `gc_c2_half_adder`, `gc_c3_sr_latch`, `gc_v2_1_mux_fabric`, `gc_v2_6_custom_halfadder`, `gc_v2_12_nested_halfadder_parent`, `gc_v2_13_deep_nested_halfadder_boundary` |
| sequential | 9 | `gc_s1_dff_assr`, `gc_s2_jkff_toggle`, `gc_s3_74hc74`, `gc_s4_reg4_enable`, `gc_s5_dff_basic`, `gc_s7_hc161_vs_hc163`, `gc_s8_hc194_modes`, `gc_v2_8_sequential_feedback`, `gc_v2_11_custom_hc194_wrap` |
| tristate | 3 | `gc_t1_tribuf_direct`, `gc_t2_bus_mux`, `gc_v2_10_custom_tribuf_wrap` |
| mixed | 11 | `gc_m1_dff_chain`, `gc_m2_283_adder`, `gc_m3_counter_gate`, `gc_v2_2_datapath_slice`, `gc_v2_3_shift_pipeline`, `gc_v2_4_ram_readback`, `gc_v2_5_decode_tree`, `gc_v2_7_bus_conflict_system`, `gc_v2_9_custom_reg4_pipeline`, `gc_v2_14_mixed_datapath_extended`, `gc_v2_15_ram_decode_capture_bus` |

## Artifact Layout

```
validation/generated-circuits-golden/   - 30 x .lgsc.json
validation/generated-exports-golden/    - 30 x .v + 30 x .vhd
validation/golden-corpus-v1.json        - machine-readable corpus index
validation/run-golden-corpus-v1.mjs     - executable runner
validation/golden-corpus-v1-summary.json
validation/golden-corpus-v1-report.md
```

## What The Runner Verifies

For each corpus entry the runner checks:

1. circuit/export files exist and parse
2. slug-to-file mapping stays exact
3. expected gate types, inputs, and outputs are present
4. Verilog/VHDL structural checkpoints still match
5. external HDL syntax/lint passes in iverilog, verilator, yosys, and ghdl
6. scenario-based external Verilog and VHDL simulation still matches the documented behavior
7. live re-exported Verilog/VHDL still matches the stored golden artifacts byte-for-byte

## Circuit Inventory

### Combinational

| Slug | Focus |
|---|---|
| `gc_c1_basic_gates` | AND/OR/NOT propagation through a small DAG |
| `gc_c2_half_adder` | XOR + AND fan-out with dual outputs |
| `gc_c3_sr_latch` | cross-coupled NOR latch and intentional combinational loop |
| `gc_v2_1_mux_fabric` | wider mux hierarchy using `74HC151` + `74HC153` |
| `gc_v2_6_custom_halfadder` | first custom-IC hierarchy case: `gc_c2_half_adder` wrapped and re-used inside a full-adder path, compared against a raw-gate oracle |
| `gc_v2_12_nested_halfadder_parent` | first direct nested custom-IC corpus case: a parent custom IC wraps a registered half-adder and is checked against a raw OR oracle |
| `gc_v2_13_deep_nested_halfadder_boundary` | first deeper hierarchy boundary case: a grandparent custom IC wraps the already nested parent and must stay HDL-blocked under the current rollout |

### Sequential

| Slug | Focus |
|---|---|
| `gc_s1_dff_assr` | D-FF with async set/reset priority |
| `gc_s2_jkff_toggle` | JK toggle mode |
| `gc_s3_74hc74` | dual D-FF with async preset/clear |
| `gc_s4_reg4_enable` | REG4 load/hold behavior |
| `gc_s5_dff_basic` | plain D-FF with `Q` and `Qn` |
| `gc_s7_hc161_vs_hc163` | async-vs-sync clear distinction |
| `gc_s8_hc194_modes` | all four `74HC194` operating modes |
| `gc_v2_11_custom_hc194_wrap` | custom-IC wrapper around `74HC194` with preserved hidden register state and one-level flattening |
| `gc_v2_8_sequential_feedback` | three-stage feedback mesh with seed-load mode and XOR feedback evolution over multiple clocks |

### Tristate

| Slug | Focus |
|---|---|
| `gc_t1_tribuf_direct` | single tri-state output with clean `Z` behavior |
| `gc_t2_bus_mux` | documented exporter boundary for a two-driver bus |
| `gc_v2_10_custom_tribuf_wrap` | custom-IC wrapper around `TRIBUF` with preserved high-impedance export semantics |

### Mixed

| Slug | Focus |
|---|---|
| `gc_m1_dff_chain` | two-stage sequential pipeline |
| `gc_m2_283_adder` | `74HC283` arithmetic export and five-output mapping |
| `gc_m3_counter_gate` | counter feeding combinational detect logic |
| `gc_v2_2_datapath_slice` | ALU + register + phase counter datapath |
| `gc_v2_3_shift_pipeline` | `74HC194 -> 74HC595` multi-cycle shift/latch pipeline with `OE` isolation |
| `gc_v2_4_ram_readback` | `RAM256 -> bus -> REG8` readback chain |
| `gc_v2_5_decode_tree` | `74HC138 -> 74HC148` decode/encode tree with `74HC373` hold tap and `74HC374` capture |
| `gc_v2_7_bus_conflict_system` | larger shared-bus contention monitor with stable shadow/decode outputs |
| `gc_v2_9_custom_reg4_pipeline` | two-stage reusable `REG4` custom-IC pipeline with raw XOR comparison tap |
| `gc_v2_14_mixed_datapath_extended` | larger mixed datapath promoted from focused regression: `BIN_CTR7S -> ALU4 -> REG4` over reset, hold and mode changes |
| `gc_v2_15_ram_decode_capture_bus` | integrated memory/decode system: `RAM256 -> live bus + 74HC151` with `74HC138` status, `74HC373` hold, and `REG4` capture |

## Known Boundary

`gc_t2_bus_mux` and `gc_v2_13_deep_nested_halfadder_boundary` are intentionally classified as `expected_limit`.
They document the current exporter boundaries for:
- a multi-driver tri-state bus with last-wire-wins output-port assignment
- deeper-than-direct nested custom-IC HDL export beyond the current rollout limit

Both cases are expected to stay out of the clean-pass bucket until the respective model boundary changes.

## V2 Pilot Seeds Already Landed

The following Golden Corpus v2 pilot seeds are now part of the accepted v1 baseline:

- `gc_v2_1_mux_fabric`
- `gc_v2_2_datapath_slice`
- `gc_v2_3_shift_pipeline`
- `gc_v2_4_ram_readback`
- `gc_v2_5_decode_tree`
- `gc_v2_6_custom_halfadder`
- `gc_v2_7_bus_conflict_system`
- `gc_v2_8_sequential_feedback`
- `gc_v2_9_custom_reg4_pipeline`
- `gc_v2_10_custom_tribuf_wrap`
- `gc_v2_11_custom_hc194_wrap`
- `gc_v2_12_nested_halfadder_parent`
- `gc_v2_13_deep_nested_halfadder_boundary`
- `gc_v2_14_mixed_datapath_extended`
- `gc_v2_15_ram_decode_capture_bus`

Together they extend v1 beyond the original medium-sized cases into:

- wider combinational selector fabrics
- multi-block datapaths with temporal behavior
- shift/latch pipelines with explicit latch isolation and `OE` tri-state behavior
- memory-to-register integration
- decode/encode trees with independent latch and edge-capture observation
- one-level custom-IC hierarchy with structural HDL flattening and raw-oracle comparison
- direct nested combinational custom-IC hierarchy with recursive structural flattening
- deeper nested custom-IC hierarchy as an explicit blocked exporter boundary instead of an undocumented failure mode
- a larger state-heavy mixed datapath with a longer multi-cycle sequence across counter, ALU and register
- one-level custom-IC hierarchy with preserved tri-state/Z semantics
- one-level custom-IC hierarchy with hidden sequential register state and extra HDL declarations
- larger shared-bus conflict semantics
- an integrated RAM/decode/bit-select/hold/capture system path instead of only isolated RAM, decode and bus subcases
- multi-cycle sequential feedback meshes with explicit seed-load and XOR feedback behavior
- sequential custom-IC pipelines with enable/reset propagation and staged comparison taps

## Relationship To Focused-Nine

`focused-nine` remains the concentrated high-risk suite.
Golden Corpus v1 complements it by providing:

- broader class coverage
- more artifact determinism checks
- more scenario-based HDL regression cases
- a place to grow larger composed reference circuits incrementally

## Next Expansion Targets

The next logical Golden Corpus v2 growth steps are:

- trace-depth hardening has now been extended across all landed v2 pilot seeds;
  the corpus no longer relies on only short smoke traces for the fifteen
  `gc_v2_*` reference cases
- acceptance/report hardening so the expanded corpus stays interpretable as it grows
- broader and deeper HDL traces on especially large or stateful v2 seeds
- deeper hierarchy/custom-IC cases beyond the now landed direct nested combinational path, the new deeper blocked boundary, and the four one-level flattening paths
