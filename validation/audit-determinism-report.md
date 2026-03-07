# Audit-Determinismus-Bericht

Datum: 2026-03-07
Repo: `<repo-root>`
Rohdaten: `validation/audit-determinism-summary.json`
Vergleichstool: `validation/diff-audit-runs.mjs`

## Zusammenfassung

| Runner | Laeufe | Klassifikation | CI-tauglich |
|--------|--------|----------------|-------------|
| Core-Audit | 3 | stable with expected volatile fields | ja, mit Whitelist |
| UI-Audit | 3 | deterministic | ja, direkt |

## Core-Audit (focused-nine-audit.mjs)

### Methodik

3 aufeinanderfolgende Laeufe, JSON-Ausgabe verglichen mit `diff-audit-runs.mjs --type core`.

### Stabile Felder (alle 12 Faelle, alle 3 Laeufe identisch)

- `result.status` (pass/fail/warn)
- `result.expectation` (Beschreibungstext)
- `toolingStatus` (pass/warn/fail)
- `tools.verilog.iverilog` (status + output)
- `tools.verilog.verilator` (status + output)
- `tools.verilog.yosys` (status + output)
- `tools.vhdl.ghdl` (status + output)
- `result.details` (Signalwerte, Gate-Outputs, State-Transitions)

### Instabiles Feld

| Fall | Feld | Werte (3 Laeufe) | Semantischer Impact |
|------|------|-------------------|---------------------|
| `multi_driver_same_input` | `result.details.gateSignals.*.*.lastChangedAt` | 1772915398882, 1772915404002, 1772915408522 | keiner |

**Erklaerung:** `lastChangedAt` wird von der Simulation per `Date.now()` gesetzt. Der Wert aendert sich bei jedem Lauf, traegt aber keine semantische Bedeutung fuer pass/fail. Alle tatsaechlichen Signalwerte (`value`, `version`), Statuszuordnungen und Toolchain-Outputs sind bit-identisch.

**Warum nur `multi_driver_same_input`?** Nur dieser Fall schreibt `gateSignals` (mit Timestamps) in `result.details`. Alle anderen Faelle speichern nur gate-interne Zustandswerte (z.B. `{ q: 1, stateQ: 1 }`), die keine Timestamps enthalten.

### CI-Empfehlung: geeignet mit Whitelist

Fuer CI-Regression genuegt ein Vergleich, der `generatedAt` und `lastChangedAt` ignoriert. Der Diff-Helper (`diff-audit-runs.mjs`) implementiert dies bereits ueber `VOLATILE_FIELDS`. Erweiterung um `lastChangedAt` im Deep-Compare waere sinnvoll.

## UI-Audit (focused-nine-ui-audit.mjs)

### Methodik

3 aufeinanderfolgende Laeufe gegen den laufenden Dev-Server (<dev-server>), JSON-Ausgabe verglichen mit `diff-audit-runs.mjs --type ui`.

### Ergebnis: vollstaendig deterministisch

Alle verglichenen Felder waren ueber 3 Laeufe hinweg in allen 12 Faellen identisch:

| Feld | Stabil | Anmerkung |
|------|--------|-----------|
| `error` | ja | Kein Fall hat einen Fehler (tff_led stabil nach Timeout-Erhoehung auf 30s) |
| `check.status` | ja | 12x pass, konstant |
| `check.message` | ja | Identische Nachrichten |
| `semanticPass` | ja | 5x false (WARN), konstant |
| `steps` | ja | 5x 0, konstant — headless RAF-Limit ist konsistent, nicht zufaellig |
| `hasZPath` | ja | tri_not_sanitized: true; multi_driver_same_input: false; andere: false |
| `hasXPath` | ja | tri_not_sanitized: true; multi_driver_same_input: true; andere: false |
| `verilogMatches` | ja | Alle HDL-faehigen Faelle: true |
| `vhdlMatches` | ja | Alle HDL-faehigen Faelle: true |
| `tableRowCount` | ja | Konstant (null fuer Faelle ohne Tabellenextraktion) |
| `tableParagraphCount` | ja | Konstant |

### Beobachtungen

- **`tff_led`**: In frueheren Laeufen gelegentlich per ProtocolError abgestuerzt (10s Timeout). Nach Erhoehung von `page.setDefaultTimeout(10000)` auf `page.setDefaultTimeout(30000)`: 3/3 stabil.
- **`steps=0`**: Stabile Null in allen 3 Laeufen fuer alle 5 semantischen Faelle. Die Ursache ist die fehlende RAF-Scheduling in headless Puppeteer — das ist ein konsistentes Umgebungslimit, kein Flake.
- **Z/X-Pfad-Erkennung**: Deterministisch. `tri_not_sanitized` hat immer sowohl Z- als auch X-Pfade (SVG-Farben sind in der initialen Darstellung vorhanden). `multi_driver_same_input` hat immer X-Pfad (Konflikt-Farbe). Kein Fall schwankt zwischen vorhanden/nicht vorhanden.

### CI-Empfehlung: direkt geeignet

Keine Whitelist noetig. Das einzige volatile Feld (`generatedAt`) wird vom Diff-Helper bereits ignoriert. Alle fachlich relevanten Felder sind bit-stabil.

## Klassifikations-Schema

| Kategorie | Definition | Anwendbar auf |
|-----------|-----------|---------------|
| deterministic | Alle Felder (ausser dokumentierte Volatile) identisch ueber N Laeufe | UI-Audit |
| stable with expected volatile fields | N-1 Felder identisch, instabile Felder sind dokumentiert und fachlich irrelevant | Core-Audit |
| flaky | Fachlich relevante Felder schwanken zwischen Laeufen | nicht beobachtet |
| timing-sensitive | Ergebnis haengt von Wall-Clock-Timing ab (Timeouts, Race Conditions) | tff_led (behoben) |
| environment-sensitive | Ergebnis haengt von Umgebung ab (OS, Toolchain-Version, Browser) | steps=0 (headless RAF) |

## Instabilitaeten im Detail

### Fachlich irrelevant

1. **`lastChangedAt` (Core, multi_driver_same_input)**: `Date.now()`-Timestamp. Aendert sich bei jedem Lauf. Keine Auswirkung auf Testergebnis. Empfehlung: in CI-Vergleich ignorieren.

### Fachlich relevant, aber stabil

1. **`steps=0` (UI, 5 semantische Faelle)**: Konsistent 0 in headless-Modus. Wuerde in headed-Browser oder mit expliziter User-Interaktion (Schalter-Klicks) wahrscheinlich > 0 werden. Die semantische Bewertung wird korrekt als WARN (nicht PASS) gefuehrt. Fuer CI ist das stabil.

### Ehemals instabil, jetzt behoben

1. **`tff_led` Timeout (UI)**: War flaky mit 10s Timeout. Mit 30s stabil (3/3 pass). Ursache war Puppeteer-Protocol-Timeout bei langsamem evaluate()-Call. Loesung: `page.setDefaultTimeout(30000)`.

## Dateien

| Datei | Inhalt |
|-------|--------|
| `validation/determinism-runs/core-run{1,2,3}.json` | Rohdaten Core-Audit |
| `validation/determinism-runs/ui-run{1,2,3}.json` | Rohdaten UI-Audit |
| `validation/determinism-runs/core-diff.json` | Strukturierter Vergleich Core |
| `validation/determinism-runs/ui-diff.json` | Strukturierter Vergleich UI |
| `validation/diff-audit-runs.mjs` | Vergleichstool (diff, normalize, verdict) |
| `validation/audit-determinism-summary.json` | Maschinenlesbare Zusammenfassung |
