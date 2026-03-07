# Golden Corpus Plan â€” Reference Circuits

**Project:** logic-gate-simulator
**Generated:** 2026-03-07
**Purpose:** Define 25 reference circuits that together exercise the full simulator surface area. Each circuit, once implemented, serves as a regression target: given a set of input vectors, the simulation outputs and HDL export text should match the recorded golden values.

---

## Overview

The golden corpus is organized into five tracks. Each circuit has:
- A unique ID
- A brief description
- A list of gate types used (to confirm coverage)
- Key test vectors (not exhaustive â€” focused on boundary conditions and failure modes)
- HDL export expectations
- A note if the circuit tests a known gap or blocker

**Total circuits planned: 25**

---

## Track 1 â€” Combinational Circuits (7 circuits)

### GC-C1: Two-input AND/OR/NAND/NOR/XOR/XNOR cascade

**Description:** A linear chain of six basic logic gates where the output of each feeds the next input. Tests that combinational propagation through multiple gates is correct and that HDL export works for all basic gate types.

**Gates:** AND, OR, NAND, NOR, XOR, XNOR, INPUT_SWITCH (Ã—2), OUTPUT_LED

**Test vectors:**
- A=0, B=0 â†’ trace expected output at each stage
- A=0, B=1 â†’ trace each stage
- A=1, B=0 â†’ trace each stage
- A=1, B=1 â†’ trace each stage

**HDL expectation:** Verilog export must parse without errors (iverilog). All six basic gates must appear as `assign` statements. *This circuit will fail HDL export until P0-4 is fixed (basic gates missing toVerilog).*

**Gap coverage:** P0-4

---

### GC-C2: 4-to-1 MUX built from NAND gates

**Description:** A 4:1 multiplexer constructed manually from NAND gates. Tests multi-level combinational propagation and NAND gate HDL export. Result should match MUX4 golden output for the same input vectors.

**Gates:** NAND (Ã—12), INPUT_SWITCH (Ã—6: A, B, C, D, S0, S1), OUTPUT_LED

**Test vectors:**
- S=00: output = A for all A values
- S=01: output = B for all B values
- S=10: output = C for all C values
- S=11: output = D for all D values

**HDL expectation:** Synthesizes to a clean MUX in yosys. No combinational loops.

**Gap coverage:** NAND truth-table, MUX logic verification

---

### GC-C3: 74HC138 3-to-8 decoder with enable gating

**Description:** Tests 74HC138 with all 8 input combinations and both active-low enable inputs (/G2A, /G2B). Verifies that disabling G1 or asserting /G2A or /G2B forces all outputs HIGH.

**Gates:** 74HC138, INPUT_SWITCH (Ã—5), OUTPUT_LED (Ã—8)

**Test vectors:**
- G1=1, /G2A=0, /G2B=0, A/B/C=0..7 â†’ one output LOW each
- G1=0, any A/B/C â†’ all outputs HIGH
- G1=1, /G2A=1, any â†’ all outputs HIGH
- G1=1, /G2B=1, any â†’ all outputs HIGH

**HDL expectation:** Verilog and VHDL parse and elaborate cleanly. Yosys synthesis produces a decoder.

**Gap coverage:** 74HC138 defaultInputValues for /G2A, /G2B

---

### GC-C4: 4-bit comparator (CMP4) test

**Description:** Exhaustive test of CMP4 with A=0..15 and B=0..15. Verifies LT, EQ, GT outputs are mutually exclusive and correct for all 256 combinations.

**Gates:** CMP4, INPUT_SWITCH (Ã—8: A3..A0, B3..B0), OUTPUT_LED (Ã—3: LT, EQ, GT)

**Test vectors:**
- A=0, B=0 â†’ EQ=1, LT=0, GT=0
- A=0, B=1 â†’ LT=1, EQ=0, GT=0
- A=15, B=0 â†’ GT=1, EQ=0, LT=0
- A=7, B=7 â†’ EQ=1
- A=8, B=7 â†’ GT=1

**HDL expectation:** Verilog and VHDL export cleanly.

**Gap coverage:** CMP4 arithmetic correctness

---

### GC-C5: ALU4 all-opcodes test

