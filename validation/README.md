# validation/ â€” Kanonischer Einstiegspunkt

**Projekt:** logic-gate-simulator
**Stand:** 2026-03-07
**QualitÃ¤tsstand:** 713/713 Tests grÃ¼n â€” P0, P1a, P1b und P1-1 verifiziert

---

## Aktueller QualitÃ¤tsstand

| Metrik | Wert |
|---|---|
| Vitest-Suite | **713/713** pass |
| Build | pass (`tsc -b` + `vite build`; bundle-size warning only) |
| Lint | pass |
| Harte Restfehler (Simulation) | **0** |
| Toolchain-Failures (HDL) | **0** |
| Tooling-Warnungen | **0** |
| UI-Limit-Warnungen (fokussierter Lauf) | **0** |
| UI-Projektionsfehler (fokussierter Lauf) | **0** |
| UI-Semantik-Warnungen (fokussierter Lauf) | **5** (`steps=0`, headless-RAF-Limit im Timing-Audit) |
| Abgeschlossen P1a | VHDL `&`-Operator-Fix â€” hc194/ALU4 GHDL jetzt grÃ¼n |
| Abgeschlossen P1b | /OE defaultInputValues fÃ¼r TRIBUF, 74HC373, 74HC374, 74HC595 |
| Abgeschlossen P1-1 | 74HC373 Verilator-LATCH â€” gelÃ¶st via Verilog-2001 + `lint_off/lint_on` |
| Abgeschlossen P0 | `0/1/Z/X`-Signalmodell + Mehrtreiber-/Bus-AuflÃ¶sung |

---

## Welche Berichte zuerst lesen?

### 1. SchnellÃ¼berblick â†’ maturity-gap-dashboard.md
Konsolidierter Reifegrad-Bericht nach 7 Kriterien. EnthÃ¤lt bestÃ¤tigte StÃ¤rken, offene SchwÃ¤chen, Blocker und nÃ¤chste Schritte.
Ist jetzt auf den aktuellen Post-P0-/Post-P1-1-Stand nachgezogen.

### 2. Priorisierte Aufgabenliste â†’ maturity-priority-list.json
15 maschinenlesbare EintrÃ¤ge (P0/P1/P2) mit Status, Evidenz, betroffenen Gates und empfohlenem nÃ¤chsten Schritt.
Ist jetzt auf den aktuellen Post-P0-/Post-P1-1-Stand nachgezogen.

### 3. Audit-Rohdaten â†’ focused-nine-report.md + focused-nine-summary.json
Letzter Simulationslauf fÃ¼r 12 Hochrisiko-Schaltungen. EnthÃ¤lt Pass/Fail pro Schaltung und pro Tool. Aktueller Stand: **12/12 funktional grÃ¼n**, **0** HDL-Fails, **0** Tooling-Warnungen.

### 4. UI-Audit â†’ focused-nine-ui-report.md + focused-nine-ui-summary.json
Browser-Audit der 12 FokusfÃ¤lle: STT-Projektion, HDL-Modal-Konsistenz, Screenshots. Aktueller Stand: **12** Smoke-Passes, **0** echte UI-Fehler, **5** semantische Timing-Warnungen wegen `steps=0` im Headless-Lauf.

### 5. Roadmap â†’ industry-lite-roadmap.md
Drei Reifegrad-Stufen (Teaching Tool / Design Tool / Industry-Lite EDA) mit 6 ArbeitsstrÃ¶men. Langfristiger Horizont.

---

## VollstÃ¤ndiger Dateiindex

### Kanonische Berichte (immer aktuell)

| Datei | Inhalt |
|---|---|
| `maturity-gap-dashboard.md` | Reifegrad nach 7 Kriterien, offene Blocker, PrioritÃ¤tssummary |
| `maturity-priority-list.json` | 15 EintrÃ¤ge P0/P1/P2 mit Status und Evidenz |
| `golden-corpus-v1.md` | Reale Golden-Corpus-v1-Suite mit 12 Referenzschaltungen |
| `golden-corpus-v1.json` | Maschinenlesbarer Index fÃ¼r Golden-Corpus v1 |
| `golden-corpus-plan.md` | Plan fÃ¼r 25 Referenzschaltungen in 5 Tracks |
| `industry-lite-roadmap.md` | Arbeitsstrom-Roadmap (W1â€“W6, Phasen Aâ€“D) |
| `verification-matrix.md` | PflichtprÃ¼fmuster je Gate-Klasse und Freigaberegeln |
| `claude-integration-review.md` | Bewertung der Claude-Integration im Projekt |
| `audit-determinism-report.md` | Determinismus-/CI-Tauglichkeitsbericht fÃ¼r focused-nine core und UI |
| `audit-determinism-summary.json` | Maschinenlesbare Determinismus-Zusammenfassung |

### Audit-Rohdaten und -Berichte (fokussierter Lauf, 12 Schaltungen)

