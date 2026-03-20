# validation/ - Kanonischer Einstiegspunkt

**Projekt:** logic-gate-simulator
**Stand:** 2026-03-20
**Qualitaetsstand:** 868/868 Tests gruen - Contract Runner und Golden Corpus auf aktuellem 19.03-Stand verifiziert; UI-Timing-Audit in CI semantisch gruen

---

## Aktueller Qualitaetsstand

| Metrik | Wert |
|---|---|
| Vitest-Suite | **868/868** pass |
| Build | pass (`tsc -b` + `vite build`) |
| Lint | pass |
| Contract Runner v1 | **447 pass, 0 fail, 0 unsupported** (447 total) |
| Golden Corpus v1 | **23 pass, 0 fail, 1 expected_limit, 0 unsupported** (24 total) |
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
Automatisierter Vertragslaeufer fuer 86 Gate-Contracts (447 Einzelfaelle). Verifiziert Gate-Verhalten gegen maschinenlesbare Spezifikationen. Laeuft als eigenes CI-Gate. Status: 447 pass, 0 unsupported. Multi-Driver-Konflikte fuer TRIBUF, 74HC373, 74HC374 und RAM256 werden jetzt mit shared-bus-Resolution wirklich ausgefuehrt statt nur dokumentiert.

### 4. Golden Corpus v1 -> golden-corpus-v1-report.md + golden-corpus-v1-summary.json
Basis-Regressionssuite mit 24 Referenzschaltungen ueber alle 4 Klassen (combinational, sequential, tristate, mixed), jetzt inklusive der neun v2-Pilot-Seeds `gc_v2_1_mux_fabric`, `gc_v2_2_datapath_slice`, `gc_v2_3_shift_pipeline`, `gc_v2_4_ram_readback`, `gc_v2_5_decode_tree`, `gc_v2_6_custom_halfadder`, `gc_v2_7_bus_conflict_system`, `gc_v2_8_sequential_feedback` und `gc_v2_9_custom_reg4_pipeline`. Prueft Datei-/Slug-Konsistenz, JSON-Parsebarkeit, Gate-Typen, Ein-/Ausgaenge, Verilog-/VHDL-Struktursanity, Checkpoint-Matching, externe HDL-Syntax/Lint-Checks (iverilog, verilator, yosys, ghdl), szenariobasierte externe HDL-Simulation und live Re-Export-Diffs. `gc_t2_bus_mux` ist bewusst `expected_limit` (dokumentierte Exporter-Grenze: Multi-Driver-Tri-State-Bus, last-wire-wins). `gc_v2_6_custom_halfadder` und `gc_v2_9_custom_reg4_pipeline` bilden jetzt zwei verifizierte one-level-Hierarchie/custom-IC-Pfade via strukturellem Flattening ab. `gc_v2_8_sequential_feedback` erweitert die Basis zusaetzlich um einen mehrtaktigen sequentiellen Feedback-Fall mit Seed-Load und XOR-Rueckkopplung. Laeuft als eigenes CI-Gate.

### 5. Focused-Nine Core -> focused-nine-report.md + focused-nine-summary.json
Hochrisiko-Suite fuer 12 Schaltungen. Simulationslauf + HDL-Toolchain-Verifikation (iverilog, ghdl, yosys, verilator). Laeuft als eigenes CI-Gate mit HDL-Tool-Installation.

### 6. UI-Audit -> focused-nine-ui-report.md + focused-nine-ui-summary.json
Browser-Audit der 12 Fokusfaelle: STT-Projektion, HDL-Modal-Konsistenz, Screenshots. Aktueller Stand: **12** Smoke-Passes, **0** echte UI-Fehler, **5** semantische Timing-Passes, **0** semantische Warnungen. Laeuft als eigenes CI-Gate.

### 7. Roadmap -> industry-lite-roadmap.md
Drei Reifegrad-Stufen (Teaching Tool / Design Tool / Industry-Lite EDA) mit 6 Arbeitsstromen. Langfristiger Horizont.

### 8. Offenes FSM-Arbeitspaket -> fsm-export-fixes/work-package.md
Strukturelles Arbeitspaket fuer alle aus dem FSM-Editor synthetisierten Exporte. Dokumentiert die aktuell bekannten UI-/STT-/Timing-Semantikbrueche, die ersten Architekturideen fuer eine allgemeine Loesung, den geplanten read-only Sequential-Projection-Layer fuer statische/verkuerzte STT und die offenen Unterpakete.

