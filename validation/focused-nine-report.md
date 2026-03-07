# Focused High-Risk Audit

Datum: 2026-03-07
Repo: <repo-root>

## QA-Basis

- Vitest: manually re-run 2026-03-07: 713/713 pass
- Build: manually re-run 2026-03-07: tsc -b + vite build pass; bundle-size warning only
- Lint: manually re-run 2026-03-07: pass
- Vite-Server: <dev-server>

## Fokusmuster

- `tri_not_sanitized`: pass (Downstream logic no longer collapses Z to 0 before NOT)
- `dff_led`: pass (D_FF output and state stay aligned after a rising edge)
- `jkff_led`: pass (JK_FF sets and resets correctly over two edges)
- `tff_led`: pass (T_FF toggles on successive rising edges)
- `hc373_oe_z`: pass (74HC373 drives HI_Z when OE is inactive)
- `hc374_oe_z`: pass (74HC374 drives HI_Z when OE is inactive)
- `hc595_oe_shift`: pass (74HC595 keeps latch contents across /MR and tri-states on OE)
- `hc161_clear`: pass (74HC161 keeps async clear distinct from clocked counting)
- `hc163_clear`: pass (74HC163 keeps synchronous clear gated by the clock edge)
- `hc194_modes`: pass (74HC194 still covers hold, shift-left, shift-right, load and async clear)
- `multi_driver_same_input`: pass (Conflicting drivers on one destination port correctly resolve to X (3))
- `mixed_datapath`: pass (Mixed datapath keeps counter, ALU and register sequencing consistent over two cycles)

## Harte Restfehler

- keine

## HDL-/Synthese-Fails

- keine

## Tooling-/Synthesehinweise

- keine

## Einordnung Richtung Industry-Lite EDA

- Fortschritt: das Kernmodell deckt jetzt 0/1/Z/X ab; Tri-State, Mehrtreiber, Counter, Shift-Register und gemischte Datenpfade sind fuer die 12 Fokusmuster reproduzierbar gruen. Transparent-Latch-Export nutzt Verilog-2001 mit verilator lint_off/on LATCH-Direktive, Verilator-LATCH-Warnung beseitigt.
- Offen: breitere semantische Differenztests ausserhalb des Fokus-Corpus und tiefere UI-/Timing-Diffs.
- Naechste sinnvolle P1-Themen: UI-Zustandsanalyse fuer breite sequentielle Faelle und Timing-Waveform-Diff.
