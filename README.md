<div align="center">

[🇩🇪 Deutsch](#deutsch) &nbsp;·&nbsp; [🇬🇧 English](#english)

</div>

---

<a id="deutsch"></a>

# LogicSim – Browser-basierter Logikgatter-Simulator

Ein vollständiger, interaktiver Logikschaltkreis-Simulator, gebaut mit React, TypeScript und Vite.

> 📖 **Vollständige Bedienungsanleitung:** [BEDIENUNGSANLEITUNG.md](BEDIENUNGSANLEITUNG.md)

---

<div align="center">
<img src="media/screen_mirror_small.gif" alt="LogicSim Demo" width="960" />
</div>

---
### Status: Stabil (März 2026)
**Gate-Delay-Modus** vollständig implementiert und gehärtet: zuverlässige Race-Condition-Erkennung mit 5 Schweregradklassen, TTL-Leitungsmarkierung und Timing-Diagramm-Integration.

---

## Funktionen


Zwei umschaltbare Modis (**⚡ Zero-Delay** / **⏱ Gate-Delay**):

#### Zero-Delay-Modus (Vorgabe)
- **Tick-basierte Discrete-Event-Simulation**
- **Vollständige Rückkopplungsunterstützung**
- **Manuelles Takt-Stepping**

#### Gate-Delay-Modus
- **Discrete-Event-Scheduler**
- **Race-Condition-Erkennung** 
- **TTL-Leitungsmarkierung**
- **Race-Panel**

### Analyse-Werkzeuge

| Werkzeug | Kombinatorisch | Sequenziell / Rückkopplung |
|---|---|---|
| **Wahrheitstabelle** | ✅ Alle Eingangskombinationen, Zwischenwerte | – |
| **Zustandsübergangstabelle** | – | ✅ Bei Rückkopplungen oder sequenziellen Zustandsbausteinen; Einzel-Tick Q(t) → Q(t+1) |
| **Timing-Diagramm** | ✅ | ✅ |
| **Race-Condition-Panel** | – | ✅ Nur im Gate-Delay-Modus; Klick-to-Focus auf betroffene Netze |

### Export
| Format | Hinweise |
|---|---|
| **JSON** | Vollständiger Schaltkreis (Speichern / Laden) |
| **Verilog** | Synthesefähiges HDL |
| **VHDL** | Synthesefähiges HDL |

**HDL-Export:**
- **Zentrales Identifier-Sanitizing**: Alle Gate-Namen werden IEEE-konform bereinigt (Sonderzeichen, Keyword-Kollisionen, führende Ziffern)
- **Nicht verbundene Pins** werden zu expliziten Modulports mit `nc_`-Präfix 
- **3-Pass-Architektur** (Verilog): korrekte `output reg` / `output wire`-Typisierung für alle Gates
- **Vollständige toVerilog/toVHDL-Emitter** für: MUX2, MUX4, Schmitt-Trigger, ALU4 (explizites Bit-Mapping), CMP1, CMP4 (mit Cascade-Eingängen im `else`-Zweig)

### Endlicher Automat (FSM) Editor
- Grafischer FSM-Editor mit Drag-and-Drop-Zuständen und Übergängen
- Bedingungsausdruck-Parser für Übergangsbeschriftungen
- **Synthese** vom FSM-Graphen zur Logikschaltung auf dem Canvas

---

## Gatter-Bibliothek

### Grundlegende Logik
| Gatter | Varianten |
|---|---|
| AND, OR, NOT, NAND, NOR, XOR, XNOR | 2–8 Eingänge |
| Buffer, Schmitt-Trigger, Tri-State-Buffer | – |
| Komplementäre Ausgangspaare | – |

### Kombinatorisch
- Multiplexer (2:1 / 4:1 / 8:1) und Demultiplexer
- **Komparator (1-Bit / 4-Bit)** – CMP4 mit Cascade-Eingängen (LTin / EQin / GTin): Mehrere CMP4 lassen sich zur Wortbreitenvergrößerung verketten; bei A=B werden die Cascade-Eingänge direkt auf die Ausgänge durchgeleitet
- Bus-Splitter / Bus-Kombinator

#### ALU4 — 4-Bit Arithmetisch-Logische Einheit

| Op2 | Op1 | Op0 | Operation | Ergebnis | COUT |
|---|---|---|---|---|---|
| 0 | 0 | 0 | **ADD** | A + B + CIN | Übertrag Bit 4 |
| 0 | 0 | 1 | **SUB** | A − B − CIN | Borrow-Ausgang |
| 0 | 1 | 0 | **AND** | A & B | 0 |
| 0 | 1 | 1 | **OR** | A \| B | 0 |
| 1 | 0 | 0 | **XOR** | A ^ B | 0 |
| 1 | 0 | 1 | **NOT A** | ~A | 0 |
| 1 | 1 | 0 | **SHL** | A << 1 | A[3] |
| 1 | 1 | 1 | **SHR** | A >> 1 | A[0] |

Flag **ZERO** = 1 wenn S[3:0] = 0. Rechtsklick auf ALU4 → **❓ Hilfe (Op-Codes)** für Kurzreferenz.

### Sequenziell
- D-, T-, SR-, JK-Flip-Flops (synchrones & asynchrones Löschen / Preset)
- Master-Slave-Flip-Flop
- **4-Bit Schieberegister (SHIFT4)** – SIPO mit 4 Bit-LED-Anzeigen für Q0–Q3 im Gatter-Body
- **4-Bit Parallelregister (REG4)** – mit EN-Eingang und 4 Bit-LED-Anzeigen
- 8-Bit Parallelregister (REG8)
- Binärzähler mit integrierter 7-Segment-Anzeige
- RAM (synchrones Lesen/Schreiben), ROM mit eingebautem Hex-Editor

### Ein-/Ausgabe & Anzeige
| Komponente | Beschreibung |
|---|---|
| Eingabeschalter | HIGH / LOW umschalten |
| Taster | Kurzzeitiger HIGH-Impuls |
| Taktgenerator | Einstellbare Frequenz |
| Konstant HIGH / LOW | Feste Spannungsquelle |
| Ausgangs-LED | Konfigurierbare Farbe |
| 7-Segment-Anzeige | BCD-Eingang |
| Dot-Matrix-Anzeige | Bitmap-Anzeige |
| ADC | 8-Bit-Analogschieberegler |
| Schrittmotor | Visuelle Schrittzähler-Anzeige |
| Textnotiz | Canvas-Annotation |

### Integrierte Schaltkreise
- 74xx-Serien-ICs (u. a. 74HC595 mit funktionalem /OE-Pin)
- **Custom IC** – Kombinatorische Teilschaltung als in der Palette verfügbare, wiederverwendbare Komponente kapseln

---

## Schnellstart

```bash
git clone https://github.com/p-keminer/logic-simulator-studio.git
cd logic-simulator-studio
npm install
npm run dev
```

Öffne [http://localhost:5173](http://localhost:5173) im Browser.

---

## Tech-Stack

| Schicht | Technologie |
|---|---|
| UI-Framework | React 19 |
| Sprache | TypeScript 5.9 (strict) |
| Bundler | Vite 7 |
| Styling | Tailwind CSS 4 |
| Linting | ESLint 9 + typescript-eslint |
| Zustandsverwaltung | React Context + useReducer |
| Persistenz | sessionStorage (Auto-Save, sitzungsgebunden) + JSON-Export |

Kein Backend, keine externen Dienste – alles läuft clientseitig.

---

## Tastenkürzel

| Taste | Aktion |
|---|---|
| `Delete` / `Backspace` | Ausgewählte Elemente löschen |
| Pfeiltasten | Ausgewählte Gatter verschieben (Shift: 5× Schritt) |
| `Strg+C` | Ausgewählte Gatter kopieren (inkl. interner Kabel) |
| `Strg+V` | Zwischenablage einfügen (+24 px versetzt) |
| `Escape` | Kabelzeichnen abbrechen / Menüs schließen |
| `R` | Ausgewählte Gatter drehen |
| `W` | Verdrahtungsmodus ein/aus |
| `X` | Snap-to-Port-Modus ein/aus (gelber Rahmen) |
| Mausrad | Canvas zoomen |
| `Alt` + Ziehen | Viewport verschieben (Pan) |
| Mitteltaste + Ziehen | Viewport verschieben (Pan) |
| Ziehen auf leerem Canvas | Lasso-Auswahl → Pfeiltasten zum Verschieben |
| Rechtsklick auf Gatter | Kontextmenü (Kopieren, Drehen, Umbenennen, Farbe, Löschen, …) |
| Rechtsklick auf Kabel | Kontextmenü (Farbe, Knotenpunkt, Löschen) |
| Rechtsklick auf Canvas | Einfügen an Mausposition (wenn Zwischenablage gefüllt) |

---

## Lizenz

[MIT](LICENSE)

---

---

<a id="english"></a>

# LogicSim – Browser-based Logic Gate Simulator

A fully featured, interactive logic circuit simulator built with React, TypeScript and Vite.

> 📖 **Full user manual:** [BEDIENUNGSANLEITUNG.md](BEDIENUNGSANLEITUNG.md)

---

## Features

Two switchable modes (toolbar button **⚡ Zero-Delay** / **⏱ Gate-Delay**):

#### Zero-Delay Mode (default)
- **Tick-based discrete-event simulation** 
- **Full feedback-loop support** 
- **Manual clock stepping** 

#### Gate-Delay Mode
- **Discrete-event scheduler**
- **Race condition detection** 
- **TTL wire marking**
- **Race panel** 

### Analysis Tools

| Tool | Combinatorial | Sequential / Feedback |
|---|---|---|
| **Truth Table** | ✅ All input combinations, intermediate values | – |
| **State Transition Table** | – | ✅ With feedback loops or sequential state elements; single-tick Q(t) → Q(t+1) |
| **Timing Diagram** | ✅ | ✅ |
| **Race Condition Panel** | – | ✅ Gate-Delay mode only; click-to-focus on affected nets |

### Export
| Format | Notes |
|---|---|
| **JSON** | Full circuit round-trip (save / load) |
| **Verilog** | Synthesisable HDL |
| **VHDL** | Synthesisable HDL |

**HDL Export:**
- **Central identifier sanitizing**: all gate names are made IEEE-compliant (special characters, keyword collisions, leading digits)
- **Unconnected pins** become explicit module ports with `nc_` prefi
- **3-pass architecture** (Verilog): correct `output reg` / `output wire` typing for all gates
- **Full toVerilog/toVHDL emitters** for: MUX2, MUX4, Schmitt Trigger, ALU4 (explicit bit mapping), CMP1, CMP4 (cascade inputs propagated in the `else` branch)

### Finite State Machine Editor
- Condition expression parser for transition labels
- **Synthesis** from FSM graph to logic circuit on the canvas

---

## Gate Library

### Basic Logic
| Gates | Variants |
|---|---|
| AND, OR, NOT, NAND, NOR, XOR, XNOR | 2–8 inputs |
| Buffer, Schmitt Trigger, Tri-State Buffer | – |
| Complementary output pairs | – |

### Combinational
- Multiplexer (2:1 / 4:1 / 8:1) and Demultiplexer
- **Comparator (1-bit / 4-bit)** – CMP4 with cascade inputs (LTin / EQin / GTin): multiple CMP4s can be chained for wider word comparisons; when A=B the cascade inputs are passed straight through to the outputs
- Bus Splitter / Bus Combiner

#### ALU4 — 4-Bit Arithmetic Logic Unit

| Op2 | Op1 | Op0 | Operation | Result | COUT |
|---|---|---|---|---|---|
| 0 | 0 | 0 | **ADD** | A + B + CIN | Carry out bit 4 |
| 0 | 0 | 1 | **SUB** | A − B − CIN | Borrow bit |
| 0 | 1 | 0 | **AND** | A & B | 0 |
| 0 | 1 | 1 | **OR** | A \| B | 0 |
| 1 | 0 | 0 | **XOR** | A ^ B | 0 |
| 1 | 0 | 1 | **NOT A** | ~A | 0 |
| 1 | 1 | 0 | **SHL** | A << 1 | A[3] (shifted-out MSB) |
| 1 | 1 | 1 | **SHR** | A >> 1 | A[0] (shifted-out LSB) |

Flags: **ZERO** = 1 when result S[3:0] = 0. Right-click any ALU4 instance → **❓ Help (Op-Codes)**.

### Sequential
- D, T, SR, JK Flip-Flops (synchronous & asynchronous clear / preset)
- Master-Slave Flip-Flop
- **4-bit Shift Register (SHIFT4)** – SIPO with 4 in-gate bit-LED indicators for Q0–Q3
- **4-bit Parallel Register (REG4)** – with EN input and 4 in-gate bit-LED indicators
- 8-bit Parallel Register (REG8)
- Binary counter with integrated 7-segment display
- RAM (synchronous read/write), ROM with built-in hex editor

### I/O & Display
| Component | Description |
|---|---|
| Input Switch | Toggle HIGH / LOW |
| Push Button | Momentary HIGH pulse |
| Clock Generator | Adjustable frequency |
| Constant HIGH / LOW | Fixed voltage source |
| Output LED | Configurable colour |
| 7-Segment Display | BCD input |
| Dot-Matrix Display | Bitmap display |
| ADC | 8-bit analogue slider |
| Stepper Motor | Visual step-count display |
| Text Note | Canvas annotation |

### Integrated Circuits
- 74xx series ICs (including 74HC595 with functional /OE pin)
- **Custom IC** – encapsulate a combinational sub-circuit as a reusable palette component (flip-flops / latches inside a Custom IC are not correctly simulated)

---

## Getting Started

```bash
git clone https://github.com/p-keminer/logic-simulator-studio.git
cd logic-simulator-studio
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 |
| Language | TypeScript 5.9 (strict) |
| Bundler | Vite 7 |
| Styling | Tailwind CSS 4 |
| Linting | ESLint 9 + typescript-eslint |
| State management | React Context + useReducer |
| Persistence | sessionStorage (auto-save, session-scoped) + JSON export |

No backend, no external services – everything runs client-side.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Delete` / `Backspace` | Delete selected elements |
| Arrow keys | Move selected gates (Shift: 5× step) |
| `Ctrl+C` | Copy selected gates (and internal wires) |
| `Ctrl+V` | Paste clipboard (+24 px offset) |
| `Escape` | Cancel wire drawing / close menus |
| `R` | Rotate selected gate(s) |
| `W` | Toggle wire-draw mode |
| `X` | Toggle snap-to-port mode (yellow outline) |
| Mouse wheel | Zoom canvas |
| `Alt` + drag | Pan viewport |
| Middle-button drag | Pan viewport |
| Drag on empty canvas | Lasso selection → use arrow keys to move |
| Right-click gate | Context menu (copy, rotate, label, colour, delete, …) |
| Right-click wire | Context menu (colour, junction, delete) |
| Right-click empty canvas | Paste at cursor (if clipboard non-empty) |

---

## Architecture Notes

### Simulation Loop (RAF)
The `requestAnimationFrame` loop in `CircuitContext.tsx`:

1. **`syncBuffer`** – Copies user-controlled inputs (switches, buttons) from React state into the `SimBuffer`
2. **Settle phase** – After structural changes, `runUntilStable` propagates signals with clocks frozen (max 64 ticks)
3. **Normal ticks** – `runOneTick` × `⌊500 × Δt / 1000⌋` per frame
4. **Even-period fix** – One extra tick if signals changed mid-frame but the final buffer matches the pre-tick buffer
5. **`SIMULATION_APPLY`** dispatch – Only when any signal actually changed, preventing unnecessary re-renders

### Feedback Loop Handling
The double-buffer model separates **read** (current tick) from **write** (next tick). Every gate reads from a frozen snapshot and writes to a fresh buffer – any cyclic topology is structurally correct with no special-casing.

### State Transition Table Algorithm
1. `topologicalSort` identifies which gates are in cycles (feedback gates = state holders)
2. For every combination of (external inputs × current state Q_t), a fresh `SimBuffer` is seeded
3. **Exactly one `runOneTick`** – the mathematical definition of Q(t+1) in the double-buffer model
4. Stable rows (Q_t = Q_t+1) are highlighted

### GATE_DELAY Simulation (`EventScheduler`)
- `committedOutputs` holds the last stable value for every gate output
- A priority queue stores `(time, netId, value, sourceGateId)` events sorted by time
- Each `advance()` call processes all events with `time ≤ targetTime`, re-evaluates downstream gates, and enqueues new events at `triggerTime + gate.propagationDelay`
- **Race detection with 5 severity classes**: `critical` (value_conflict) > `timing` (setup_hold_risk) > `glitch` (reconvergent_glitch) > `warning` (multi_source) > `loop` (loop_overflow)
- **TTL wire-marking**: `raceMarkRef` map keeps severity colours visible for 400 ms per net — short-lived glitches remain readable
- **Per-batch timing snapshots**: `onBatchCommit` callback fires once per `advance()` batch, producing one timing-diagram step per gate-delay level (e.g. 20 NOT gates in series = 20 staircase steps)
- **INPUT_SWITCH fix**: `seed()` accepts `liveCustomStateFor` — overrides `committedCustomStates` for switch gates before the eval pass so toggling a switch generates a properly timed event instead of a silent no-op
- **Memory safety**: events are only generated when the computed value differs from the committed value; settled circuits produce zero new events

### HDL Identifier Sanitizing (`identSanitize.ts`)
Single source of truth for all identifier sanitizing. Rules (applied in order):
1. Replace chars outside `[A-Za-z0-9_]` with `_`
2. Strip leading underscores
3. Empty result → fallback `x`
4. Leading digit → prefix `m_` (modules) or `n_` (signals/ports)
5. Reserved keyword collision → prefix `n_`

### HDL Fallback Declaration Opt-out
Gates that implement their own `toVerilog`/`toVHDL` and handle all output signals internally can set `verilogSkipUnconnectedOutputs: true` / `vhdlSkipUnconnectedOutputs: true` in their `GateDefinition`. This suppresses the automatic fallback `wire`/`signal` declaration for unconnected outputs. Without the flag, the fallback is always emitted — ensuring gates like `SR_LATCH`, `D_FF`, `REG8`, and `ALU4` never produce undeclared-wire compile errors under `` `default_nettype none ``. Currently opt-in: MUX2, MUX4, SCHMITT.

---

## Contributing

Pull requests are welcome. For major changes please open an issue first.

---

## License

[MIT](LICENSE)
