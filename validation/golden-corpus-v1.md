# Golden Corpus v1

**Erstellt:** 2026-03-07
**Status:** vollstÃ¤ndig â€” 12 Schaltungen, je .lgsc.json + .v + .vhd

## Ãœbersicht

Erste saubere Regression-Suite fÃ¼r den HDL-Export und die Simulator-Korrektheit von LogicSim.
Ziel: kompakt, nicht-redundant zu focused-nine, alle Gate-Klassen mindestens einmal abgedeckt.

| Klasse       | Anzahl | Slugs |
|---|---|---|
| Combinational | 3 | gc_c1, gc_c2, gc_c3 |
| Sequential    | 4 | gc_s1, gc_s2, gc_s3, gc_s4 |
| Tri-State     | 2 | gc_t1, gc_t2 |
| Mixed         | 3 | gc_m1, gc_m2, gc_m3 |

## Artefakt-Verzeichnisse

```
validation/generated-circuits-golden/   â€” 12 Ã— .lgsc.json
validation/generated-exports-golden/    â€” 12 Ã— .v + 12 Ã— .vhd
```

---

## Schaltungen

### gc_c1 â€” AND + OR + NOT chain

**Topologie:** `a,b â†’ AND â†’ OR(c) â†’ NOT â†’ y`
**Exports:** Verilog gate primitives (`and/or/not`), interne DrÃ¤hte `w_0, w_1`, Ausgang `w_2`.
**Checkpoints:** Wahrheitstafel `y = NOT((a AND b) OR c)`, korrekte Wire-Nummerierung.

### gc_c2 â€” Half Adder

**Topologie:** `a,b â†’ XOR â†’ sum; a,b â†’ AND â†’ carry`
**Exports:** Fan-out von sw_a/sw_b auf zwei Gates; zwei unabhÃ¤ngige Ausgangspfade.
**Checkpoints:** `sum = a XOR b`, `carry = a AND b`; keine internen DrÃ¤hte (alle GatterausgÃ¤nge sind Ports).

### gc_c3 â€” SR-Latch

**Topologie:** `s,r â†’ SR_LATCH â†’ q, q_n`
**Exports:** Cross-coupled NOR Primitives im Verilog (`nor g_dut_q`, `nor g_dut_qn`); VHDL Shadow-Signale `w_0_q, w_1_q` fÃ¼r rÃ¼ckgekoppelte Lese-Schreibkonflikte.
**Checkpoints:** `isSynchronous=false`-Pfad; SR-Semantik (hold, set, reset, forbidden).

### gc_s1 â€” D-FF mit async Set/Reset (D_FF_ASSR)

**Topologie:** `d, clk, s, r â†’ D_FF_ASSR â†’ q`
**Exports:** `asyncSRWrapVerilog` mit sc=null, rc=null â†’ vollstÃ¤ndiger 3-Branch; SensitivitÃ¤tsliste `posedge clk or posedge r or posedge s`.
**Checkpoints:** PrioritÃ¤t R > S > CLK; `w_dut_q_n` als unverbundener interner Draht.

### gc_s2 â€” JK-FF Toggle-Modus

**Topologie:** `j=1(const), k=1(const), clk â†’ JK_FF â†’ q`
**Exports:** `jkSimplifiedVerilog` / `jkSimplifiedVHDL` mit jc=null, kc=null â†’ alle drei Branches ausgegeben.
**Checkpoints:** Toggle bei jedem CLKâ†‘; q wechselt jede Flanke.

### gc_s3 â€” 74HC74 Dual D-FF

**Topologie:** Zwei unabhÃ¤ngige D-FFs mit active-low /PRE und /CLR.
**Exports:** `negedge pre1 or negedge clr1` in SensitivitÃ¤tsliste; zwei getrennte always-BlÃ¶cke; `verilogWireOutputs=['qn1','qn2']`.
**Checkpoints:** pre=0 â†’ Q=1 sofort; clr=0 â†’ Q=0 sofort; unabhÃ¤ngige TaktdomÃ¤nen.

### gc_s4 â€” REG4 mit Clock-Enable

**Topologie:** `d0..d3, en, clk, rst â†’ REG4 â†’ q0..q3`
**Exports:** `always @(posedge clk or posedge rst)`; EN-Bedingung im else-Zweig; 4 Shadow-Signale in VHDL.
**Checkpoints:** rst=1 â†’ async clear; en=1 + CLKâ†‘ â†’ load; en=0 + CLKâ†‘ â†’ hold.

### gc_t1 â€” TRIBUF direkt

**Topologie:** `a, oe â†’ TRIBUF â†’ y`
**Exports:** `assign y = (~oe) ? a : 1'bz` (Verilog); `y <= a when oe = '0' else 'Z'` (VHDL).
**Checkpoints:** OE=0 â†’ driven; OE=1 â†’ Z; Shadow w_0_q in VHDL.

