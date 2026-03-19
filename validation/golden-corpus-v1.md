# Golden Corpus v1

**Created:** 2026-03-07
**Updated:** 2026-03-19
**Status:** executable baseline - 24 circuits, each with `.lgsc.json` + `.v` + `.vhd`

## Overview

Golden Corpus v1 is the broader HDL and simulator regression baseline for LogicSim.
It is intentionally wider than `focused-nine`, but still compact enough to run in CI.

Current class coverage:

| Class | Count | Slugs |
|---|---:|---|
| combinational | 5 | `gc_c1_basic_gates`, `gc_c2_half_adder`, `gc_c3_sr_latch`, `gc_v2_1_mux_fabric`, `gc_v2_6_custom_halfadder` |
| sequential | 8 | `gc_s1_dff_assr`, `gc_s2_jkff_toggle`, `gc_s3_74hc74`, `gc_s4_reg4_enable`, `gc_s5_dff_basic`, `gc_s7_hc161_vs_hc163`, `gc_s8_hc194_modes`, `gc_v2_8_sequential_feedback` |
| tristate | 2 | `gc_t1_tribuf_direct`, `gc_t2_bus_mux` |
| mixed | 9 | `gc_m1_dff_chain`, `gc_m2_283_adder`, `gc_m3_counter_gate`, `gc_v2_2_datapath_slice`, `gc_v2_3_shift_pipeline`, `gc_v2_4_ram_readback`, `gc_v2_5_decode_tree`, `gc_v2_7_bus_conflict_system`, `gc_v2_9_custom_reg4_pipeline` |

## Artifact Layout

```
validation/generated-circuits-golden/   - 24 x .lgsc.json
validation/generated-exports-golden/    - 24 x .v + 24 x .vhd
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
| `gc_v2_8_sequential_feedback` | three-stage feedback mesh with seed-load mode and XOR feedback evolution over multiple clocks |

### Tristate

| Slug | Focus |
|---|---|
| `gc_t1_tribuf_direct` | single tri-state output with clean `Z` behavior |
| `gc_t2_bus_mux` | documented exporter boundary for a two-driver bus |

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

## Known Boundary

`gc_t2_bus_mux` is intentionally classified as `expected_limit`.
It documents the current exporter boundary for a multi-driver tri-state bus with last-wire-wins output-port assignment.
This case is expected to stay out of the clean-pass bucket until the exporter model changes.

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

Together they extend v1 beyond the original medium-sized cases into:

- wider combinational selector fabrics
- multi-block datapaths with temporal behavior
- shift/latch pipelines with explicit latch isolation and `OE` tri-state behavior
- memory-to-register integration
- decode/encode trees with independent latch and edge-capture observation
- one-level custom-IC hierarchy with structural HDL flattening and raw-oracle comparison
- larger shared-bus conflict semantics
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

- broader and deeper HDL traces on the landed v2 seeds
- deeper or nested hierarchy/custom-IC cases beyond the two landed one-level flattening paths
