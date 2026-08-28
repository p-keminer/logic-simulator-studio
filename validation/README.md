<a id="top"></a>

<div align="center">

[![Deutsch](https://img.shields.io/badge/🇩🇪_Deutsch-24292f?style=for-the-badge)](#deutsch)
[![English](https://img.shields.io/badge/🇬🇧_English-24292f?style=for-the-badge)](#english)

</div>

---

<a id="deutsch"></a>

# Validierung

Dieser Ordner enthält die reproduzierbaren Qualitätsprüfungen des Logic
Simulator Studio. Versioniert werden nur ausführbare Runner, Testverträge,
Eingabedaten und fachlich relevante Baselines. Berichte, Screenshots und andere
Laufergebnisse entstehen unter `.artifacts/validation/` und bleiben außerhalb
der Git-Historie.

<div align="center">

[![Prüfen](https://img.shields.io/badge/Pr%C3%BCfen-24292f?style=for-the-badge)](#de-pruefen)
[![Struktur](https://img.shields.io/badge/Struktur-24292f?style=for-the-badge)](#de-struktur)
[![Pflege](https://img.shields.io/badge/Pflege-24292f?style=for-the-badge)](#de-pflege)
[![Roadmap](https://img.shields.io/badge/Roadmap-24292f?style=for-the-badge)](ROADMAP.md)

</div>

<a id="de-pruefen"></a>

## Prüfen

| Prüfung | Befehl | Zweck |
|---|---|---|
| Unit- und Integrationstests | `npm test` | Anwendung, Import/Export, FSM und UI-Logik |
| Gate-Verträge | `npm run contract:test` | Schema und Verhalten aller Gate-Contracts |
| Golden Corpus | `npm run golden:test` | Simulation sowie Verilog-/VHDL-Baselines |
| Focused Core | `bash scripts/ci/run_focused_nine_core.sh` | Risikofälle mit externer HDL-Toolchain |
| Focused UI | `bash scripts/ci/run_focused_nine_ui.sh` | Browserprüfung, Timingansicht und HDL-Dialoge |
| Broker | `npm --prefix broker test` | Broker-, Policy- und Sicherheitstests |

Die CI installiert für die HDL-Läufe `iverilog`, `ghdl`, `yosys` und
`verilator`. Ohne diese Werkzeuge können lokale Golden-Corpus-Prüfungen
unterstützte Exportgrenzen melden; die eigentliche Anwendungssuite bleibt davon
unabhängig.

Zwei Golden-Corpus-Fälle dokumentieren bewusst bekannte Grenzen:
`gc_t2_bus_mux` für Multi-Driver-Tri-State-Export und
`gc_v2_13_deep_nested_halfadder_boundary` für tiefer verschachtelte Custom ICs.
Sie werden als `expected_limit`, nicht als stiller Erfolg, ausgewiesen.

<a id="de-struktur"></a>

## Struktur

| Pfad | Inhalt |
|---|---|
| `contracts/` | 86 maschinenlesbare Gate-Verträge |
| `gate-contract-schema.json` | gemeinsames Schema der Verträge |
| `fixtures/golden-corpus/` | kanonische Schaltungen des Golden Corpus |
| `fixtures/fsm/` | tatsächlich importierte FSM-Regressionsfälle |
| `baselines/golden-hdl/` | erwartete Verilog- und VHDL-Snapshots |
| `run-contract-runner.mjs` | Vertrags- und Schema-Runner |
| `run-golden-corpus-v1.mjs` | Golden-Corpus-Runner |
| `focused-nine-*.mjs` | fokussierte Core- und Browserprüfungen |
| `api_anbindung/` | aktive Broker-, Sicherheits- und Protokolldokumentation |

Die Runner schreiben ausschließlich nach `.artifacts/validation/`. GitHub
Actions lädt diese Verzeichnisse bei Bedarf als Build-Artefakte hoch.

<a id="de-pflege"></a>

## Pflegeregeln

- Neue Regressionen erhalten ein kleines, begründetes Fixture und einen
  ausführbaren Test.
- Golden-Baselines werden nur über `regenerate-golden-exports.mjs` erneuert und
  gemeinsam mit der fachlichen Änderung geprüft.
- Generierte Reports, Screenshots, temporäre Exporte und Laufzusammenfassungen
  werden nicht committed.
- Dokumentation nennt keine dauerhaft festgeschriebenen Pass-Zahlen; die Runner
  sind die aktuelle Quelle.
- Offene, nicht blockierende Ausbaupunkte stehen ausschließlich in
  [`ROADMAP.md`](ROADMAP.md).

Zum Broker gehören die Betriebsanleitung in [`broker/README.md`](../broker/README.md),
das [Action-Protokoll](api_anbindung/action-protocol/spec.md), die
[Architekturentscheidungen](api_anbindung/decisions/) und die
[Sicherheitsdokumentation](api_anbindung/security/).

[Nach oben](#top)

---

<a id="english"></a>

# Validation

This directory contains the reproducible quality checks for Logic Simulator
Studio. Git tracks executable runners, contracts, input fixtures, and meaningful
baselines only. Reports, screenshots, and other run output are generated below
`.artifacts/validation/` and stay out of repository history.

<div align="center">

[![Checks](https://img.shields.io/badge/Checks-24292f?style=for-the-badge)](#en-checks)
[![Layout](https://img.shields.io/badge/Layout-24292f?style=for-the-badge)](#en-layout)
[![Maintenance](https://img.shields.io/badge/Maintenance-24292f?style=for-the-badge)](#en-maintenance)
[![Roadmap](https://img.shields.io/badge/Roadmap-24292f?style=for-the-badge)](ROADMAP.md#english)

</div>

<a id="en-checks"></a>

## Checks

| Check | Command | Purpose |
|---|---|---|
| Unit and integration | `npm test` | App, import/export, FSM, and UI logic |
| Gate contracts | `npm run contract:test` | Schema and behavior of every gate contract |
| Golden Corpus | `npm run golden:test` | Simulation plus Verilog/VHDL baselines |
| Focused Core | `bash scripts/ci/run_focused_nine_core.sh` | High-risk cases with external HDL tools |
| Focused UI | `bash scripts/ci/run_focused_nine_ui.sh` | Browser, timing view, and HDL dialogs |
| Broker | `npm --prefix broker test` | Broker, policy, and security tests |

CI installs `iverilog`, `ghdl`, `yosys`, and `verilator` for the HDL jobs.
Without these tools, local Golden Corpus runs may report supported export
boundaries; the application test suite remains independent of them. The Golden
Corpus records `gc_t2_bus_mux` and
`gc_v2_13_deep_nested_halfadder_boundary` as explicit `expected_limit` cases for
the currently documented exporter boundaries.

<a id="en-layout"></a>

## Layout

| Path | Contents |
|---|---|
| `contracts/` | 86 machine-readable gate contracts |
| `gate-contract-schema.json` | shared contract schema |
| `fixtures/golden-corpus/` | canonical Golden Corpus circuits |
| `fixtures/fsm/` | FSM fixtures imported by active regression tests |
| `baselines/golden-hdl/` | expected Verilog and VHDL snapshots |
| `run-contract-runner.mjs` | contract and schema runner |
| `run-golden-corpus-v1.mjs` | Golden Corpus runner |
| `focused-nine-*.mjs` | focused core and browser checks |
| `api_anbindung/` | active broker, security, and protocol documentation |

All generated output lives below `.artifacts/validation/`; CI may upload it as
a workflow artifact.

<a id="en-maintenance"></a>

## Maintenance

- Add a small justified fixture and an executable regression for new defects.
- Regenerate Golden baselines only through `regenerate-golden-exports.mjs` and
  review them with the corresponding behavior change.
- Never commit generated reports, screenshots, temporary exports, or summaries.
- Do not hard-code pass counts in documentation; the runners are authoritative.
- Keep non-blocking follow-up work in [`ROADMAP.md`](ROADMAP.md#english) only.

Broker operations are documented in [`broker/README.md`](../broker/README.md#english).
See the [action protocol](api_anbindung/action-protocol/spec.md),
[architecture decisions](api_anbindung/decisions/), and
[security notes](api_anbindung/security/) for the maintained design records.

[Back to top](#top)