**Description:** Tests all 8 ALU opcodes with selected A/B values. Verifies carry-out (Cout) is correct for addition overflow.

**Gates:** ALU4, INPUT_SWITCH (Ã—9: A3..A0, B3..B0, Cin, OP2..OP0), OUTPUT_LED (Ã—5: S3..S0, Cout)

**Test vectors (one per opcode):**
- OP=000 (AND): A=0xA, B=0x5 â†’ S=0x0
- OP=001 (OR): A=0xA, B=0x5 â†’ S=0xF
- OP=010 (XOR): A=0xA, B=0x5 â†’ S=0xF
- OP=011 (NOT A): A=0xA â†’ S=0x5
- OP=100 (ADD): A=0x8, B=0x8, Cin=0 â†’ S=0x0, Cout=1 (overflow)
- OP=101 (SUB A-B): A=0x5, B=0x3 â†’ S=0x2
- OP=110 (SHL): A=0x5 â†’ S=0xA
- OP=111 (SHR): A=0xA â†’ S=0x5

**HDL expectation:** Verilog parses (iverilog). VHDL must not fail with `&` operator issue after P0-3 fix.

**Gap coverage:** P0-3 (ALU4 VHDL `&` operator)

---

### GC-C6: Bus SPLIT4 and SPLIT8 round-trip

**Description:** Feed a 4-bit bus into SPLIT4 and verify individual outputs. Then merge four inputs into a bus via SPLIT4 in reverse. Tests bit ordering.

**Gates:** SPLIT4, INPUT_SWITCH (Ã—4), OUTPUT_LED (Ã—4)

**Test vectors:**
- Bus=0b1010 â†’ bit3=1, bit2=0, bit1=1, bit0=0
- Bus=0b0000 â†’ all 0
- Bus=0b1111 â†’ all 1
- Bus=0b0001 â†’ only bit0=1

**HDL expectation:** Verilog uses a single `assign {b3,b2,b1,b0} = bus;`.

**Gap coverage:** SPLIT4/SPLIT8 bit ordering, bus helper contracts

---

### GC-C7: SCHMITT trigger characteristic

**Description:** Verify SCHMITT behaves as an inverting buffer (since hysteresis is not modeled). Documents the model-limit explicitly.

**Gates:** SCHMITT, INPUT_SWITCH, OUTPUT_LED

**Test vectors:**
- In=0 â†’ Out=1
- In=1 â†’ Out=0

**Note:** This circuit confirms the model-limit: SCHMITT does not simulate hysteresis. The expected output is inverter behavior.

**HDL expectation:** Verilog/VHDL export cleanly.

**Gap coverage:** SCHMITT model-limit documentation

---

## Track 2 â€” Sequential Circuits (8 circuits)

### GC-S1: D flip-flop basic clocking

**Description:** The most fundamental sequential test. Verify that D is sampled only at CLK rising edge.

**Gates:** D_FF, INPUT_SWITCH (Ã—2: D, CLK), OUTPUT_LED (Ã—2: Q, Qn)

**Test vectors (clock step sequence):**
1. D=1, CLK=0 â†’ Q=0 (no edge)
2. D=1, CLK=1 â†’ Q=1 (rising edge, D captured)
3. D=0, CLK=1 â†’ Q=1 (no edge â€” still high)
4. D=0, CLK=0 â†’ Q=1 (falling edge â€” no change)
5. D=0, CLK=1 â†’ Q=0 (rising edge, D=0 captured)

**HDL expectation:** `always @(posedge clk)` structure in Verilog.

**Gap coverage:** D_FF clock-edge-detection, hold-state

---

### GC-S2: JK flip-flop all input combinations

**Description:** Tests all four JK input combinations at CLK rising edge: hold (00), reset (01), set (10), toggle (11).

**Gates:** JK_FF, INPUT_SWITCH (Ã—3: J, K, CLK), OUTPUT_LED (Ã—2: Q, Qn)

**Test vectors:**
- Initial Q=0; J=0, K=0, CLKâ†‘ â†’ Q=0 (hold)
- J=1, K=0, CLKâ†‘ â†’ Q=1 (set)
- J=1, K=0, CLKâ†‘ â†’ Q=1 (hold at 1)
- J=0, K=1, CLKâ†‘ â†’ Q=0 (reset)
- J=1, K=1, CLKâ†‘ â†’ Q=1 (toggle from 0)
- J=1, K=1, CLKâ†‘ â†’ Q=0 (toggle from 1)

