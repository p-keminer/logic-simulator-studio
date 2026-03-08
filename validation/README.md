# validation/ - Kanonischer Einstiegspunkt

**Projekt:** logic-gate-simulator
**Stand:** 2026-03-08
**Qualitaetsstand:** 845/845 Tests gruen - P0, P1a, P1b, P1-1 bis P1-7 verifiziert; UI-Timing-Audit in CI semantisch gruen

---

## Aktueller Qualitaetsstand

| Metrik | Wert |
|---|---|
| Vitest-Suite | **845/845** pass |
| Build | pass (`tsc -b` + `vite build`) |
| Lint | pass |
| Contract Runner v1 | **91 pass, 0 fail, 34 unsupported** (125 total) |
| Golden Corpus v1 | **11 pass, 0 fail, 1 expected_limit, 0 unsupported** (12 total) |
| Focused-Nine Core | **12/12** pass, 0 HDL-Fails, 0 Tooling-Warnungen |
| CI-Jobs | 6 Jobs: quality-gates, contract-runner, golden-corpus, focused-nine-ui, focused-nine-core, hdl-toolchain |
| Harte Restfehler (Simulation) | **0** |
| Toolchain-Failures (HDL) | **0** |
| UI-Timing-Semantik (fokussierter Lauf) | **5 PASS, 0 WARN** (verifiziert und als CI-Gate verdrahtet) |

---

## Welche Berichte zuerst lesen 

### 1. Schnellueberblick -> maturity-gap-dashboard.md
Konsolidierter Reifegrad-Bericht nach 7 Kriterien. Enthaelt bestaetigte Staerken, offene Schwaechen, Blocker und naechste Schritte.

### 2. Priorisierte Aufgabenliste -> maturity-priority-list.json
Maschinenlesbare Eintraege (P0/P1/P2) mit Status, Evidenz, betroffenen Gates und empfohlenem naechsten Schritt.

### 3. Contract Runner -> contract-runner-report.md + contract-runner-summary.json
Automatisierter Vertragslaeufer fuer 12 Gate-Contracts (125 Einzelfaelle). Verifiziert Gate-Verhalten gegen maschinenlesbare Spezifikationen. Laeuft als eigenes CI-Gate. Status: 91 pass, 34 unsupported (fehlende Testmuster, kein Fehler).

### 4. Golden Corpus v1 -> golden-corpus-v1-report.md + golden-corpus-v1-summary.json
Basis-Regressionssuite mit 12 Referenzschaltungen ueber alle 4 Klassen (combinational, sequential, tristate, mixed). Prueft Datei-/Slug-Konsistenz, JSON-Parsebarkeit, Gate-Typen, Ein-/Ausgaenge, Verilog-/VHDL-Struktursanity und Checkpoint-Matching. `gc_t2_bus_mux` ist bewusst `expected_limit` (dokumentierte Exporter-Grenze: Multi-Driver-Tri-State-Bus, last-wire-wins). Laeuft als eigenes CI-Gate.

### 5. Focused-Nine Core -> focused-nine-report.md + focused-nine-summary.json
Hochrisiko-Suite fuer 12 Schaltungen. Simulationslauf + HDL-Toolchain-Verifikation (iverilog, ghdl, yosys, verilator). Laeuft als eigenes CI-Gate mit HDL-Tool-Installation.

### 6. UI-Audit -> focused-nine-ui-report.md + focused-nine-ui-summary.json
Browser-Audit der 12 Fokusfaelle: STT-Projektion, HDL-Modal-Konsistenz, Screenshots. Aktueller Stand: **12** Smoke-Passes, **0** echte UI-Fehler, **5** semantische Timing-Passes, **0** semantische Warnungen. Laeuft als eigenes CI-Gate.

### 7. Roadmap -> industry-lite-roadmap.md
Drei Reifegrad-Stufen (Teaching Tool / Design Tool / Industry-Lite EDA) mit 6 Arbeitsstromen. Langfristiger Horizont.

---

## CI-Struktur

Die CI-Pipeline (`.github/workflows/quality-gates.yml`) hat 6 Jobs:

| Job | Inhalt | Abhaengigkeit |
|---|---|---|
| `quality-gates` | npm test, build, lint | - |
| `contract-runner` | Contract Runner v1 + Invariant-Validation | quality-gates |
| `golden-corpus` | Golden Corpus v1 Runner + Invariant-Validation | quality-gates |
| `focused-nine-ui` | Browser-UI-Audit der 12 Fokusfaelle | quality-gates |
| `focused-nine-core` | 12-case Simulation + HDL-Regression | quality-gates |
| `hdl-toolchain` | iverilog/ghdl/yosys/verilator Praesenzpruefung | - |

Alle fachlichen Jobs laden ihre Reports als CI-Artefakte hoch. Branch-Protection-Rules muessen manuell in GitHub Settings konfiguriert werden (externer Schritt).

---

## Vollstaendiger Dateiindex

### Kanonische Berichte (immer aktuell)