### gc_t2 â€” Bus-Mux (2Ã— TRIBUF auf gemeinsamen LED)

**Topologie:** `buf1(a1,oe1) â†’ led; buf2(a2,oe2) â†’ led` (beide AusgÃ¤nge auf led:in)
**Exports:** Last-wire-wins (buf2:y = w_1 = Ausgang; buf1:y = w_0 = interner verwaister Draht).
**Bekannte Limitation:** buf1-Ausgang `w_0` wird nicht als Ausgangsport exportiert â€” wird in Dokumentation vermerkt. Kein Multi-Driver-Guard (keine Input-Output-Namenskollision).

### gc_m1 â€” D-FF Kette (Pipeline)

**Topologie:** `d, clk â†’ DFF1 â†’ DFF2 â†’ q2`
**Exports:** clk fan-out zu beiden FFs; `w_0` als internes `reg` (DFF1-Ausgang); `w_1` als Output-`reg` (DFF2-Ausgang); 2 unbenutzte `q_n`-DrÃ¤hte.
**Checkpoints:** Ausgang verzÃ¶gert Eingang um genau 2 Taktflanken.

### gc_m2 â€” 74HC283 4-Bit-Addierer

**Topologie:** `a1..a4, b1..b4, c0 â†’ 74HC283 â†’ s1..s4, c4`
**Startzustand:** A=7 (0b0111), B=8 (1000), C0=0 â†’ S=15 (1111), C4=0.
**Exports:** Verilog `wire [4:0] sum_dut = ...` inline; VHDL `process` mit `unsigned`-Variable; 5 Shadow-Signale.
**Checkpoints:** Arithmetik korrekt; alle 5 AusgÃ¤nge als Ports.

### gc_m3 â€” 74HC161 ZÃ¤hler + AND-Gate

**Topologie:** `clk,clrn,ldn,enp,ent,d0..d3 â†’ 74HC161 â†’ q0,q1 â†’ AND â†’ detect`
**Exports:** `verilogExtraRegs` â†’ `reg [3:0] cnt_ctr`; gemischte Gate+FF Reihenfolge (`gateLines` vor `ffLines`).
**Checkpoints:** AND-Ausgang HIGH bei cnt=3, 7, 11, 15; VHDL `cnt_ctr : STD_LOGIC_VECTOR(3 downto 0)`.

---

## Nicht-Redundanz zu focused-nine

| focused-nine Fall | Ãœberschneidung | Golden-Corpus-Abgrenzung |
|---|---|---|
| dff_led | D_FF basic | gc_s1 = D_FF_ASSR (async SR), gc_m1 = chain |
| jkff_led | JK_FF basic | gc_s2 = toggle-mode, keine weiteren |
| tff_led | T_FF | kein gc_* â€” T_FF bewusst weggelassen (genug FF-Abdeckung) |
| hc373_oe_z, hc374_oe_z | 8-bit latch/FF + OE | gc_t1/t2 = TRIBUF primitiv (einfacher, kleiner) |
| hc595_oe_shift | Schieberegister | nicht im gc_* â€” komplexer, in v2 |
| hc161_clear, hc163_clear | 74HC161/163 | gc_m3 kombiniert 74HC161 + AND |
| hc194_modes | 74HC194 | nicht im gc_* â€” in v2 |
| multi_driver_same_input | Multi-Driver-Guard | gc_t2 = TRIBUF-Variante ohne Guard-Trigger |
| mixed_datapath | 74HC283 + FF | gc_m2 = nur 74HC283; gc_m3 = ZÃ¤hler + Gate |
| tri_not_sanitized | TRIBUF + NOT | gc_t1 = nur TRIBUF; gc_c1 = nur NOT |

## V2-LÃ¼cken

Folgende Klassen fehlen bewusst in v1 und sind fÃ¼r v2 vorgesehen:

- **T_FF / T_FF_ASSR** â€” genug Toggle-Abdeckung durch JK_FF
- **74HC194** (Schieberegister mit Modes) â€” komplex, eigener Slot
- **74HC595** (PISO mit Latch) â€” braucht Puls-Sequenz im Testvektor
- **Hierarchie / CUSTOM_IC** â€” benÃ¶tigt eigene Testinfrastruktur
- **CLOCK-Gate** (exkludiert von HDL-Export) â€” UI-only Test
- **74HC163** â€” nur marginale Differenz zu 74HC161 (synchronous clear)
- **Multi-Driver-Guard (echter Konflikt)** â€” gc_t2 dokumentiert Grenzfall; echter Guard-AuslÃ¶ser in v2