**HDL expectation:** Verilog and VHDL export and parse correctly.

**Gap coverage:** JK_FF sequential-step-sequence

---

### GC-S3: SR latch forbidden state

**Description:** Documents the SR latch forbidden input behavior (S=R=1 â†’ Q=0, Qn=0).

**Gates:** SR_LATCH, INPUT_SWITCH (Ã—2: S, R), OUTPUT_LED (Ã—2: Q, Qn)

**Test vectors:**
- S=1, R=0 â†’ Q=1, Qn=0 (set)
- S=0, R=0 â†’ Q=1, Qn=0 (hold)
- S=0, R=1 â†’ Q=0, Qn=1 (reset)
- S=0, R=0 â†’ Q=0, Qn=1 (hold)
- S=1, R=1 â†’ Q=0, Qn=0 (forbidden: model-specific, both low)

**Note:** The golden value for S=R=1 is Q=0, Qn=0. This is the simulator's deterministic resolution, not real hardware behavior.

**Gap coverage:** SR_LATCH forbidden-input-combination

---

### GC-S4: D_FF_ASSR async set/reset override

**Description:** Verifies that async SET and RESET override the clock.

**Gates:** D_FF_ASSR, INPUT_SWITCH (Ã—4: D, CLK, S, R), OUTPUT_LED (Ã—2: Q, Qn)

**Test vectors:**
1. D=0, CLK=0, S=0, R=0 â†’ Q=0
2. S=1, CLK=0 â†’ Q=1 (immediate, no clock needed)
3. S=0, CLK=0 â†’ Q=1 (hold)
4. R=1, CLK=0 â†’ Q=0 (immediate async reset)
5. R=0, D=1, CLKâ†‘ â†’ Q=1 (normal capture resumes)
6. S=1, R=1 â†’ Q=0 (forbidden: both active, Q=0 by model)

**HDL expectation:** Verilog uses `always @(posedge clk or posedge s or posedge r)`.

**Gap coverage:** async-control-override, forbidden-input-combination

---

### GC-S5: 74HC74 dual flip-flop with independent async controls

**Description:** Tests both FFs in 74HC74 independently. Verifies that FF1's controls do not affect FF2 and vice versa.

**Gates:** 74HC74, INPUT_SWITCH (Ã—8: D1, CLK1, /PRE1, /CLR1, D2, CLK2, /PRE2, /CLR2), OUTPUT_LED (Ã—4: Q1, Qn1, Q2, Qn2)

**Test vectors:**
- /PRE1=0 while CLK1=0 â†’ Q1=1, Qn1=1 immediately (forbidden but defined)
- /CLR1=0 while CLK1=0 â†’ Q1=0, Qn1=1 immediately
- /PRE1=1, /CLR1=1, D1=1, CLK1â†‘ â†’ Q1=1 (normal D capture)
- FF2 in reset while FF1 is set â€” verify independence

**HDL expectation:** Verilog and VHDL parse cleanly.

**Gap coverage:** 74HC74 async-control-override, forbidden-input-combination, reset-to-known-state

---

### GC-S6: 4-bit register REG4 with enable

**Description:** Tests REG4 parallel load and hold-when-EN=0.

**Gates:** REG4, INPUT_SWITCH (Ã—6: D3..D0, CLK, EN), OUTPUT_LED (Ã—4: Q3..Q0)

**Test vectors:**
1. EN=1, D=0b1010, CLKâ†‘ â†’ Q=0b1010
2. EN=0, D=0b0101, CLKâ†‘ â†’ Q=0b1010 (hold â€” EN disabled)
3. EN=1, D=0b0101, CLKâ†‘ â†’ Q=0b0101 (EN re-enabled)

**HDL expectation:** Verilog and VHDL export cleanly.

**Gap coverage:** REG4 hold-state, sequential-step-sequence

---

### GC-S7: 4-bit counter 74HC161 async clear vs. 74HC163 sync clear

**Description:** The critical distinction test. Apply /CLRN=0 mid-cycle and verify 161 resets immediately, 163 waits for CLKâ†‘.

