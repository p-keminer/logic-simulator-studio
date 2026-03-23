# validation/ - Kanonischer Einstiegspunkt

**Projekt:** logic-gate-simulator
**Stand:** 2026-03-23
**Qualitaetsstand:** 1020/1020 Tests gruen - Contract Runner und Golden Corpus verifiziert; UI-Timing-Audit in CI semantisch gruen; `lint` ist aktuell noch nicht voll gruen wegen Restpunkten im Broker-/Sandbox-Pfad

---

## Dokumentenrollen und Redundanzregeln

Aktive kanonische Steuerdokumente:

- `../ROADMAP`
  zentrale Reihenfolge-, Slice- und Pflichtvalidierungssteuerung
- `validation/README.md`
  Einstiegspunkt in Reports, Runner und Validation-Artefakte
- `validation/api_anbindung/work-package.md`
  aktiver API-/Broker-Pfad
- `validation/ux-feinschliff/work-package.md`
  aktiver UX-Feinschliff-/Intake-Pfad fuer kleine Bedienungsnacharbeiten
- `validation/fsm0/work-package.md`
  FSM-Pfad; aktueller Scope abgeschlossen, Folgeausbau dokumentiert
- `validation/race-panel-fixes/work-package.md`
  aktiver Race-/Panel-Pfad

Bewusst getrennt, nicht redundant:

- `validation/industry-lite-roadmap.md`
  langfristige Reifegrad- und Ausbau-Roadmap
- `validation/verification-matrix.md`
  feste Pruefmuster und Freigaberegeln
- `validation/golden-corpus-plan.md`
  Ausbauplan fuer Referenzschaltungen
- `validation/ui-manual-verification-plan.md`
  manuelle End-to-End-Pruefung sichtbarer UI-Slices

Historisch bzw. nachweisorientiert:

- `validation/fsm-export-fixes/cases/`
  Legacy-Fixtures und gespeicherte Repro-Faelle fuer den FSM-Pfad
- `archive/pre-p0/`
  Altstand vor spaeteren P0/P1-Pfaden

Pflegeregel:

- neue aktive Planung nicht parallel in mehreren Dokus nachziehen
- Verlauf, Repros und Altstaende bewusst von aktiven Plaenen trennen
- bei neuen sichtbaren UI-Faellen immer auch `ui-manual-verification-plan.md`
  mitziehen
- nach jeder Aenderung an Doku-Quellen `npm run snapshot:sync` ausfuehren,
  damit `SNAPSHOT/` aktuell bleibt

---

## Aktueller Qualitaetsstand

| Metrik | Wert |
|---|---|
| Vitest-Suite | **1020/1020** pass |
| Build | pass (`tsc -b` + `vite build`) |
| Lint | fail (Restpunkte in `src/hooks/useBackendSandboxDebugBridge.ts` sowie `validation/api_anbindung/backend-sandbox/src/modules/provider-gateway/*`) |
| Contract Runner v1 | **447 pass, 0 fail, 0 unsupported** (447 total) |
| Golden Corpus v1 | **28 pass, 0 fail, 2 expected_limit, 0 unsupported** (30 total) |
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

### 4. Golden Corpus v1 -> golden-corpus-v1-report.md + golden-corpus-v1-summary.json + golden-corpus-v1-acceptance.json
Basis-Regressionssuite mit 30 Referenzschaltungen ueber alle 4 Klassen (combinational, sequential, tristate, mixed), jetzt inklusive der fuenfzehn v2-Pilot-Seeds `gc_v2_1_mux_fabric`, `gc_v2_2_datapath_slice`, `gc_v2_3_shift_pipeline`, `gc_v2_4_ram_readback`, `gc_v2_5_decode_tree`, `gc_v2_6_custom_halfadder`, `gc_v2_7_bus_conflict_system`, `gc_v2_8_sequential_feedback`, `gc_v2_9_custom_reg4_pipeline`, `gc_v2_10_custom_tribuf_wrap`, `gc_v2_11_custom_hc194_wrap`, `gc_v2_12_nested_halfadder_parent`, `gc_v2_13_deep_nested_halfadder_boundary`, `gc_v2_14_mixed_datapath_extended` und `gc_v2_15_ram_decode_capture_bus`. Prueft Datei-/Slug-Konsistenz, JSON-Parsebarkeit, Gate-Typen, Ein-/Ausgaenge, Verilog-/VHDL-Struktursanity, Checkpoint-Matching, externe HDL-Syntax/Lint-Checks (iverilog, verilator, yosys, ghdl), szenariobasierte externe HDL-Simulation und live Re-Export-Diffs. `gc_t2_bus_mux` und `gc_v2_13_deep_nested_halfadder_boundary` sind bewusst `expected_limit` (dokumentierte Exporter-Grenzen fuer Multi-Driver-Tri-State-Bus bzw. tiefere Nested-Custom-IC-Hierarchie). `gc_v2_6_custom_halfadder`, `gc_v2_9_custom_reg4_pipeline`, `gc_v2_10_custom_tribuf_wrap` und `gc_v2_11_custom_hc194_wrap` bilden vier verifizierte one-level-Hierarchie/custom-IC-Pfade via strukturellem Flattening ab; `gc_v2_12_nested_halfadder_parent` erweitert den Corpus um den ersten direkten nested-combinational-Custom-IC-Pfad mit rekursiver Flattening-Pruefung, `gc_v2_13_deep_nested_halfadder_boundary` dokumentiert die derzeit bewusst geblockte tiefere Hierarchie als stabile Regression statt als stillen Fehler, `gc_v2_14_mixed_datapath_extended` hebt einen groesseren state-heavy Datapath-Fall mit laengerer Mehrtakt-Sequenz aus dem Focused-Bereich in die Golden-Baseline, und `gc_v2_15_ram_decode_capture_bus` verankert erstmals einen integrierten RAM-/Decode-/Bit-Select-/Hold-/Capture-Systempfad als gemeinsame Golden-Regression. `gc_v2_8_sequential_feedback` erweitert die Basis zusaetzlich um einen mehrtaktigen sequentiellen Feedback-Fall mit Seed-Load und XOR-Rueckkopplung. Laeuft als eigenes CI-Gate.
Das kanonische Acceptance-Artefakt `golden-corpus-v1-acceptance.json` wird jetzt aus demselben Runner-Lauf wie Summary und Report erzeugt; partielle `--slug`-Runs duerfen diese kanonischen Dateien nicht mehr ueberschreiben. Der Golden-Strang gilt damit im aktuellen Scope als abgeschlossen; weitere Breite oder tiefere Hierarchie sind nur noch optionale Folgeexpansion.

