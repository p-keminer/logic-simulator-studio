<a id="top"></a>

<div align="center">

[![Deutsch](https://img.shields.io/badge/🇩🇪_Deutsch-24292f?style=for-the-badge)](#deutsch)
[![English](https://img.shields.io/badge/🇬🇧_English-24292f?style=for-the-badge)](#english)

</div>

---

<div align="center">
  <img src="media/screen_mirror_small.gif" alt="Logic Simulator Studio demo" width="640">
</div>

---

<a id="deutsch"></a>

# Logic Simulator Studio

Browserbasierter Simulator zum Entwerfen, Simulieren und Prüfen digitaler
Logikschaltungen. Die Anwendung kombiniert eine umfangreiche Bauteilbibliothek
mit Timing- und Race-Analyse, FSM-Werkzeugen, HDL-Export und einem optionalen
lokalen KI-Broker.

<div align="center">

[![Übersicht](https://img.shields.io/badge/%C3%9Cbersicht-24292f?style=for-the-badge)](#de-uebersicht)
[![Funktionen](https://img.shields.io/badge/Funktionen-24292f?style=for-the-badge)](#de-funktionen)
[![Start](https://img.shields.io/badge/Start-24292f?style=for-the-badge)](#de-start)
[![Grenzen](https://img.shields.io/badge/Grenzen-24292f?style=for-the-badge)](#de-grenzen)
[![Dokumentation](https://img.shields.io/badge/Dokumentation-24292f?style=for-the-badge)](#de-dokumentation)

</div>

<a id="de-uebersicht"></a>

## Übersicht

| Bereich | Stand |
|---|---|
| Frontend | React 19, TypeScript 5.9, Vite 8 und Tailwind CSS 4 |
| Simulation | kombinatorisch, sequenziell, Rückkopplung und Gate-Delay |
| Persistenz | sitzungsgebundener Auto-Save sowie JSON-Import/-Export |
| KI-Funktion | optionaler, lokal betriebener Broker unter `broker/` |
| Laufzeit | Node.js `^22.13` oder `>=24`; Node.js 24 empfohlen |
| Lizenz | [Apache License 2.0](LICENSE.md) |

Der Simulator läuft im Browser und benötigt für seine Kernfunktionen weder
Konto noch Backend. Der Broker wird nur für den KI-Chat gebraucht.

<a id="de-funktionen"></a>

## Funktionen

| Bereich | Inhalt |
|---|---|
| Canvas | Drag & Drop, Verdrahtung, Wegpunkte, Zoom, Pan, Lasso und Kontextmenüs |
| Bauteile | Logikgatter, MUX/DEMUX, ALU, Komparatoren, Flip-Flops, Register, RAM/ROM, Anzeigen und 74xx-ICs |
| Simulation | Discrete-Event-Scheduler, einstellbare Gatterlaufzeiten, Pause und Einzelschritt |
| Analyse | Wahrheits- und Zustandsübergangstabelle, Timing-Diagramm sowie Race-Monitor |
| FSM | grafischer Editor, Übergangsbedingungen und Synthese auf den Canvas |
| Custom IC | wiederverwendbare kombinatorische Teilschaltungen |
| Dateien | Schaltungen als `.lgsc.json` speichern und laden |
| Export | JSON sowie Verilog und VHDL für unterstützte Schaltungen |
| Bearbeitung | Rückgängig/Wiederholen über Toolbar oder `Strg+Z` / `Strg+R` |
| KI | Chat über den reduzierten Kontext der aktuell geöffneten Schaltung |

<a id="de-start"></a>

## Schnellstart

```bash
git clone https://github.com/p-keminer/logic-simulator-studio.git
cd logic-simulator-studio
npm install
npm run dev
```

Anschließend `http://localhost:5173` öffnen.

### Launcher

Unter Windows startet `Start Launcher.bat` die Oberfläche und installiert
fehlende Abhängigkeiten für App und Broker. Alternativ:

```bash
npm install
npm --prefix broker install
npm run launch
```

Gleichwertig startet `node launcher.mjs` denselben Launcher. Er öffnet
`http://localhost:4321` und steuert App
(:5173) sowie Broker (:8787) getrennt. Für die reine Simulation genügt
`npm run dev`.

### Prüfen

```bash
npm test
npm run build
```

Der kanonische Einstieg in die QA-Nachweise ist
[`validation/README.md`](validation/README.md).

<a id="de-grenzen"></a>

## Bekannte Grenzen

- Klassische Wahrheitstabellen sind auf zwölf Eingänge begrenzt; größere oder
  sequenzielle Schaltungen werden mit den dafür vorgesehenen Analyseansichten
  geprüft.
- Custom ICs sind für kombinatorische Teilschaltungen ausgelegt. Flache und
  einzelne direkt verschachtelte kombinatorische Hierarchien werden unterstützt;
  tiefere oder zustandsbehaftete Verschachtelungen sind nicht allgemein
  freigegeben.
- Verilog-/VHDL-Export funktioniert für die unterstützten Schaltungspfade.
  Multi-Driver-Tri-State-Busse und tiefere Custom-IC-Hierarchien können bewusst
  mit einer Diagnose blockiert werden.
- KI-generierte `circuit-actions` sind experimentell. Die App zeigt jeden
  gültigen Aktionsblock zuerst als Vorschau und führt ihn nur nach ausdrücklicher
  Benutzerbestätigung aus. Der bestätigte Block bildet einen gemeinsamen
  Undo-Schritt.

<a id="de-repository"></a>

## Repository

| Pfad | Inhalt |
|---|---|
| `src/` | Anwendung, Simulation, Analyse, FSM und Exporte |
| [`broker/`](broker/README.md) | optionaler lokaler KI-Broker |
| [`validation/`](validation/README.md) | kanonischer QA-Einstieg, Runner und Nachweise |
| `media/` | Demo- und Oberflächenmedien |
| [`BEDIENUNGSANLEITUNG.md`](BEDIENUNGSANLEITUNG.md#deutsch) | kompakte Bedienungsanleitung |
| [`API_ANBINDUNG.md`](API_ANBINDUNG.md#deutsch) | Broker-, Provider- und Key-Konfiguration |

<a id="de-dokumentation"></a>

## Dokumentation

<div align="center">

[![Bedienung](https://img.shields.io/badge/Bedienung-24292f?style=for-the-badge)](BEDIENUNGSANLEITUNG.md#deutsch)
[![KI-Broker](https://img.shields.io/badge/KI--Broker-24292f?style=for-the-badge)](API_ANBINDUNG.md#deutsch)
[![Validierung](https://img.shields.io/badge/Validierung-24292f?style=for-the-badge)](validation/README.md)
[![Broker-Code](https://img.shields.io/badge/Broker--Code-24292f?style=for-the-badge)](broker/README.md)

</div>

<a id="de-lizenz"></a>

## Lizenz

Projekteigene Inhalte stehen unter der
[Apache License 2.0](LICENSE.md). Drittmaterial behält seine jeweiligen Rechte.

<div align="center">

[![Nach oben](https://img.shields.io/badge/⬆_Nach_oben-24292f?style=for-the-badge)](#top)

</div>

---

<a id="english"></a>

# Logic Simulator Studio

Browser-based simulator for designing, simulating, and checking digital logic
circuits. The application combines an extensive component library with timing
and race analysis, FSM tools, HDL export, and an optional local AI broker.

<div align="center">

[![Overview](https://img.shields.io/badge/Overview-24292f?style=for-the-badge)](#en-overview)
[![Features](https://img.shields.io/badge/Features-24292f?style=for-the-badge)](#en-features)
[![Start](https://img.shields.io/badge/Start-24292f?style=for-the-badge)](#en-start)
[![Limits](https://img.shields.io/badge/Limits-24292f?style=for-the-badge)](#en-limits)
[![Documentation](https://img.shields.io/badge/Documentation-24292f?style=for-the-badge)](#en-documentation)

</div>

<a id="en-overview"></a>

## Overview

| Area | Status |
|---|---|
| Frontend | React 19, TypeScript 5.9, Vite 8, and Tailwind CSS 4 |
| Simulation | combinational, sequential, feedback, and gate delay |
| Persistence | session-bound auto-save plus JSON import/export |
| AI feature | optional locally operated broker in `broker/` |
| Runtime | Node.js `^22.13` or `>=24`; Node.js 24 recommended |
| License | [Apache License 2.0](LICENSE.md) |

The simulator runs in the browser and needs neither an account nor a backend
for its core features. The broker is required only for AI chat.

<a id="en-features"></a>

## Features

| Area | Contents |
|---|---|
| Canvas | drag and drop, wiring, waypoints, zoom, pan, lasso, and context menus |
| Components | logic gates, MUX/DEMUX, ALU, comparators, flip-flops, registers, RAM/ROM, displays, and 74xx ICs |
| Simulation | discrete-event scheduler, configurable gate delays, pause, and single-step |
| Analysis | truth and state-transition tables, timing diagram, and race monitor |
| FSM | graphical editor, transition conditions, and synthesis onto the canvas |
| Custom IC | reusable combinational subcircuits |
| Files | save and load circuits as `.lgsc.json` |
| Export | JSON plus Verilog and VHDL for supported circuits |
| Editing | undo/redo through the toolbar or `Ctrl+Z` / `Ctrl+R` |
| AI | chat using a reduced context of the currently open circuit |

<a id="en-start"></a>

## Quick Start

```bash
git clone https://github.com/p-keminer/logic-simulator-studio.git
cd logic-simulator-studio
npm install
npm run dev
```

Then open `http://localhost:5173`.

### Launcher

On Windows, `Start Launcher.bat` opens the launcher and installs missing
dependencies for the app and broker. Alternatively:

```bash
npm install
npm --prefix broker install
npm run launch
```

Equivalently, `node launcher.mjs` starts the same launcher. It opens
`http://localhost:4321` and controls the app
(:5173) and broker (:8787) independently. `npm run dev` is sufficient for
simulation without AI chat.

### Verification

```bash
npm test
npm run build
```

The canonical entry point for QA evidence is
[`validation/README.md`](validation/README.md#english).

<a id="en-limits"></a>

## Known Limits

- Classic truth tables are limited to twelve inputs; larger or sequential
  circuits use their dedicated analysis views.
- Custom ICs target combinational subcircuits. Shallow and single directly
  nested combinational hierarchies are supported; deeper or stateful nesting
  is not generally approved.
- Verilog/VHDL export works for supported circuit paths. Multi-driver
  tri-state buses and deeper Custom IC hierarchies may be deliberately blocked
  with a diagnostic.
- AI-generated `circuit-actions` are experimental. The app first displays each
  valid action block as a preview and executes it only after explicit user
  confirmation. The confirmed block forms one shared undo step.

<a id="en-repository"></a>

## Repository

| Path | Contents |
|---|---|
| `src/` | application, simulation, analysis, FSM, and exports |
| [`broker/`](broker/README.md#english) | optional local AI broker |
| [`validation/`](validation/README.md#english) | canonical QA entry point, runners, and evidence |
| `media/` | demo and UI media |
| [`BEDIENUNGSANLEITUNG.md`](BEDIENUNGSANLEITUNG.md#english) | compact user manual |
| [`API_ANBINDUNG.md`](API_ANBINDUNG.md#english) | broker, provider, and key configuration |

<a id="en-documentation"></a>

## Documentation

<div align="center">

[![User Manual](https://img.shields.io/badge/User_Manual-24292f?style=for-the-badge)](BEDIENUNGSANLEITUNG.md#english)
[![AI Broker](https://img.shields.io/badge/AI--Broker-24292f?style=for-the-badge)](API_ANBINDUNG.md#english)
[![Validation](https://img.shields.io/badge/Validation-24292f?style=for-the-badge)](validation/README.md#english)
[![Broker Code](https://img.shields.io/badge/Broker--Code-24292f?style=for-the-badge)](broker/README.md#english)

</div>

<a id="en-license"></a>

## License

Project-owned content is licensed under the
[Apache License 2.0](LICENSE.md). Third-party material retains its respective
rights.

<div align="center">

[![Back to top](https://img.shields.io/badge/⬆_Back_to_top-24292f?style=for-the-badge)](#top)

</div>