**Gates:** 74HC161, 74HC163, INPUT_SWITCH (Ã—shared), OUTPUT_LED (Ã—8: Q outputs for each)

**Test vectors for 74HC161:**
1. Count to 5 (5 CLK pulses)
2. Assert /CLRN=0 with CLK=0 (no edge) â†’ Q should immediately become 0000
3. De-assert /CLRN=1 â†’ count resumes

**Test vectors for 74HC163:**
1. Count to 5
2. Assert /CLRN=0 with CLK=0 â†’ Q still 5 (no change yet)
3. CLKâ†‘ â†’ Q becomes 0000 (sync clear on rising edge)

**HDL expectation:** 74HC161: `always @(posedge clk or negedge clrn)`. 74HC163: `always @(posedge clk)` only.

**Gap coverage:** counter async vs. sync clear distinction, async-control-override

---

### GC-S8: 74HC194 universal shift register all 4 modes

**Description:** Tests all four operating modes of the 74HC194.

**Gates:** 74HC194, INPUT_SWITCH (Ã—9: S1, S0, D3..D0, SR, SL, CLK), INPUT_SWITCH (/CLRN), OUTPUT_LED (Ã—4: Q3..Q0)

**Test vectors:**
- /CLRN=0 â†’ Q=0000 immediately (async clear)
- S1=1, S0=1, parallel load D=0b1010, CLKâ†‘ â†’ Q=0b1010
- S1=0, S0=1 (shift-right), SR=1, CLKâ†‘ â†’ Q=0b1101 (shift in 1 from right)
- S1=1, S0=0 (shift-left), SL=0, CLKâ†‘ â†’ Q=0b1010 (shift in 0 from left)
- S1=0, S0=0 (hold), CLKâ†‘ â†’ Q unchanged

**HDL expectation:** VHDL must use `std_logic_vector'(s1 & s0)` for the case statement (fixes P0-3).

**Gap coverage:** P0-3 (VHDL `&`), 74HC194 load-shift-mode, shift-sequence, async-control-override

---

## Track 3 â€” Tri-State / Bus Circuits (5 circuits)

### GC-T1: TRIBUF single-gate /OE control

**Description:** Basic tri-state buffer test. Verify output is driven when /OE=0 and Hi-Z when /OE=1.

**Gates:** TRIBUF, INPUT_SWITCH (Ã—2: A, /OE), OUTPUT_LED

**Test vectors:**
- A=1, /OE=0 â†’ Out=1 (driven)
- A=0, /OE=0 â†’ Out=0 (driven)
- A=1, /OE=1 â†’ Out=Z (Hi-Z) *[requires P0-1 fix to simulate correctly]*
- A=0, /OE=1 â†’ Out=Z

**Note:** Expected to fail until P0-1 (Z sanitization) is fixed. This circuit is the canonical test for that blocker.

**Gap coverage:** P0-1 (Z sanitization), TRIBUF oe-tristate

---

### GC-T2: Two TRIBUFs sharing a bus â€” multi-driver conflict

**Description:** Two TRIBUFs with outputs connected to the same wire. Verifies that the simulator raises a conflict event when both are enabled simultaneously.

**Gates:** TRIBUF (Ã—2), INPUT_SWITCH (Ã—4: A1, /OE1, A2, /OE2), JUNCTION, OUTPUT_LED

**Test vectors:**
- /OE1=0, /OE2=1 â†’ Out = A1 (only driver 1 active)
- /OE1=1, /OE2=0 â†’ Out = A2 (only driver 2 active)
- /OE1=1, /OE2=1 â†’ Out = Z (no driver)
- /OE1=0, /OE2=0, A1=A2 â†’ Out = A1 = A2 (both agree â€” no conflict)
- /OE1=0, /OE2=0, A1=0, A2=1 â†’ CONFLICT event expected *[requires P0-2 fix]*

**Note:** Expected to fail (no conflict raised) until P0-2 is fixed.

**Gap coverage:** P0-2 (multi-driver conflict), multi-driver-conflict pattern

---

### GC-T3: 74HC373 transparent latch with /OE

**Description:** Tests 74HC373 transparent (LE=1) and latched (LE=0) modes with /OE tri-state.

