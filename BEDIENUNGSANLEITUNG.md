<a id="top"></a>

<div align="center">

[![Deutsch](https://img.shields.io/badge/🇩🇪_Deutsch-24292f?style=for-the-badge)](#deutsch)
[![English](https://img.shields.io/badge/🇬🇧_English-24292f?style=for-the-badge)](#english)

</div>

---

<a id="deutsch"></a>

# Logic Simulator Studio – Bedienungsanleitung

Diese Anleitung führt vom lokalen Start bis zu Simulation, Analyse und Export.
Die KI-Funktion ist optional und separat dokumentiert.

<div align="center">

[![Start](https://img.shields.io/badge/Start-24292f?style=for-the-badge)](#de-start)
[![Oberfläche](https://img.shields.io/badge/Oberfl%C3%A4che-24292f?style=for-the-badge)](#de-oberflaeche)
[![Schaltungen](https://img.shields.io/badge/Schaltungen-24292f?style=for-the-badge)](#de-schaltungen)
[![Analyse](https://img.shields.io/badge/Analyse-24292f?style=for-the-badge)](#de-analyse)
[![FSM & IC](https://img.shields.io/badge/FSM_&_IC-24292f?style=for-the-badge)](#de-fsm-ic)
[![Dateien](https://img.shields.io/badge/Dateien-24292f?style=for-the-badge)](#de-dateien)
[![Kurzbefehle](https://img.shields.io/badge/Kurzbefehle-24292f?style=for-the-badge)](#de-kurzbefehle)
[![Hilfe](https://img.shields.io/badge/Hilfe-24292f?style=for-the-badge)](#de-hilfe)

</div>

<a id="de-start"></a>

## 1. Installation und Start

| Voraussetzung | Wert |
|---|---|
| Node.js | `^22.13` oder `>=24`; Version 24 empfohlen |
| npm | mit Node.js installiert |
| Browser | aktuelle Chromium-, Firefox- oder Safari-Version |

### Nur den Simulator starten

```bash
git clone https://github.com/p-keminer/logic-simulator-studio.git
cd logic-simulator-studio
npm install
npm run dev
```

Die App ist anschließend unter `http://localhost:5173` erreichbar. Sie läuft
ohne Konto und ohne Broker.

### App und Broker über den Launcher starten

- **Windows:** `Start Launcher.bat` doppelklicken. Das Skript installiert
  fehlende Abhängigkeiten und öffnet den Launcher.
- **Terminal:** Abhängigkeiten einmal installieren und dann den Node-Launcher
  starten:

```bash
npm install
npm --prefix broker install
npm run launch
```

Gleichwertig startet `node launcher.mjs` denselben Launcher. Er läuft auf
`http://localhost:4321`. App und Broker lassen sich dort
getrennt starten und stoppen. Details zum Broker stehen in
[`API_ANBINDUNG.md`](API_ANBINDUNG.md#deutsch).

### Build

```bash
npm run build
npm run preview
```

`npm run build` erzeugt den statischen Build unter `dist/`.

<a id="de-oberflaeche"></a>

## 2. Oberfläche

| Bereich | Funktion |
|---|---|
| Toolbar | Name, Laden, Speichern, Undo/Redo, HDL, Tabellen, Timing, IC, Broker, FSM und Hilfe |
| Palette | Bauteile suchen und per Drag & Drop platzieren |
| Canvas | Gatter, Leitungen, Wegpunkte und Notizen bearbeiten |
| Timing-Bereich | Signalverläufe, Zoom und ausgewählte Spuren |
| Race-Monitor | erkannte Timing-, Glitch-, Schleifen- und Konfliktereignisse |

Auf schmalen Fenstern liegen Toolbar-Funktionen im Menü `Menü ▾`.

<a id="de-schaltungen"></a>

## 3. Schaltungen bauen und bedienen

### Bauteile platzieren

1. Bauteil in der Palette suchen.
2. Auf den Canvas ziehen; die Position rastet am Raster ein.
3. Doppelklick oder Kontextmenü nutzen, um Name, Farbe, Drehung oder
   bauteilspezifische Werte zu ändern.

| Kategorie | Beispiele |
|---|---|
| Logik | AND, OR, NOT, NAND, NOR, XOR, XNOR, Buffer, Schmitt und Tri-State |
| Kombinatorisch | MUX/DEMUX, Komparator, ALU4 und Bus-Splitter/-Kombinator |
| Sequenziell | Latches, Flip-Flops, Register, Schieberegister, Zähler, RAM und ROM |
| Ein-/Ausgabe | Schalter, Taster, Takt, Konstanten, LED, 7-Segment, Matrix und ADC |
| ICs | 74xx-Bausteine und selbst definierte Custom ICs |

### Leitungen

1. Ausgangsport anklicken.
2. Optional auf freien Canvas klicken, um Wegpunkte zu setzen.
3. Ziel-Eingangsport anklicken.
4. Mit `Escape` abbrechen.

Rechtsklick öffnet die Aktionen für Gatter, Leitungen und Wegpunkte.
`Strg+Klick` auf eine Leitung löscht sie direkt. Rückkopplungen sind erlaubt;
der Simulator meldet instabile oder konkurrierende Signalpfade im Race-Monitor.

### Auswahl und Navigation

| Bedienung | Ergebnis |
|---|---|
| Klick / `Shift+Klick` | Einzel- oder Mehrfachauswahl |
| Rechteck auf leerem Canvas ziehen | Lasso-Auswahl |
| Mausrad | Zoom |
| `Alt` + Ziehen oder Mitteltaste + Ziehen | Canvas verschieben |
| Pfeiltasten | Auswahl verschieben; mit `Shift` fünffacher Schritt |
| `Strg+C` / `Strg+V` | Auswahl samt internen Leitungen kopieren/einfügen |
| `Strg+Z` / `Strg+R` | letzte Schaltungsänderung rückgängig machen/wiederholen |

Undo/Redo gilt für Änderungen an der Schaltung, nicht für reine Auswahl- oder
Simulationszustände. Die Toolbar zeigt an, ob ein Schritt verfügbar ist.

### Eingaben und spezielle Bauteile

| Bauteil | Bedienung |
|---|---|
| Eingangsschalter | Doppelklick schaltet zwischen 0 und 1 |
| Taster | Doppelklick erzeugt einen kurzen HIGH-Impuls von etwa 150 ms |
| Takt | Frequenz über Kontextmenü einstellen |
| Konstanten | liefern dauerhaft LOW oder HIGH |
| ROM | Kontextmenü öffnen und Bytes als Hexwerte `00`–`FF` bearbeiten |
| ALU4 | `000` ADD, `001` SUB, `010` AND, `011` OR, `100` XOR, `101` NOT A, `110` SHL, `111` SHR |

Bei ALU4 sind `A0/B0/S0` die niederwertigsten Bits. `ZERO` wird bei Ergebnis
`0000` gesetzt; `COUT` trägt je nach Operation Übertrag, Borrow oder das
herausgeschobene Bit.

<a id="de-analyse"></a>

## 4. Simulation und Analyse

Die Simulation läuft kontinuierlich. Über `⏸` wird sie pausiert; `⏭` führt im
pausierten Zustand einen Takt aus. Gatterlaufzeiten fließen in den
Discrete-Event-Scheduler ein.

| Werkzeug | Verwendung |
|---|---|
| W-Tabelle | vollständige Wahrheitstabelle für kombinatorische Schaltungen mit höchstens zwölf Eingängen |
| Zustandsübergangstabelle | Ein-Takt-Sicht `Q(t) -> Q(t+1)` für sequenzielle oder rückgekoppelte Schaltungen |
| Timing | Signalverläufe und Laufzeitverhalten über mehrere Takte |
| Race-Monitor | Ereignisse prüfen und betroffene Netze auf dem Canvas fokussieren |

Die Tabellenansicht wählt anhand von Zyklen und zustandsbehafteten Bauteilen
automatisch zwischen Wahrheits- und Zustandsübergangstabelle. Größere Fälle
werden reduziert oder bewusst begrenzt, statt eine unkontrolliert große Tabelle
zu erzeugen.

<a id="de-fsm-ic"></a>

## 5. FSM und Custom IC

### FSM

1. `FSM` in der Toolbar öffnen.
2. Zustände anlegen, Startzustand festlegen und Übergänge zeichnen.
3. Bedingungen mit `!`, `&`, `|`, `^` oder `1` formulieren.
4. Den Graphen prüfen und auf den Canvas synthetisieren.

Mindestens zwei sinnvoll verbundene Zustände und gültige Bedingungen werden
benötigt. Breite FSMs können in der Analyse reduziert dargestellt werden; eine
zu große unverdichtete Canvas-Synthese kann bewusst blockiert sein.

### Custom IC

1. Kombinatorische Teilschaltung aufbauen. Schalter werden Eingangsports,
   LEDs Ausgangsports.
2. `IC` öffnen, Namen und Ports festlegen und das IC erstellen.
3. Das neue Bauteil aus der Kategorie `Benutzerdefiniert` platzieren.

Custom ICs sind für kombinatorische Logik bestimmt. Flache und einzelne direkt
verschachtelte kombinatorische Hierarchien sind unterstützt. Tiefer
verschachtelte oder zustandsbehaftete Innenlogik ist nicht allgemein
freigegeben; für HDL-Export kann sie mit einer Diagnose abgelehnt werden.

<a id="de-dateien"></a>

## 6. Speichern, Laden und Export

| Funktion | Verhalten |
|---|---|
| Auto-Save | speichert verzögert im `sessionStorage` derselben Browser-Sitzung |
| Speichern | lädt die vollständige Schaltung als `.lgsc.json` herunter |
| Laden | ersetzt die aktuelle Schaltung durch eine ausgewählte `.lgsc.json` |
| JSON | kanonisches Round-Trip-Format für den Simulator |
| Verilog/VHDL | HDL-Ausgabe für unterstützte Schaltungspfade |

Vor `Neu` und vor experimentellen KI-Aktionen sollte eine JSON-Datei gespeichert
werden. Bestätigte `circuit-actions` werden gemeinsam als ein Undo-Schritt
übernommen. Multi-Driver-Tri-State-Busse und tiefere Custom-IC-Hierarchien
gehören zu den dokumentierten HDL-Grenzen und können bewusst blockiert werden.

<a id="de-kurzbefehle"></a>

## 7. Kurzbefehle

| Taste | Aktion |
|---|---|
| `Strg+Z` / `Strg+R` | rückgängig / wiederholen |
| `Strg+C` / `Strg+V` | kopieren / versetzt einfügen |
| `Delete` / `Backspace` | Auswahl löschen |
| `R` | ausgewählte Gatter drehen |
| `W` | Verdrahtungsmodus umschalten |
| `X` | Snap-to-Port umschalten |
| `Escape` | Zeichnen abbrechen oder Menüs schließen |
| Pfeiltasten | Auswahl verschieben; `Shift` = fünffacher Schritt |
| `Shift+Klick` | Mehrfachauswahl |
| `Strg+Klick` auf Leitung | Leitung löschen |
| Mausrad | Zoom |
| `Alt` + Ziehen / Mitteltaste + Ziehen | Pan |

Die vollständige aktuelle Liste steht auch hinter `?` in der Toolbar.

<a id="de-hilfe"></a>

## 8. Fehlerbehebung und Grenzen

| Problem | Prüfen |
|---|---|
| Signal ändert sich nicht | Ports und Leitungsverbindung prüfen; Quelle direkt testen |
| Rückkopplung wirkt statisch | Timing-Ansicht und Race-Monitor öffnen |
| Wahrheitstabelle fehlt | Ein- und Ausgänge prüfen; maximal zwölf Eingänge |
| Zustandsfolge bleibt gleich | Takt, Reset und tatsächlich geschlossenen Rückkopplungspfad prüfen |
| FSM-Synthese bleibt leer | Startzustand, Übergänge und Bedingungsausdrücke prüfen |
| Datei lädt nicht | gültiges `.lgsc.json` und vorhandene Gate-Typen verwenden |
| Broker verbindet nicht | Prozess auf :8787, Base-URL und Provider-Konfiguration prüfen |

KI-generierte `circuit-actions` sind experimentell und immer
bestätigungspflichtig. Die App zeigt den vollständigen Aktionsblock zuerst als
Vorschau; erst die ausdrückliche Bestätigung übernimmt ihn atomar als einen
Undo-Schritt. Verwerfen lässt die Schaltung unverändert.

Für den aktuellen QA-Aufbau zuerst
[`validation/README.md`](validation/README.md) lesen. Weitere Einstiege:
[Projektübersicht](README.md#deutsch) ·
[KI-Broker](API_ANBINDUNG.md#deutsch) ·
[Broker-Details](broker/README.md).

<div align="center">

[![Nach oben](https://img.shields.io/badge/⬆_Nach_oben-24292f?style=for-the-badge)](#top)

</div>

---

<a id="english"></a>

# Logic Simulator Studio – User Manual

This guide covers local startup, simulation, analysis, and export. The AI
feature is optional and documented separately.

<div align="center">

[![Start](https://img.shields.io/badge/Start-24292f?style=for-the-badge)](#en-start)
[![Interface](https://img.shields.io/badge/Interface-24292f?style=for-the-badge)](#en-interface)
[![Circuits](https://img.shields.io/badge/Circuits-24292f?style=for-the-badge)](#en-circuits)
[![Analysis](https://img.shields.io/badge/Analysis-24292f?style=for-the-badge)](#en-analysis)
[![FSM & IC](https://img.shields.io/badge/FSM_&_IC-24292f?style=for-the-badge)](#en-fsm-ic)
[![Files](https://img.shields.io/badge/Files-24292f?style=for-the-badge)](#en-files)
[![Shortcuts](https://img.shields.io/badge/Shortcuts-24292f?style=for-the-badge)](#en-shortcuts)
[![Help](https://img.shields.io/badge/Help-24292f?style=for-the-badge)](#en-help)

</div>

<a id="en-start"></a>

## 1. Installation and Startup

| Requirement | Value |
|---|---|
| Node.js | `^22.13` or `>=24`; version 24 recommended |
| npm | installed with Node.js |
| Browser | current Chromium, Firefox, or Safari version |

### Start Only the Simulator

```bash
git clone https://github.com/p-keminer/logic-simulator-studio.git
cd logic-simulator-studio
npm install
npm run dev
```

The app is then available at `http://localhost:5173`. It runs without an
account or broker.

### Start App and Broker Through the Launcher

- **Windows:** double-click `Start Launcher.bat`. The script installs missing
  dependencies and opens the launcher.
- **Terminal:** install dependencies once and then run the Node launcher:

```bash
npm install
npm --prefix broker install
npm run launch
```

Equivalently, `node launcher.mjs` starts the same launcher. It runs at
`http://localhost:4321`. The app and broker can be started
and stopped independently. Broker details are in
[`API_ANBINDUNG.md`](API_ANBINDUNG.md#english).

### Build

```bash
npm run build
npm run preview
```

`npm run build` creates the static build in `dist/`.

<a id="en-interface"></a>

## 2. Interface

| Area | Function |
|---|---|
| Toolbar | name, load, save, undo/redo, HDL, tables, timing, IC, broker, FSM, and help |
| Palette | search components and place them by drag and drop |
| Canvas | edit gates, wires, waypoints, and notes |
| Timing area | signal traces, zoom, and selected tracks |
| Race monitor | detected timing, glitch, loop, and conflict events |

On narrow windows, toolbar functions are grouped under `Menü ▾`.

<a id="en-circuits"></a>

## 3. Building and Operating Circuits

### Place Components

1. Find a component in the palette.
2. Drag it onto the canvas; its position snaps to the grid.
3. Use double-click or the context menu to change its name, colour, rotation,
   or component-specific values.

| Category | Examples |
|---|---|
| Logic | AND, OR, NOT, NAND, NOR, XOR, XNOR, buffer, Schmitt, and tri-state |
| Combinational | MUX/DEMUX, comparator, ALU4, and bus splitter/combiner |
| Sequential | latches, flip-flops, registers, shift registers, counters, RAM, and ROM |
| Input/output | switch, push button, clock, constants, LED, 7-segment, matrix, and ADC |
| ICs | 74xx components and user-defined Custom ICs |

### Wires

1. Click an output port.
2. Optionally click empty canvas space to add waypoints.
3. Click the target input port.
4. Press `Escape` to cancel.

Right-click opens actions for gates, wires, and waypoints. `Ctrl+click` a wire
to delete it directly. Feedback is supported; the race monitor reports
unstable or competing signal paths.

### Selection and Navigation

| Control | Result |
|---|---|
| Click / `Shift+click` | single or multiple selection |
| Drag a rectangle on empty canvas | lasso selection |
| Mouse wheel | zoom |
| `Alt` + drag or middle-button drag | pan the canvas |
| Arrow keys | move selection; `Shift` uses five times the step |
| `Ctrl+C` / `Ctrl+V` | copy/paste selection including internal wires |
| `Ctrl+Z` / `Ctrl+R` | undo/redo the latest circuit change |

Undo/redo covers circuit changes, not selection-only or simulation state. The
toolbar indicates whether a step is available.

### Inputs and Special Components

| Component | Control |
|---|---|
| Input switch | double-click toggles between 0 and 1 |
| Push button | double-click produces a short HIGH pulse of about 150 ms |
| Clock | configure frequency through the context menu |
| Constants | continuously produce LOW or HIGH |
| ROM | open the context menu and edit bytes as `00`–`FF` hexadecimal values |
| ALU4 | `000` ADD, `001` SUB, `010` AND, `011` OR, `100` XOR, `101` NOT A, `110` SHL, `111` SHR |

For ALU4, `A0/B0/S0` are the least significant bits. `ZERO` is set when the
result is `0000`; depending on the operation, `COUT` carries the carry, borrow,
or shifted-out bit.

<a id="en-analysis"></a>

## 4. Simulation and Analysis

Simulation runs continuously. `⏸` pauses it; `⏭` advances one clock while
paused. Gate delays feed the discrete-event scheduler.

| Tool | Use |
|---|---|
| Truth table | complete table for combinational circuits with at most twelve inputs |
| State-transition table | one-tick view `Q(t) -> Q(t+1)` for sequential or feedback circuits |
| Timing | signal traces and delay behaviour over multiple ticks |
| Race monitor | inspect events and focus affected nets on the canvas |

The table view automatically selects a truth or state-transition table from
cycles and stateful components. Larger cases are reduced or deliberately
limited instead of producing an uncontrolled table.

<a id="en-fsm-ic"></a>

## 5. FSM and Custom IC

### FSM

1. Open `FSM` in the toolbar.
2. Add states, choose the initial state, and draw transitions.
3. Write conditions with `!`, `&`, `|`, `^`, or `1`.
4. Check the graph and synthesise it onto the canvas.

At least two meaningfully connected states and valid conditions are needed.
Wide FSMs may use a reduced analysis view; an excessively large unminimised
canvas synthesis may be deliberately blocked.

### Custom IC

1. Build a combinational subcircuit. Switches become input ports and LEDs
   become output ports.
2. Open `IC`, set its name and ports, and create the IC.
3. Place the new component from the `Benutzerdefiniert` category.

Custom ICs target combinational logic. Shallow and single directly nested
combinational hierarchies are supported. Deeper nesting or stateful internal
logic is not generally approved and may be rejected with a diagnostic during
HDL export.

<a id="en-files"></a>

## 6. Save, Load, and Export

| Function | Behaviour |
|---|---|
| Auto-save | saves after a short delay in the same browser session's `sessionStorage` |
| Save | downloads the complete circuit as `.lgsc.json` |
| Load | replaces the current circuit with a selected `.lgsc.json` |
| JSON | canonical round-trip format for the simulator |
| Verilog/VHDL | HDL output for supported circuit paths |

Save a JSON file before using `Neu` or experimental AI actions. Confirmed
`circuit-actions` are applied together as one undo step. Multi-driver tri-state
buses and deeper Custom IC hierarchies are documented HDL limits and may be
deliberately blocked.

<a id="en-shortcuts"></a>

## 7. Shortcuts

| Key | Action |
|---|---|
| `Ctrl+Z` / `Ctrl+R` | undo / redo |
| `Ctrl+C` / `Ctrl+V` | copy / paste with offset |
| `Delete` / `Backspace` | delete selection |
| `R` | rotate selected gates |
| `W` | toggle wiring mode |
| `X` | toggle snap-to-port |
| `Escape` | cancel drawing or close menus |
| Arrow keys | move selection; `Shift` = five times the step |
| `Shift+click` | multiple selection |
| `Ctrl+click` a wire | delete wire |
| Mouse wheel | zoom |
| `Alt` + drag / middle-button drag | pan |

The complete current list is also available through `?` in the toolbar.

<a id="en-help"></a>

## 8. Troubleshooting and Limits

| Problem | Check |
|---|---|
| Signal does not change | verify ports and wire connection; test the source directly |
| Feedback appears static | open the timing view and race monitor |
| Truth table is unavailable | verify inputs and outputs; use at most twelve inputs |
| State sequence does not change | verify clock, reset, and the actual closed feedback path |
| FSM synthesis stays empty | verify initial state, transitions, and condition expressions |
| File does not load | use valid `.lgsc.json` and available gate type IDs |
| Broker does not connect | verify process on :8787, base URL, and provider configuration |

AI-generated `circuit-actions` are experimental and always require
confirmation. The app first shows the complete action block as a preview;
explicit confirmation applies it atomically as one undo step. Discarding it
leaves the circuit unchanged.

For the current QA structure, read
[`validation/README.md`](validation/README.md#english) first. Further entry points:
[Project overview](README.md#english) ·
[AI broker](API_ANBINDUNG.md#english) ·
[Broker details](broker/README.md#english).

<div align="center">

[![Back to top](https://img.shields.io/badge/⬆_Back_to_top-24292f?style=for-the-badge)](#top)

</div>
