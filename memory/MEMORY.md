# LogicSim Studio - Projektwissen

## Stack
- React + TypeScript + Vite + Tailwind CSS
- Kein Backend, rein clientseitig
- State: circuitReducer (Immer-Pattern), FsmContext

## Architektur
- `src/core/` – Engine, Typen, VHDL/Verilog-Export
- `src/gates/` – Gate-Definitionen (evaluate, shapes, toVHDL/toVerilog)
- `src/fsm/` – FSM-Typen, Reducer, Synthese
- `src/components/` – Canvas, FSM-Editor, Toolbar, Panels

## Bugs (2026-02-27 behoben)
Siehe `bugs.md` für Details. Kurzfassung:
- VHDL/Verilog: FFs hatten kein toVHDL/toVerilog, Portlisten-Bugs, wire vs reg
- FSM: Grid-Pan-Bug, Moore-Output-Anzeige (`.reverse()` falsch), isInitial-Edge-Case
- FSM: Transition-Label-Overflow, kein Doppelklick zum Bearbeiten