**Gates:** 74HC373, INPUT_SWITCH (Ã—10: D7..D0, LE, /OE), OUTPUT_LED (Ã—8)

**Test vectors:**
- LE=1, D=0xAA, /OE=0 â†’ Q=0xAA (transparent)
- LE=0, D=0x55, /OE=0 â†’ Q=0xAA (latched â€” D change ignored)
- LE=1, D=0x55, /OE=0 â†’ Q=0x55 (transparent, LE re-asserted)
- /OE=1 â†’ Q=0xZZ (all Hi-Z) *[requires P0-1 fix]*

**HDL expectation:** Verilog must not trigger Verilator LATCH warning after P1-1 fix.

**Gap coverage:** P0-1 (Z), P1-1 (Verilator LATCH), 74HC373 oe-tristate, hold-state

---

### GC-T4: 74HC595 shift register with /OE and /MR

**Description:** Tests the full 74HC595 operation: shift in 8 bits, latch to output, verify /MR resets shift only.

**Gates:** 74HC595, INPUT_SWITCH (Ã—5: SER, SHCP, STCP, /MR, /OE), OUTPUT_LED (Ã—8: Q7..Q0)

**Test vectors:**
1. /MR=0 â†’ shift register cleared (Q stays at previous latched value)
2. /MR=1, shift in 0b10110100 via 8 SHCP pulses
3. STCPâ†‘ â†’ outputs latch to 0b10110100
4. /OE=1 â†’ all outputs Hi-Z *[requires P0-1]*
5. /OE=0 â†’ outputs return to 0b10110100

**HDL expectation:** Verilog and VHDL parse cleanly.

**Gap coverage:** 74HC595 shift-sequence, oe-tristate, reset-to-known-state

---

### GC-T5: RAM256 write/read cycle

**Description:** Tests RAM256 write-then-read at the same address and verifies /OE tri-state.

**Gates:** RAM256, INPUT_SWITCH (Ã—11: A7..A0, D7..D0 [for write], /WE, /CS, /OE), OUTPUT_LED (Ã—8: D7..D0 [read])

**Test vectors:**
1. /CS=0, /WE=0, /OE=1, A=0x00, D=0xAB â†’ write 0xAB to address 0
2. /WE=1, /OE=0, A=0x00 â†’ read â†’ Data=0xAB
3. /OE=1 â†’ Data=0xZZ (Hi-Z)
4. Write 0xCD to address 0x01, read back â†’ 0xCD
5. Read address 0x00 again â†’ still 0xAB (verify address isolation)

**HDL expectation:** Verilog and VHDL export and parse. Yosys may infer block RAM.

**Gap coverage:** RAM256 sequential-step-sequence, oe-tristate

---

## Track 4 â€” Mixed Datapath Circuits (3 circuits)

### GC-M1: 4-bit binary adder using 74HC283

**Description:** A single-chip 4-bit full adder. Verifies carry propagation and overflow.

**Gates:** 74HC283, INPUT_SWITCH (Ã—9: A3..A0, B3..B0, C0), OUTPUT_LED (Ã—5: S3..S0, C4)

**Test vectors:**
- A=7, B=8, C0=0 â†’ S=15, C4=0
- A=8, B=8, C0=0 â†’ S=0, C4=1 (overflow)
- A=15, B=1, C0=0 â†’ S=0, C4=1
- A=0, B=0, C0=1 â†’ S=1, C4=0

**HDL expectation:** Clean Verilog/VHDL export. Yosys synthesizes to adder logic.

**Gap coverage:** 74HC283 arithmetic correctness

---

### GC-M2: 4-bit counter display pipeline (74HC161 + 74HC138)

**Description:** A 4-bit counter drives a 3-to-8 decoder. At count=7, one decoder output goes LOW. Tests signal propagation across sequential â†’ combinational boundary.

**Gates:** 74HC161, 74HC138, CLOCK, OUTPUT_LED (Ã—8)

**Test vectors (time sequence):**
- Clock 8 pulses â†’ counter reaches 7
- Verify decoder output Y7 is LOW at count=7
- Continue to count=8 â†’ Y7 goes HIGH (decoder moves to Y8 equivalent / all HIGH since 74HC138 is 0..7 only)
- Counter rollover at 15: verify wrap to 0, RCO behavior