| Datei | Inhalt |
|---|---|
| `focused-nine-audit.mjs` | Simulations-Audit-Runner |
| `focused-nine-summary.json` | Rohdaten: 12 Schaltungen Ã— Simulation + Toolchain |
| `focused-nine-report.md` | Aufbereiteter Bericht des Simulations-Audits |
| `focused-nine-ui-audit.mjs` | UI-Audit-Runner |
| `focused-nine-ui-summary.json` | Rohdaten: UI-Audit-Ergebnisse |
| `focused-nine-ui-report.md` | Aufbereiteter Bericht des UI-Audits |
| `diff-audit-runs.mjs` | Vergleichstool fÃ¼r wiederholte Audit-LÃ¤ufe |

### Generierte Artefakte (fokussierter Lauf)

| Verzeichnis | Inhalt |
|---|---|
| `generated-circuits-focused/` | 12 Schaltungsdefinitionen (.lgsc.json) |
| `generated-exports-focused/` | 12 Ã— Verilog + VHDL Exporte |
| `generated-ui-focused/` | 8 UI-Screenshots |

### Golden-Corpus v1 (Basis-Regression, 12 Schaltungen)

| Datei/Verzeichnis | Inhalt |
|---|---|
| `golden-corpus-v1.md` | Dokumentation der 12 v1-Referenzschaltungen |
| `golden-corpus-v1.json` | Maschinenlesbarer Korpus-Index (`circuits[]`, Checkpoints, Rationale) |
| `generated-circuits-golden/` | 12 Schaltungsdefinitionen (.lgsc.json) |
| `generated-exports-golden/` | 12 Ã— Verilog + VHDL Exporte |

### Gate-Spezifikation und Inventar

| Datei | Inhalt |
|---|---|
| `gate-contract-schema.json` | JSON Schema (Draft-07) fÃ¼r Gate-Contracts |
| `gate-inventory.json` | Alle 83 Gate-EintrÃ¤ge mit Metadaten |
| `gate-gap-analysis.md` | Gap-Analyse (11 Abschnitte): HDL-LÃ¼cken, Timing-Risiken, Tri-State, UI |
| `testability-mapping.json` | 18 Gate-Klassen, 14 Testmuster, 124 Slots |
| `contracts/` | 12 Gate-Contracts (74HC74, 74HC161/163/194/373/374/595, D_FF, JK_FF, SR_LATCH, D_LATCH, TRIBUF) |

### HDL-Diff-Infrastruktur (in Entwicklung)

| Datei | Inhalt |
|---|---|
| `hdl-diff/types.ts` | TypeScript-Typen fÃ¼r HDL-Differenztest-Pipeline |

---

## Was ist archiviert?

`archive/pre-p0/` enthÃ¤lt Artefakte aus dem Audit-Durchlauf **vor** den P1a/P1b-Fixes:
- `audit-current.mjs`, `ui-audit-current.mjs` â€” Ã¤ltere Audit-Runner
- `current-fix-verification-report.md`, `fix-verification-summary.json` â€” Fix-Verifikation (662 Tests, hc194/ALU4 GHDL noch rot)
- `command-summary.json`, `ui-summary-current.json` â€” Rohdaten des current-Laufs
- `generated-circuits-current/`, `generated-exports-current/`, `generated-ui-current/` â€” generierte Artefakte des current-Laufs

Siehe `archive/pre-p0/README.md` fÃ¼r Details.

---

## NÃ¤chste Phase: Post-P0-HÃ¤rtung

Die naechsten sinnvollen Schritte sind jetzt:
- **P1:** `prevClk/stateKeys` fÃ¼r edge-getriggerte FFs sauber modellieren oder bewusst dokumentieren
- **P1/P2:** Automatischen Truth-Table- und Step-Sequence-Runner ergÃ¤nzen
- **P1/P2:** Timing-Waveform-Diff im UI-Audit ergÃ¤nzen
- **P2:** Golden-Corpus v1 in eine ausfÃ¼hrbare Regression und spÃ¤ter in CI Ã¼berfÃ¼hren

Nach P0 verifiziert:
- `tri_not_sanitized` ist funktional behoben
- `multi_driver_same_input` ist funktional behoben
- Multi-Driver-Konflikte lÃ¶sen jetzt zu `X` auf
- Downstream-Logik sieht `Z/X` nicht mehr als stillschweigendes `0`
- die Testsuite ist auf `713` FÃ¤lle gewachsen
- focused-nine core ist deterministisch mit Whitelist (`generatedAt`, `lastChangedAt`)
- focused-nine core lÃ¤uft jetzt als eigenes CI-Gate in `.github/workflows/quality-gates.yml`
- focused-nine UI ist deterministisch; die 5 semantischen Timing-Warnungen sind stabil und kein Flake
- Golden-Corpus v1 existiert als 12er-Basissuite mit `.lgsc.json` + Verilog + VHDL, ist aber noch nicht an Runner/CI gekoppelt

Freigabekriterium (aus `verification-matrix.md`):
> Ein Kernumbau darf erst als abgeschlossen gelten, wenn alle Pflichtmuster der betroffenen Klassen gelaufen sind, keine neue Regression entsteht, der Unterschied dokumentiert ist und mindestens ein externer HDL-Lauf den neuen Stand bestÃ¤tigt.
