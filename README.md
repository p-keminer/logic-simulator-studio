# LogicSim – Browser-based Logic Gate Simulator

A fully featured, interactive logic circuit simulator built with React, TypeScript and Vite.
Design circuits, simulate feedback loops, analyse with truth tables and state-transition tables, and export to Verilog / VHDL – all in the browser, no installation required.

> 📖 **Full user manual (German):** [BEDIENUNGSANLEITUNG.md](BEDIENUNGSANLEITUNG.md)

---

# Changelog

## Recent Changes

### UX Improvements
- **Search bar** in the gate palette – filter by name, type ID or description
- **Copy / Paste** (Ctrl+C / Ctrl+V) for gates and internal wires; right-click empty canvas to paste at cursor
- **Default zoom** raised from 1.0 to 1.5 for better readability on first open
- **Port labels** on flip-flops and registers are now inset further from the port circle (no overlap)
- **REG4 / SHIFT4 bit-LEDs** – four coloured circles inside the gate body show the current Q0–Q3 state at a glance

### FSM Editor
- Grid now correctly moves with pan/zoom (via `patternTransform`)
- Double-click on a transition opens the editor directly (no extra click required)
- Moore output labels and State Table now display bits MSB-first (consistent with column headers)
- Label background width adapts dynamically to label length
- Unchecking "initial" on the only initial state now promotes another state automatically

### Verilog / VHDL Export
- Unsupported gate types (CLOCK, PUSH_BTN, ROM, RAM, Custom IC, …) are now excluded from export
- Port declarations no longer produce trailing-comma syntax errors
- Sequential gate outputs are now correctly declared as `reg` (Verilog) instead of `wire`
- `CONST_HIGH` / `CONST_LOW` generate proper `assign` / signal statements
- Improved primitive keyword mapping for multi-input gates
- Multi-line gate blocks are correctly indented
- Removed unnecessary `STD_LOGIC_UNSIGNED` import from VHDL output

### Flip-Flop HDL Implementations
- **SR-Latch**: now generates synthesisable cross-coupled NOR primitives
- **D-FF**: expanded to proper multi-line `always` block (Verilog) / `process` (VHDL)
- **D-FF with async reset**: full async-reset behavioral model added
- **JK-FF**: complete behavioral model with J/K/toggle cases
- **T-FF**: toggle behavioral model added
- **D-Latch**: level-sensitive latch model added

---

## Features

### Circuit Editor
- **Drag & drop** gate placement from a categorised, searchable palette
- **Wire drawing** between output and input ports with multi-segment routing and manual waypoints
- **Zoom** (mouse wheel) and **pan** (Alt + drag) on an infinite canvas
- **Lasso selection**, arrow-key movement, multi-gate **copy / paste** (Ctrl+C / Ctrl+V)
- **Grid snapping** for clean layouts
- **Gate labels**, **text annotations** and **junction** dots
- **Right-click context menus** per gate (copy, rotate, label, colour, delete, …) and wire (colour, delete)
- **Canvas right-click** → paste at cursor when clipboard is non-empty
- **Auto-save** to `localStorage` and **manual save / load** as JSON

### Simulation Engine
- **Tick-based discrete-event simulation** with double-buffering (Read-Buffer → Logic → Write-Buffer)
- **500 ticks / second** – signals remain visually trackable (Schule/Demo mode)
- **Full feedback-loop support**: SR latches, ring oscillators, and every other cyclic topology work correctly – no special-casing required
- Even-period oscillator compensation: every frame dispatches a phase-shifted state so ring oscillators remain visible
- **Clock gates** driven by deterministic tick counters (no `setInterval` drift)
- **Manual clock stepping** (pause / single-step mode)
- **Settle phase** after structural changes with clocks frozen

### Analysis Tools

| Tool | Combinatorial | Sequential / Feedback |
|---|---|---|
| **Truth Table** | ✅ All input combinations, intermediate values | – |
| **State Transition Table** | – | ✅ Automatic cycle detection, single-tick Q(t) → Q(t+1) |
| **Timing Diagram** | ✅ | ✅ |