### 5. Focused-Nine Core -> focused-nine-report.md + focused-nine-summary.json
Hochrisiko-Suite fuer 12 Schaltungen. Simulationslauf + HDL-Toolchain-Verifikation (iverilog, ghdl, yosys, verilator). Laeuft als eigenes CI-Gate mit HDL-Tool-Installation.

### 6. UI-Audit -> focused-nine-ui-report.md + focused-nine-ui-summary.json
Browser-Audit der 12 Fokusfaelle: STT-Projektion, HDL-Modal-Konsistenz, Screenshots. Aktueller Stand: **12** Smoke-Passes, **0** echte UI-Fehler, **5** semantische Timing-Passes, **0** semantische Warnungen. Laeuft als eigenes CI-Gate.

### 7. Roadmap -> industry-lite-roadmap.md
Drei Reifegrad-Stufen (Teaching Tool / Design Tool / Industry-Lite EDA) mit 6 Arbeitsstromen. Langfristiger Horizont.

### 8. FSM0-Arbeitspaket -> fsm0/work-package.md
Der FSM-Strang liegt jetzt als ein zusammenhaengendes Arbeitspaket-Dokument unter `fsm0/work-package.md`. `FSM0-1` bis `FSM0-7` sind fuer den aktuellen Scope abgeschlossen und dort inklusive Abschlussbewertung dokumentiert. Echte Legacy-Repros liegen weiter unter `fsm-export-fixes/cases/`. Fuer breite FSMs ist die reduzierte STT-Sicht aktiv; die eigentliche Canvas-Synthese bleibt fuer derzeit zu grosse unverdichtete SOP-Netze bewusst blockiert, bis eine spaetere verdichtete Synthese diesen Pfad uebernimmt. Die fruehe Editor-/Canvas-Rueckmeldung fuer `legacy`, `modified`, `mixed` und Mehrsystem-Faelle ist verankert, und breite, Legacy-, gemischte `projected + raw`-, direkt verkettete Batch-, Observer-Split-, Mixed-Islands-, Shared-Observer- und Shared-Helper-Kernrepros liegen als gespeicherte Fixtures mit automatischer Regression vor. Bewusster Folgepfad ausserhalb des geschlossenen Scope bleibt `FSM0-8` (Netzlisten-Minimierung / Bool-Minimierung / Mapping).

### 9. Race-Arbeitspaket -> race-panel-fixes/work-package.md
Strukturelles Arbeitspaket fuer Race-Panel, Race-Markierungen und Race-Lifecycle im Store. Der Strang ist fuer den aktuellen Produktumfang abgeschlossen: store-seitiges Pruning geloeschter Race-Ursachen, manueller Reset, signaturbasiertes Incident-Dedupe, gemeinsame Monitor-State-Helferschicht, Incident-Metadaten sowie konservatives Struktur-Fingerprint-Pruning sind umgesetzt und verifiziert. Weitere Arbeit waere hier nur noch spaetere optionale Vertiefung, nicht mehr noetige Grundstruktur.