**HDL expectation:** Verilog and VHDL for both gates parse and elaborate cleanly. Combined module instantiates both.

**Gap coverage:** counter-rollover, multi-gate signal propagation

---

### GC-M3: Serial-to-parallel data capture (74HC595 + OUTPUT_LED array)

**Description:** Shift in a known byte pattern through 74HC595 and display on LEDs. Tests a realistic application of the shift register.

**Gates:** 74HC595, OUTPUT_LED (Ã—8), PUSH_BTN (Ã—2: SHCP, STCP), INPUT_SWITCH (Ã—2: SER, /OE)

**Test vectors:**
1. Shift in 0b11110000 (8 SHCP pulses)
2. STCPâ†‘ â†’ latch to outputs
3. Verify LEDs show 11110000
4. Shift in 0b00001111
5. STCPâ†‘ â†’ LEDs show 00001111 (previous pattern overwritten)
6. Toggle /OE to 1 â†’ all LEDs show Z/off

**Gap coverage:** 74HC595 shift-sequence, application-level test

---

## Track 5 â€” Hierarchical / Custom IC Circuits (2 circuits)

### GC-H1: Custom IC wrapping a full adder

**Description:** Build a 1-bit full adder from AND/XOR/OR gates, wrap it as a custom IC, then instantiate it twice to make a 2-bit adder. Tests that hierarchy is preserved and outputs are correct.

**Gates:** AND (Ã—2), XOR (Ã—2), OR, custom IC wrapper Ã—2, INPUT_SWITCH (Ã—5), OUTPUT_LED (Ã—3)

**Test vectors:**
- All 8 combinations of A, B, Cin â†’ verify S and Cout for each

**Note:** This circuit is blocked until custom IC contract strategy (P2-3) is defined. Record current behavior as baseline even if unverifiable against a formal spec.

**Gap coverage:** P2-3 (custom IC), hierarchy support

---

### GC-H2: 8-bit shift register from two 74HC595s in series

**Description:** Chain two 74HC595s: QH' (serial output) of the first feeds SER of the second. Shift in a 16-bit pattern. Tests inter-IC communication and large state.

**Gates:** 74HC595 (Ã—2), INPUT_SWITCH (Ã—4: SER, SHCP, STCP, /MR), OUTPUT_LED (Ã—16)

**Test vectors:**
1. Shift in 0b1010101011001100 across 16 SHCP pulses
2. STCPâ†‘ â†’ latch both chips
3. Verify Q of chip1=0b10101010, Q of chip2=0b11001100

**Note:** Exercises multi-gate simulation accuracy across a larger state space than any single gate.

**Gap coverage:** Large design support, multi-IC data path

---

## Implementation Notes

### File format for each golden circuit

Each golden circuit should be stored as:

```
validation/golden-corpus/
  GC-C1-basic-cascade/
    circuit.json          # simulator circuit definition
    test-vectors.json     # input sequences + expected outputs
    verilog-golden.v      # expected HDL export (after fixes)
    vhdl-golden.vhd       # expected VHDL export (after fixes)
    notes.md              # known gaps, blockers, model-limits
```

### Dependency on P0 fixes

| Track | Requires |
|---|---|
| Track 1 (Combinational) | P0-4 (basic gate HDL) for HDL tests |
| Track 2 (Sequential) | P0-3 (VHDL `&`) for GC-S8 |
| Track 3 (Tri-state) | P0-1 (Z sanitization), P0-2 (multi-driver) |
| Track 4 (Mixed) | P0-4 for HDL export of combined circuits |
| Track 5 (Hierarchical) | P2-3 (custom IC strategy) for GC-H1 |

### Recommended implementation order

1. GC-S7 first (74HC161 vs 74HC163 â€” highest diagnostic value, tests a known ambiguity)
2. GC-T1 and GC-T2 (canonical Z and multi-driver tests â€” needed to validate P0-1 and P0-2 fixes)
3. GC-C1 (validates P0-4 fix)
4. GC-S8 (validates P0-3 fix for 74HC194)
5. Remaining circuits in Track 1 and Track 2
6. Track 3 and Track 4 after all P0 fixes
7. Track 5 last (depends on P2-3 strategy)
