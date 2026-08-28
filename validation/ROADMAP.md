<a id="top"></a>

<div align="center">

[![Deutsch](https://img.shields.io/badge/🇩🇪_Deutsch-24292f?style=for-the-badge)](#deutsch)
[![English](https://img.shields.io/badge/🇬🇧_English-24292f?style=for-the-badge)](#english)

</div>

---

<a id="deutsch"></a>

# Validierungs-Roadmap

Die aktuelle Suite ist ausführbar und CI-fähig. Diese Liste enthält nur
optionale Vertiefungen; sie ist kein Freigabeprotokoll und keine Sammlung
bereits erledigter Arbeitspakete.

| Thema | Sinnvoller nächster Schritt |
|---|---|
| Undo/Redo | Zustands-Snapshots für laufende Simulation, Viewport und erneutes Einschwingen gezielt härten |
| Simulation | manuellen Flip-Flop-Startzustand und einen pausierten Standardstart fachlich entscheiden |
| FSM | große Zustandsautomaten vor der Canvas-Synthese minimieren und das Mapping absichern |
| Custom IC | zusätzliche Hierarchiefälle testen und die erlaubte Verschachtelung klar begrenzen |
| HDL | visuelle Waveform-Differenzen ergänzend zu Syntax, Lint und Simulation prüfen |
| Repository | Required Checks und Branch Protection in GitHub aktivieren |

Neue Punkte werden nur aufgenommen, wenn ein reproduzierbarer Fall oder eine
konkrete Produktentscheidung vorliegt. Abgeschlossene Punkte werden entfernt;
der Nachweis bleibt im Test oder in der fachlich relevanten ADR.

[Validierungsübersicht](README.md) · [Nach oben](#top)

---

<a id="english"></a>

# Validation Roadmap

The current suite is executable and CI-ready. This list contains optional
follow-up work only; it is neither a release record nor an archive of completed
work packages.

| Area | Useful next step |
|---|---|
| Undo/redo | Harden snapshots for live simulation state, viewport state, and re-settling |
| Simulation | Decide on manual flip-flop initial state and paused-by-default startup |
| FSM | Minimize wide state machines before canvas synthesis and verify mapping |
| Custom IC | Cover more hierarchy cases and state the supported nesting boundary |
| HDL | Add visual waveform comparison alongside syntax, lint, and simulation checks |
| Repository | Enable required checks and branch protection on GitHub |

Add an item only when a reproducible case or concrete product decision exists.
Remove completed items; their evidence belongs in the executable test or the
relevant ADR.

[Validation overview](README.md#english) · [Back to top](#top)