- **Truth Table** – Enumerates all 2ⁿ input combinations; shows intermediate gate values
- **State Transition Table** – Detects feedback loops via topological sort; treats feedback gate outputs as state variables Q(t); uses exactly one simulation tick per row for mathematically correct Q(t+1); stable states highlighted
- **Timing Diagram** – All connected signals visible; per-row hide/show; resizable panel

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

8 operations selected via **Op[2:0]**:

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

Flags: **ZERO** = 1 when result S[3:0] = 0. Right-click any ALU4 instance → **❓ Hilfe (Op-Codes)** for a quick in-simulator reference.

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

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Install & run

```bash
git clone https://github.com/<your-username>/logic-gate-simulator.git
cd logic-gate-simulator
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
npm run build
npm run preview   # local preview of production build
```

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

## Project Structure

```
src/
├── App.tsx                    # Root layout, resizable timing panel
├── components/
│   ├── canvas/                # CircuitCanvas, CanvasGate, CanvasWire, …
│   ├── fsm/                   # FSM editor (10 components)
│   ├── panels/                # TruthTableModal, TimingDiagram, RomEditor, CustomIC
│   ├── sidebar/               # GatePalette (with search)
│   └── toolbar/               # Toolbar, ExportModal, HelpModal
├── core/
│   ├── simulation/
│   │   ├── tickEngine.ts      # Double-buffer tick engine (SimBuffer, runOneTick, …)
│   │   ├── engine.ts          # Zero-time evaluator (used by truth table)
│   │   └── topologicalSort.ts # Kahn's algorithm + cycle detection
│   ├── io/                    # Serializer, deserializer, Verilog, VHDL
│   └── registry/              # GateRegistry
├── gates/
│   ├── definitions/           # Gate logic (evaluate, stateUpdate)
│   ├── shapes/                # SVG React components per gate type
│   ├── io/                    # I/O gate definitions
│   ├── sequential/            # Flip-flop, RAM, ROM, counter definitions
│   └── ic74xx/                # 74xx series
├── fsm/                       # FSM context, reducer, synthesis
├── hooks/                     # useDrag, useViewport, useWireDrawing
└── store/                     # CircuitContext (RAF loop), circuitReducer, actions, clipboard
```

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Delete` / `Backspace` | Delete selected elements |
| Arrow keys | Move selected gates (grid step; Shift: 5× step) |
| `Ctrl+C` | Copy selected gates (and internal wires) |
| `Ctrl+V` | Paste clipboard (+24 px offset) |
| `Escape` | Cancel wire drawing / close menus |
| `R` | Rotate selected gate(s) |
| `W` | Toggle wire-draw mode |
| `X` | Toggle snap-to-port mode (yellow outline) |
| Mouse wheel | Zoom canvas |
| `Alt` + drag | Pan viewport |
| Middle-button drag | Pan viewport |
| Left-click output port | Start wire |
| Left-click input port | Finish wire |
| Left-click canvas (while drawing) | Add waypoint |
| Drag on empty canvas | Lasso selection |
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
4. **Even-period fix** – If the final buffer equals the pre-tick buffer but signals changed mid-frame, one extra tick ensures oscillating circuits remain visible
5. **`SIMULATION_APPLY`** dispatch – Only when any signal actually changed, preventing unnecessary re-renders

### Feedback Loop Handling
The double-buffer model separates **read** (current tick) from **write** (next tick). Every gate reads from a frozen snapshot and writes to a fresh buffer. This makes any cyclic topology structurally correct with no special-casing.

### State Transition Table Algorithm
1. `topologicalSort` identifies which gates are in cycles (feedback gates = state holders)
2. For every combination of (external inputs × current state Q_t), a fresh `SimBuffer` is seeded with the forced values
3. **Exactly one `runOneTick`** is executed — the mathematical definition of Q(t+1) in the double-buffer model
4. Results are read from the output buffer; stable rows (Q_t = Q_t+1) are highlighted

---

## Contributing

Pull requests are welcome. For major changes please open an issue first to discuss what you would like to change.

---

## License

[MIT](LICENSE)

---

---

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

- **Wahrheitstabelle** – Zählt alle 2ⁿ Eingangskombinationen auf; zeigt Zwischengatterwerte
- **Zustandsübergangstabelle** – Erkennt Rückkopplungsschleifen per topologischer Sortierung; behandelt Feedback-Gate-Ausgänge als Zustandsvariablen Q(t); verwendet genau einen Simulations-Tick pro Zeile für mathematisch korrektes Q(t+1); stabile Zustände hervorgehoben
- **Timing-Diagramm** – Alle verbundenen Signale sichtbar; zeilenweises Ein-/Ausblenden; anpassbare Panelgröße

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

8 Operationen über **Op[2:0]**:

| Op2 | Op1 | Op0 | Operation | Ergebnis | COUT |
|---|---|---|---|---|---|
| 0 | 0 | 0 | **ADD** | A + B + CIN | Übertrag Bit 4 |
| 0 | 0 | 1 | **SUB** | A − B − CIN | Borge-Bit |
| 0 | 1 | 0 | **AND** | A & B | 0 |
| 0 | 1 | 1 | **OR** | A \| B | 0 |
| 1 | 0 | 0 | **XOR** | A ^ B | 0 |
| 1 | 0 | 1 | **NOT A** | ~A | 0 |
| 1 | 1 | 0 | **SHL** | A << 1 (Links-Shift) | A[3] (herausgeschobenes MSB) |
| 1 | 1 | 1 | **SHR** | A >> 1 (Rechts-Shift) | A[0] (herausgeschobenes LSB) |

Flag **ZERO** = 1 wenn S[3:0] = 0. Rechtsklick auf ALU4 → **❓ Hilfe (Op-Codes)** für Kurzreferenz im Simulator.

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

### Voraussetzungen
- Node.js ≥ 18
- npm ≥ 9

### Installation & Start

```bash
git clone https://github.com/<dein-benutzername>/logic-gate-simulator.git
cd logic-gate-simulator
npm install
npm run dev
```

Öffne [http://localhost:5173](http://localhost:5173) im Browser.

### Produktions-Build

```bash
npm run build
npm run preview   # Lokale Vorschau des Produktions-Builds
```

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

## Projektstruktur

```
src/
├── App.tsx                    # Root-Layout, anpassbares Timing-Panel
├── components/
│   ├── canvas/                # CircuitCanvas, CanvasGate, CanvasWire, …
│   ├── fsm/                   # FSM-Editor (10 Komponenten)
│   ├── panels/                # TruthTableModal, TimingDiagram, RomEditor, CustomIC
│   ├── sidebar/               # GatePalette (mit Suchleiste)
│   └── toolbar/               # Toolbar, ExportModal, HelpModal
├── core/
│   ├── simulation/
│   │   ├── tickEngine.ts      # Double-Buffer-Tick-Engine (SimBuffer, runOneTick, …)
│   │   ├── engine.ts          # Zero-Time-Evaluator (für Wahrheitstabelle)
│   │   └── topologicalSort.ts # Kahn-Algorithmus + Zyklus-Erkennung
│   ├── io/                    # Serializer, Deserializer, Verilog, VHDL
│   └── registry/              # GateRegistry
├── gates/
│   ├── definitions/           # Gate-Logik (evaluate, stateUpdate)
│   ├── shapes/                # SVG-React-Komponenten pro Gate-Typ
│   ├── io/                    # I/O-Gate-Definitionen
│   ├── sequential/            # Flipflop-, RAM-, ROM-, Zähler-Definitionen
│   └── ic74xx/                # 74xx-Serie
├── fsm/                       # FSM-Kontext, Reducer, Synthese
├── hooks/                     # useDrag, useViewport, useWireDrawing
└── store/                     # CircuitContext (RAF-Schleife), circuitReducer, actions, clipboard
```

---

## Tastenkürzel

| Taste | Aktion |
|---|---|
| `Delete` / `Backspace` | Ausgewählte Elemente löschen |
| Pfeiltasten | Ausgewählte Gatter verschieben (Rasterschritt; Shift: 5× Schritt) |
| `Strg+C` | Ausgewählte Gatter kopieren (inkl. interner Kabel) |
| `Strg+V` | Zwischenablage einfügen (+24 px versetzt) |
| `Escape` | Kabelzeichnen abbrechen / Menüs schließen |
| `R` | Ausgewählte Gatter drehen |
| `W` | Kabel-Modus ein/aus |
| `X` | Snap-to-Port-Modus ein/aus (gelber Rahmen) |
| Mausrad | Canvas zoomen |
| `Alt` + Ziehen | Viewport verschieben (Pan) |
| Mitteltaste + Ziehen | Viewport verschieben (Pan) |
| Linksklick auf Ausgangsport | Kabel beginnen |
| Linksklick auf Eingangsport | Kabel beenden |
| Linksklick auf Canvas (beim Zeichnen) | Wegpunkt hinzufügen |
| Ziehen auf leerem Canvas | Lasso-Auswahl → Pfeiltasten zum Verschieben |
| Rechtsklick auf Gatter | Kontextmenü (Kopieren, Drehen, Umbenennen, Farbe, Löschen, …) |
| Rechtsklick auf Kabel | Kontextmenü (Farbe, Knotenpunkt, Löschen) |
| Rechtsklick auf Canvas | Einfügen an Mausposition (wenn Zwischenablage gefüllt) |

---

## Architektur-Hinweise

### Simulations-Schleife (RAF)
Die `requestAnimationFrame`-Schleife in `CircuitContext.tsx`:

1. **`syncBuffer`** – Kopiert benutzerkontrollierte Eingaben (Schalter, Taster) aus dem React-State in den `SimBuffer`
2. **Stabilisierungsphase** – Nach Strukturänderungen propagiert `runUntilStable` Signale mit eingefrorenen Takten (max. 64 Ticks)
3. **Normale Ticks** – `runOneTick` × `⌊500 × Δt / 1000⌋` pro Frame
4. **Geradzahliger Fix** – Wenn der Endbuffer dem Pre-Tick-Buffer entspricht, aber sich Signale während des Frames geändert haben, stellt ein extra Tick sicher, dass Oszillationsschaltungen sichtbar bleiben
5. **`SIMULATION_APPLY`** dispatch – Nur wenn sich tatsächlich etwas geändert hat, um unnötige Re-Renders zu vermeiden

### Rückkopplungsschleifen-Behandlung
Das Double-Buffer-Modell trennt **Lesen** (aktueller Tick) vom **Schreiben** (nächster Tick). Jedes Gatter liest aus einem eingefrorenen Snapshot und schreibt in einen frischen Buffer. Damit ist jede zyklische Topologie strukturell korrekt ohne Sonderbehandlung.

### Zustandsübergangstabellen-Algorithmus
1. `topologicalSort` identifiziert welche Gatter in Zyklen sind (Feedback-Gatter = Zustandshalter)
2. Für jede Kombination (externe Eingaben × aktueller Zustand Q_t) wird ein frischer `SimBuffer` mit den erzwungenen Werten geseeded
3. **Genau ein `runOneTick`** wird ausgeführt — die mathematische Definition von Q(t+1) im Double-Buffer-Modell
4. Ergebnisse werden aus dem Ausgabe-Buffer gelesen; stabile Zeilen (Q_t = Q_t+1) werden hervorgehoben

---

## Mitwirken

Pull Requests sind willkommen. Für größere Änderungen bitte zuerst ein Issue öffnen und besprechen, was geändert werden soll.

---

## Lizenz

[MIT](LICENSE)