### 9. Offenes Race-Arbeitspaket -> race-panel-fixes/work-package.md
Strukturelles Arbeitspaket fuer Race-Panel, Race-Markierungen und Race-Lifecycle im Store. Dokumentiert Reset-, Prune- und Dedupe-Anforderungen sowie die geforderte Trennung von Race-Logik und reinem UI-Rendering.

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
| `golden-corpus-v1.md` | Reale Golden-Corpus-v1-Suite mit 24 Referenzschaltungen |
| `golden-corpus-v1.json` | Maschinenlesbarer Index fuer Golden-Corpus v1 |
| `golden-corpus-plan.md` | Plan fuer 25 Referenzschaltungen in 5 Tracks |
| `industry-lite-roadmap.md` | Arbeitsstrom-Roadmap (W1-W6, Phasen A-D) |
| `fsm-export-fixes/work-package.md` | Offenes Struktur-Arbeitspaket fuer FSM-Exportprojektionen (STT, Timing, Metadaten, Validation). Bereits umgesetzt sind Projektionsmetadaten, `projectionBatchId`, der zentrale `buildStateTransitionProjection(...)`-Pfad, ein kleiner Core-Helfer fuer statische/reduzierte STT, eine STT-Ansichtsumschaltung (`FSM kompakt` / `Technisch voll`) fuer projected FSMs, statusbasierte Mixed-Fallback-Regeln fuer partielle Projektionen und focused-nine UI-Audit-Checks fuer projected-vs.-fallback STT-Modi. Der naechste Schritt bleibt weiterhin klein: den neuen STT-Kern belastbar halten und erst danach feinere Subsystem-Grenzen planen. |
| `fsm-export-fixes/README.md` | Einstiegspunkt fuer Repro-Faelle und Fix-Hierarchie rund um FSM-Exporte |
| `race-panel-fixes/work-package.md` | Offenes Struktur-Arbeitspaket fuer Race-Panel-Reset, Pruning, Dedupe und Lifecycle-Logik |
| `race-panel-fixes/README.md` | Einstiegspunkt fuer die Race-Fix-Hierarchie |
| `verification-matrix.md` | Pflichtpruefmuster je Gate-Klasse und Freigaberegeln |
| `ui-manual-verification-plan.md` | Manueller UI-Pruefplan fuer FSM-Projektion, STT, Timing und Panel-Persistenz |
| `claude-integration-review.md` | Bewertung der Claude-Integration im Projekt |
| `audit-determinism-report.md` | Determinismus-/CI-Tauglichkeitsbericht fuer focused-nine core und UI |
| `audit-determinism-summary.json` | Maschinenlesbare Determinismus-Zusammenfassung |

### Runner und CI-Skripte

| Datei | Inhalt |
|---|---|
| `run-contract-runner.mjs` | Contract Runner v1  verifiziert 86 Gate-Contracts (447 Faelle) |
| `run-golden-corpus-v1.mjs` | Golden Corpus v1 Runner  verifiziert 24 Referenzschaltungen |
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
| `generated-circuits-golden/` | 24 Schaltungsdefinitionen (.lgsc.json)  Golden Corpus v1 |
| `generated-exports-golden/` | 24 x Verilog + 24 x VHDL Exporte  Golden Corpus v1 |

### Gate-Spezifikation und Inventar

| Datei | Inhalt |
|---|---|
| `gate-contract-schema.json` | JSON Schema (Draft-07) fuer Gate-Contracts |
| `gate-inventory.json` | Alle 83 Gate-Eintraege mit Metadaten |
| `gate-gap-analysis.md` | Gap-Analyse (11 Abschnitte): HDL-Luecken, Timing-Risiken, Tri-State, UI |
| `testability-mapping.json` | 18 Gate-Klassen, 14 Testmuster, 124 Slots |
| `contracts/` | 86 Gate-Contracts mit Schema-validierten Gate-Spezifikationen |

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
- **P1/P2:** Das offene Race-Arbeitspaket abarbeiten (`validation/race-panel-fixes/work-package.md`): store-seitiges Pruning geloeschter Race-Ursachen, manueller Reset, signaturbasiertes Dedupe und entkoppelte Race-Lifecycle-Logik
- **P1/P2:** Das offene Struktur-Arbeitspaket fuer FSM-Exporte in kleinen Schritten weiterziehen (`validation/fsm-export-fixes/work-package.md`): den neuen STT-Core-Helfer und die expliziten Mixed-Fallbacks weiter ueber breite/gemischte Sequential-Faelle absichern und erst danach feinere Subsystem-Grenzen angehen, ohne das UI-Wiring gross umzubauen
- **P2:** Contract-Runner-Abdeckung weiter verbreitern (komplexere circuit-level Muster und tiefere Invarianten)
- **P1/P2:** Funktionale Schaltungssimulation im Golden Corpus weiter vertiefen (laengere Traces statt nur kurzer Szenarien)
- **P2:** Golden Corpus v2 ausbauen (mehr Schaltungen, tiefere HDL-Traces, zweite Hierarchie-Stufe, groessere Designs)
- **P2:** Den neuen Custom-IC-HDL-Pfad weiter absichern (mehr Hierarchiefaelle, explizite Grenzen fuer Nested-Custom-ICs)
- **P2:** Branch Protection / Required Checks in GitHub Settings konfigurieren (externer Schritt)
- **P2:** CI-Performance (HDL-Tool-Caching, Docker-Image)
