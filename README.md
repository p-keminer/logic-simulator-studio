<div align="center">

[🇩🇪 Deutsch](#deutsch) &nbsp;·&nbsp; [🇬🇧 English](#english)

</div>

---

<a id="deutsch"></a>

# LogicSim – Browser-basierter Logikgatter-Simulator

Ein vollständiger, interaktiver Logikschaltkreis-Simulator, gebaut mit React, TypeScript und Vite.
Entwirf Schaltungen, simuliere Rückkopplungsschleifen, analysiere mit Wahrheitstabellen und Zustandsübergangstabellen und exportiere nach Verilog / VHDL – alles im Browser, ohne Installation.

> 📖 **Vollständige Bedienungsanleitung:** [BEDIENUNGSANLEITUNG.md](BEDIENUNGSANLEITUNG.md)

---

## Funktionen

### Schaltkreis-Editor
- **Drag & Drop** – Gatter aus einer kategorisierten, durchsuchbaren Palette ziehen und platzieren
- **Kabelzeichnen** – Zwischen Ausgangs- und Eingangsports mit mehrsegmentiger Führung und manuellen Wegpunkten
- **Zoom** (Mausrad) und **Pan** (Alt + Ziehen) auf einem unendlichen Canvas
- **Lasso-Selektion**, Pfeiltasten-Bewegung, Mehrfachauswahl **kopieren / einfügen** (Strg+C / Strg+V)
- **Rasterausrichtung** für saubere Layouts
- **Gate-Beschriftungen**, **Textannotationen** und **Verbindungspunkte**
- **Rechtsklick-Kontextmenüs** für Gatter (Kopieren, Drehen, Umbenennen, Farbe, Löschen, …) und Kabel
- **Rechtsklick auf leeren Canvas** → Einfügen an Mausposition (wenn Zwischenablage gefüllt)
- **Automatisches Speichern** in `localStorage` und **manuelles Speichern / Laden** als JSON

### Simulations-Engine
- **Tick-basierte Discrete-Event-Simulation** mit Double-Buffering (Lese-Buffer → Logik → Schreib-Buffer)
- **500 Ticks / Sekunde** – Signale bleiben visuell verfolgbar
- **Vollständige Rückkopplungsunterstützung**: SR-Latches, Ringoszillatoren und alle anderen zyklischen Topologien funktionieren korrekt – keine Sonderfälle erforderlich
- Geradzahliger Oszillator-Ausgleich: jeder Frame sendet einen phasenverschobenen Zustand, damit Ringoszillatoren sichtbar bleiben
- **Taktgatter** durch deterministische Tick-Zähler gesteuert (kein `setInterval`-Drift)
- **Manuelles Takt-Stepping** (Pause / Einzelschritt-Modus)
- **Stabilisierungsphase** nach Strukturänderungen mit eingefrorenen Takten

### Analyse-Werkzeuge

| Werkzeug | Kombinatorisch | Sequenziell / Rückkopplung |
|---|---|---|
| **Wahrheitstabelle** | ✅ Alle Eingangskombinationen, Zwischenwerte | – |
| **Zustandsübergangstabelle** | – | ✅ Automatische Zyklus-Erkennung, Einzel-Tick Q(t) → Q(t+1) |
| **Timing-Diagramm** | ✅ | ✅ |

### Export
| Format | Hinweise |
|---|---|
| **JSON** | Vollständiger Schaltkreis (Speichern / Laden) |
| **Verilog** | Synthesefähiges HDL |
| **VHDL** | Synthesefähiges HDL |

### Endlicher Automat (FSM) Editor
- Grafischer FSM-Editor mit Drag-and-Drop-Zuständen und Übergängen
- Bedingungsausdruck-Parser für Übergangsbeschriftungen
- **Ein-Klick-Synthese** vom FSM-Graphen zur Logikschaltung auf dem Canvas

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
- Komparator (1-Bit / 4-Bit)
- Bus-Splitter / Bus-Kombinator

#### ALU4 — 4-Bit Arithmetisch-Logische Einheit

| Op2 | Op1 | Op0 | Operation | Ergebnis | COUT |
|---|---|---|---|---|---|
| 0 | 0 | 0 | **ADD** | A + B + CIN | Übertrag Bit 4 |
| 0 | 0 | 1 | **SUB** | A − B − CIN | Borge-Bit |
| 0 | 1 | 0 | **AND** | A & B | 0 |
| 0 | 1 | 1 | **OR** | A \| B | 0 |
| 1 | 0 | 0 | **XOR** | A ^ B | 0 |
| 1 | 0 | 1 | **NOT A** | ~A | 0 |
| 1 | 1 | 0 | **SHL** | A << 1 | A[3] |
| 1 | 1 | 1 | **SHR** | A >> 1 | A[0] |

Flag **ZERO** = 1 wenn S[3:0] = 0. Rechtsklick auf ALU4 → **❓ Hilfe (Op-Codes)** für Kurzreferenz.

### Sequenziell
- D-, T-, SR-, JK-Flipflops (synchrones & asynchrones Löschen / Preset)
- Master-Slave-Flipflop
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
- 74xx-Serien-ICs
- **Custom IC** – Beliebige Teilschaltung als wiederverwendbare, palettierbare Komponente kapseln

---

## Schnellstart

```bash
git clone https://github.com/<dein-benutzername>/logic-gate-simulator.git
cd logic-gate-simulator
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
| Persistenz | localStorage (Auto-Save) + JSON-Export |

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
| `W` | Kabel-Modus ein/aus |
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
Design circuits, simulate feedback loops, analyse with truth tables and state-transition tables, and export to Verilog / VHDL – all in the browser, no installation required.

> 📖 **Full user manual:** [BEDIENUNGSANLEITUNG.md](BEDIENUNGSANLEITUNG.md)

---

## Features

### Circuit Editor
- **Drag & drop** gate placement from a categorised, searchable palette
- **Wire drawing** between output and input ports with multi-segment routing and manual waypoints
- **Zoom** (mouse wheel) and **pan** (Alt + drag) on an infinite canvas
- **Lasso selection**, arrow-key movement, multi-gate **copy / paste** (Ctrl+C / Ctrl+V)
- **Grid snapping** for clean layouts
- **Gate labels**, **text annotations** and **junction** dots
- **Right-click context menus** per gate (copy, rotate, label, colour, delete, …) and wire
- **Canvas right-click** → paste at cursor when clipboard is non-empty
- **Auto-save** to `localStorage` and **manual save / load** as JSON

### Simulation Engine
- **Tick-based discrete-event simulation** with double-buffering (Read-Buffer → Logic → Write-Buffer)
- **500 ticks / second** – signals remain visually trackable
- **Full feedback-loop support**: SR latches, ring oscillators, and every other cyclic topology work correctly
- Even-period oscillator compensation keeps ring oscillators visible
- **Clock gates** driven by deterministic tick counters (no `setInterval` drift)
- **Manual clock stepping** (pause / single-step mode)
- **Settle phase** after structural changes with clocks frozen

### Analysis Tools

| Tool | Combinatorial | Sequential / Feedback |
|---|---|---|
| **Truth Table** | ✅ All input combinations, intermediate values | – |
| **State Transition Table** | – | ✅ Automatic cycle detection, single-tick Q(t) → Q(t+1) |
| **Timing Diagram** | ✅ | ✅ |

### Export
| Format | Notes |
|---|---|
| **JSON** | Full circuit round-trip (save / load) |
| **Verilog** | Synthesisable HDL |
| **VHDL** | Synthesisable HDL |

### Finite State Machine Editor
- Graphical FSM editor with drag-and-drop states and transitions
- Condition expression parser for transition labels
- **One-click synthesis** from FSM graph to logic circuit on the canvas

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
- Comparator (1-bit / 4-bit)
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
- 74xx series ICs
- **Custom IC** – encapsulate any sub-circuit as a reusable, paletteable component

---

## Getting Started

```bash
git clone https://github.com/<your-username>/logic-gate-simulator.git
cd logic-gate-simulator
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
| Persistence | localStorage (auto-save) + JSON export |

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

---

## Contributing

Pull requests are welcome. For major changes please open an issue first.

---

## License

[MIT](LICENSE)