| Datei | Inhalt |
|---|---|
| `maturity-gap-dashboard.md` | Reifegrad nach 7 Kriterien, offene Blocker, Prioritaetssummary |
| `maturity-priority-list.json` | Maschinenlesbare Eintraege P0/P1/P2 mit Status und Evidenz |
| `golden-corpus-v1.md` | Reale Golden-Corpus-v1-Suite mit 12 Referenzschaltungen |
| `golden-corpus-v1.json` | Maschinenlesbarer Index fuer Golden-Corpus v1 |
| `golden-corpus-plan.md` | Plan fuer 25 Referenzschaltungen in 5 Tracks |
| `industry-lite-roadmap.md` | Arbeitsstrom-Roadmap (W1-W6, Phasen A-D) |
| `verification-matrix.md` | Pflichtpruefmuster je Gate-Klasse und Freigaberegeln |
| `claude-integration-review.md` | Bewertung der Claude-Integration im Projekt |
| `audit-determinism-report.md` | Determinismus-/CI-Tauglichkeitsbericht fuer focused-nine core und UI |
| `audit-determinism-summary.json` | Maschinenlesbare Determinismus-Zusammenfassung |

### Runner und CI-Skripte

| Datei | Inhalt |
|---|---|
| `run-contract-runner.mjs` | Contract Runner v1  verifiziert 12 Gate-Contracts (125 Faelle) |
| `run-golden-corpus-v1.mjs` | Golden Corpus v1 Runner  verifiziert 12 Referenzschaltungen |
| `contract-runner-summary.json` | Ergebnis des Contract Runners (maschinenlesbar) |
| `contract-runner-report.md` | Ergebnis des Contract Runners (menschenlesbar) |
| `golden-corpus-v1-summary.json` | Ergebnis des Golden Corpus Runners (maschinenlesbar) |
| `golden-corpus-v1-report.md` | Ergebnis des Golden Corpus Runners (menschenlesbar) |

### Audit-Rohdaten und -Berichte (fokussierter Lauf, 12 Schaltungen)

| Datei | Inhalt |
|---|---|
| `focused-nine-audit.mjs` | Simulations-Audit-Runner |
| `focused-nine-summary.json` | Rohdaten: 12 Schaltungen x Simulation + Toolchain |
| `focused-nine-report.md` | Aufbereiteter Bericht des Simulations-Audits |
| `focused-nine-ui-audit.mjs` | UI-Audit-Runner |
| `focused-nine-ui-summary.json` | Rohdaten: UI-Audit-Ergebnisse |
| `focused-nine-ui-report.md` | Aufbereiteter Bericht des UI-Audits |
| `diff-audit-runs.mjs` | Vergleichstool fuer wiederholte Audit-Laeufe |

### Generierte Artefakte

| Verzeichnis | Inhalt |
|---|---|
| `generated-circuits-focused/` | 12 Schaltungsdefinitionen (.lgsc.json)  Focused-Nine |
| `generated-exports-focused/` | 12 x Verilog + VHDL Exporte  Focused-Nine |
| `generated-ui-focused/` | 8 UI-Screenshots  Focused-Nine |
| `generated-circuits-golden/` | 12 Schaltungsdefinitionen (.lgsc.json)  Golden Corpus v1 |
| `generated-exports-golden/` | 12 x Verilog + VHDL Exporte  Golden Corpus v1 |

### Gate-Spezifikation und Inventar

| Datei | Inhalt |
|---|---|
| `gate-contract-schema.json` | JSON Schema (Draft-07) fuer Gate-Contracts |
| `gate-inventory.json` | Alle 83 Gate-Eintraege mit Metadaten |
| `gate-gap-analysis.md` | Gap-Analyse (11 Abschnitte): HDL-Luecken, Timing-Risiken, Tri-State, UI |
| `testability-mapping.json` | 18 Gate-Klassen, 14 Testmuster, 124 Slots |
| `contracts/` | 12 Gate-Contracts (74HC74, 74HC161/163/194/373/374/595, D_FF, JK_FF, SR_LATCH, D_LATCH, TRIBUF) |

### HDL-Diff-Infrastruktur (in Entwicklung)

| Datei | Inhalt |
|---|---|
| `hdl-diff/types.ts` | TypeScript-Typen fuer HDL-Differenztest-Pipeline |

---

## Was ist archiviert 

`archive/pre-p0/` enthaelt Artefakte aus dem Audit-Durchlauf **vor** den P1a/P1b-Fixes:
- `audit-current.mjs`, `ui-audit-current.mjs`  aeltere Audit-Runner
- `current-fix-verification-report.md`, `fix-verification-summary.json`  Fix-Verifikation (662 Tests, hc194/ALU4 GHDL noch rot)
- `command-summary.json`, `ui-summary-current.json`  Rohdaten des current-Laufs
- `generated-circuits-current/`, `generated-exports-current/`, `generated-ui-current/`  generierte Artefakte des current-Laufs

Siehe `archive/pre-p0/README.md` fuer Details.

---

## Naechste Phase

Die naechsten sinnvollen Schritte sind jetzt:
- **P2:** Export-Determinismus / Re-Export-Diff in Golden Corpus aufnehmen
- **P1/P2:** Funktionale Schaltungssimulation im Golden Corpus (Truth-Table-/Step-Sequence-Verifikation)
- **P2:** Golden Corpus v2 ausbauen (mehr Schaltungen, Hierarchie, grosse Designs)
- **P2:** Branch Protection / Required Checks in GitHub Settings konfigurieren (externer Schritt)
- **P2:** CI-Performance (HDL-Tool-Caching, Docker-Image)