### 10. UX-Feinschliff -> ux-feinschliff/work-package.md
Kleiner Sammel- und Ablaufstrang fuer sichtbare Bedienungsfeinheiten ohne neue Grundsemantik. Aktuell sind dort u. a. der spaetere manuelle Startzustand fuer Flipflops sowie der standardmaessig pausierte Start der Simulation als offene Folgeslices dokumentiert.

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
| `golden-corpus-v1.md` | Reale Golden-Corpus-v1-Suite mit 30 Referenzschaltungen |
| `golden-corpus-v1.json` | Maschinenlesbarer Index fuer Golden-Corpus v1 |
| `golden-corpus-v1-acceptance.md` | Akzeptanzkriterien und kanonischer fachlicher Baseline-Text fuer Golden Corpus v1 |
| `golden-corpus-plan.md` | Plan fuer 25 Referenzschaltungen in 5 Tracks |
| `industry-lite-roadmap.md` | Arbeitsstrom-Roadmap (W1-W6, Phasen A-D) |
| `fsm0/work-package.md` | FSM-Strang als ein einziges Arbeitspaket-Dokument. `FSM0-1` bis `FSM0-7` sind im aktuellen Scope abgeschlossen; `FSM0-8` bleibt bewusst als Folgepfad zurueckgestellt. |
| `ux-feinschliff/work-package.md` | Kleiner UX-Feinschliff-/Intake-Strang fuer offene Bedienungsnacharbeiten wie Flipflop-Startzustand und pausierten Simulationsstart. |
| `race-panel-fixes/work-package.md` | Struktur-Arbeitspaket fuer Race-Panel-Reset, Pruning, Dedupe und Lifecycle-Logik; fuer den aktuellen Scope abgeschlossen und nur noch optional vertiefbar |
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
| `run-golden-corpus-v1.mjs` | Golden Corpus v1 Runner  verifiziert 30 Referenzschaltungen |
| `contract-runner-summary.json` | Ergebnis des Contract Runners (maschinenlesbar) |
| `contract-runner-report.md` | Ergebnis des Contract Runners (menschenlesbar) |
| `golden-corpus-v1-summary.json` | Ergebnis des Golden Corpus Runners (maschinenlesbar) |
| `golden-corpus-v1-report.md` | Ergebnis des Golden Corpus Runners (menschenlesbar) |
| `golden-corpus-v1-acceptance.json` | Maschinenlesbare Acceptance-Baseline; wird synchron mit Summary und Report erzeugt |

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
| `generated-circuits-golden/` | 30 Schaltungsdefinitionen (.lgsc.json)  Golden Corpus v1 |
| `generated-exports-golden/` | 30 x Verilog + 30 x VHDL Exporte  Golden Corpus v1 |

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
- **P1/P2:** API-/Broker-Strang (`validation/api_anbindung/work-package.md`): `API1-01` ist im aktuellen Scope abgeschlossen. `API1-02` besitzt jetzt neben dem staging-nahen Profil-Schnitt auch einen staging-lokalen Startpfad (`backend-sandbox npm run dev:staging-local`), einen staging-lokalen Runtime-Smoke (`backend-sandbox npm run smoke:staging-runtime`), einen staging-URL-Smoke (`backend-sandbox npm run smoke:staging-url`) und den ersten externen Zielpfad via Render-Blueprint in [render.yaml](/home/p-keminer/projects/uni/logic-gate-simulator/render.yaml). Als Naechstes diesen Zielpfad real deployen und den URL-Smoke gegen die echte Staging-URL bestaetigen, danach den dokumentierten Staging-Sicherheits-Checkpoint fuer Access-Schutz, Session-Key-Barriere, exakte Origin und abuse-orientierte Alarmierung abarbeiten und erst dann `API1-03` Observability sowie `API1-04` Pilot-/Rollout-Vorbereitung angehen
- **P2 klein und separat:** UX-Feinschliff-Strang pflegen (`validation/ux-feinschliff/work-package.md`): kleine Bedienungsnacharbeiten zuerst dokumentiert sammeln, dann in bewusst kleinen Slices umsetzen
- **P2 bewusst nachgelagert:** Falls der FSM-Strang wieder aufgenommen wird, dann ueber `FSM0-8` (`validation/fsm0/work-package.md`): Netzlisten-Minimierung / Bool-Minimierung / Mapping fuer breite FSM-Synthese statt neuer Grundsemantik-Arbeit am bereits abgeschlossenen aktuellen Scope
- **P2:** Contract-Runner-Abdeckung weiter verbreitern (komplexere circuit-level Muster und tiefere Invarianten)
- **P1/P2:** Funktionale Schaltungssimulation im Golden Corpus weiter vertiefen (Trace-Depth-Hardening ist jetzt ueber alle gelandeten `gc_v2_*`-Seeds verbreitert; als Naechstes besonders grosse oder stateful Seeds weiter verdichten und spaeter aus der neuen tieferen Hierarchie-Grenze wieder in echte Pass-Faelle uebergehen)
- **P2 optional:** Golden Corpus spaeter weiter ausbauen (mehr Schaltungen, tiefere HDL-Traces, zweite Hierarchie-Stufe, groessere Designs), falls dieser Strang wieder aktiv aufgenommen wird
- **P2:** Den neuen Custom-IC-HDL-Pfad weiter absichern (mehr Hierarchiefaelle, explizite Grenzen fuer Nested-Custom-ICs)
- **P2:** Branch Protection / Required Checks in GitHub Settings konfigurieren (externer Schritt)
- **P2:** CI-Performance (HDL-Tool-Caching, Docker-Image)
