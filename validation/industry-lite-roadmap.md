# Industry-Lite EDA Roadmap

Datum: 2026-03-08
Repo: `<repo-root>`

## Zweck

Dieses Dokument definiert den naechsten Entwicklungsschritt des Projekts:
nicht primaer neue Features, sondern hoehere fachliche Verlaesslichkeit,
weniger Semantikbrueche und reproduzierbare Verifikation ueber alle Ebenen.

Zielbild:
- stabiles Lehr- und Entwurfswerkzeug
- konsistente Semantik zwischen Simulator, UI und HDL-Export
- reproduzierbare Qualitaetsgates
- klar dokumentierte Modellgrenzen

## Aktueller Stand

### Positiv bestaetigt

- `npm test` ist gruen: **845** Tests bestanden.
- `npm run build` ist gruen.
- `npm run lint` ist gruen.
- Contract Runner v1: **91 pass, 0 fail, 34 unsupported** (125 total) - in CI als eigenes Gate.
- Golden Corpus v1 Runner: **11 pass, 0 fail, 1 expected_limit** (12 total) - in CI als eigenes Gate.
- Focused-Nine Core: **12/12** funktional gruen, 0 HDL-Fails, 0 Tooling-Warnungen - in CI als eigenes Gate.
- CI hat 6 Jobs: quality-gates, contract-runner, golden-corpus, focused-nine-ui, focused-nine-core, hdl-toolchain.
- Tri-State-Ausgaenge propagieren korrekt: downstream-Gates sehen `Z`, nicht `0`.
- Multi-Treiber-Konflikte auf demselben Netz ergeben `X` (3) - kein stilles Last-Write-Wins mehr.
- Alle logic_basic- und logic_multi-Gatter exportieren nach Verilog und VHDL.
- `gc_t2_bus_mux` ist bewusst als `expected_limit` klassifiziert - dokumentierte Exporter-Grenze, nicht als pass verkauft.
- Report-Artefakte (JSON + Markdown) werden von allen vier fachlichen CI-Jobs hochgeladen.

### Fachlich relevante Restluecken

- Es gibt noch kein `X`-Signal fuer Setup/Hold-Verletzungen oder Metastabilitaet (Modellgrenze, kein Bug).
- Hierarchische Custom-ICs sind simulativ brauchbar, aber fuer HDL-Export noch nicht first-class abgesichert.
- UI-Timing-Audit ist semantisch gruen (5 PASS) und jetzt als eigenes CI-Gate eingebunden; der offene Restpunkt ist ein breiterer Waveform-/Visual-Diff.
- Export-Determinismus (Re-Export + Diff gegen goldene Artefakte) ist noch nicht implementiert.
- Branch-Protection-Rules in GitHub Settings sind noch nicht konfiguriert (externer manueller Schritt).
- 34 Contract-Runner-Testmuster sind noch `unsupported` (step-sequence, forbidden-input, etc.).

## Maturitaetsziel

### Stufe 1: Stable Teaching Tool

Definition:
- Tests, Build und Lint stabil
- Standardgatter, Register, Counter, FSM-Grundfaelle reproduzierbar korrekt
- bekannte Grenzen dokumentiert

Status:
- **erreicht**

### Stufe 2: Consistent Design Tool

Definition:
- dieselbe Schaltung verhaelt sich konsistent in
  Simulator, Wahrheitstabelle/STT, Timing, Verilog, VHDL
- bekannte Modellgrenzen sind bewusst und testbar, nicht zufaellig

Status:
- **weitgehend erreicht** (P0/P1-Fortschritte 2026-03-07/08)

Abgeschlossen:
- ~~`Z -> 0`-Sanitization~~ - RESOLVED P0 2026-03-07
- ~~fehlende Mehrtreiberauflosung~~ - RESOLVED P0 2026-03-07 (Konflikte ergeben `X`)
- ~~fehlende HDL-Export-Abdeckung fuer Basisgatter~~ - RESOLVED P0 2026-03-07
- ~~Verilator-LATCH-Warnung bei `74HC373`~~ - RESOLVED P1-1 2026-03-07
- ~~Kein automatisierter Contract-Runner~~ - RESOLVED P1-5 2026-03-08 (91 pass, 34 unsupported)
- ~~Golden Corpus nicht ausfuehrbar~~ - RESOLVED P1-6 2026-03-08 (11 pass, 1 expected_limit)

Restliche offene Punkte (kein Blocker mehr):
- `X` fuer Metastabilitaet/Setup-Hold: bewusste Modellgrenze, dokumentieren statt loesen
- STT-Variablenlimit blockiert UI-Verifikation fuer breite sequenzielle Schaltungen: P2 (Reduzierte Ansicht implementiert)
- UI-Timing-Audit ist funktional gruen und als CI-Gate verdrahtet; offen bleibt nur ein breiterer Waveform-/Visual-Diff

### Stufe 3: Industry-Lite EDA

Definition:
- formales Signalmodell
- systematische externe HDL-Differenztests
- Golden-Corpus fuer Kernklassen
- reproduzierbare Reports
- CI-Qualitaetsgates

Status:
- **teilweise erreicht**

Erreicht:
- Formales 0/1/Z/X-Signalmodell (W1, W2)
- Golden Corpus v1 als ausfuehrbare Regression mit 12 Referenzschaltungen (W3)
- Contract Runner v1 fuer 12 Gate-Contracts (W3)
- Reproduzierbare JSON-/Markdown-Reports fuer alle drei fachlichen Suiten
- CI mit 6 Jobs, davon 5 blockierende Qualitaets-/Regressionsgates (W6)
- Report-Artefakte als CI-Uploads

Noch offen:
- Externer HDL-Diff (iverilog/ghdl Simulation gegen goldene Exporte) - noch nicht im Runner
- Export-Determinismus (Re-Export + Byte-Diff) - noch nicht implementiert
- UI-Timing-Semantik (W4) - fokussierte Faelle in CI verifiziert; voller Waveform-/Visual-Diff bleibt offen
- Hierarchie-/Custom-IC-Absicherung (W5) - noch nicht angegangen
- Branch-Protection in GitHub Settings - manueller externer Schritt

## Arbeitsstroeme

### W1. Formales Signalmodell

Status: **ABGESCHLOSSEN** (P0 2026-03-07)

- `SignalValue = 0 | 1 | 2 | 3` (0/1/Z/X)
- Z propagiert korrekt
- Konflikte ergeben X
- Sanitization aus dem Kernpfad entfernt
- Akzeptanzkriterien erfuellt

### W2. Mehrtreiber- und Bus-Semantik

Status: **ABGESCHLOSSEN** (P0 2026-03-07)

- Mehrere Treiber auf demselben Netz loesen zu X auf
- Keine stille Last-Write-Wins-Semantik mehr
- Akzeptanzkriterien erfuellt

### W3. HDL-Differenztests

Status: **TEILWEISE ERREICHT**

Erreicht:
- Golden Corpus v1 mit 12 Referenzschaltungen
- Ausfuehrbarer Runner (`validation/run-golden-corpus-v1.mjs`) mit 11 check-Kategorien pro Fall
- Contract Runner v1 (`validation/run-contract-runner.mjs`) fuer 12 Gate-Contracts
- Checkpoint-Verifikation gegen Verilog/VHDL-Quelltext
- Beide als CI-Gate verdrahtet
- `gc_t2_bus_mux` bewusst als `expected_limit` klassifiziert

Noch offen:
- Funktionale HDL-Simulation (iverilog/ghdl gegen goldene Exporte)
- Export-Determinismus (Re-Export + Diff)
- Erweiterung auf v2 (mehr Schaltungen, Hierarchie)

### W4. UI als Projektion des Kerns

Status: **TEILWEISE ERREICHT**

- UI-Audit existiert (focused-nine-ui-audit.mjs) und ist semantisch gruen
- 5 Fokusfaelle liefern echte Timing-Snapshots und PASS statt WARN
- UI-Timing-Rendering ist fuer die Fokusfaelle lokal und in CI verifiziert
- Offene Restluecke ist jetzt nicht mehr die CI-Anbindung, sondern ein breiterer Waveform-/Visual-Diff fuer mehr als die Fokusfaelle

### W5. Hierarchie und Exportierbarkeit

Status: **OFFEN**

- Custom ICs sind simulativ nutzbar
- Kein HDL-Export fuer Custom ICs
- Keine Contracts oder Tests fuer Custom ICs
- Muss bewusst entschieden werden: voll exportierbar oder nur simulativ

### W6. Qualitaetsgates und CI

Status: **WEITGEHEND ERREICHT** (2026-03-08)

Aktueller Stand:
- CI vorhanden: `.github/workflows/quality-gates.yml`  6 Jobs:
  - `quality-gates` (test/build/lint)
  - `contract-runner` (Contract Runner v1 + Invariant-Validation)
  - `golden-corpus` (Golden Corpus v1 Runner + Invariant-Validation)
  - `focused-nine-ui` (12-case Browser- und Timing-Audit)
  - `focused-nine-core` (12-case Simulation + HDL-Regression)
  - `hdl-toolchain` (iverilog/ghdl/yosys/verilator Praesenzpruefung)
- Alle vier fachlichen Jobs laden Reports als CI-Artefakte hoch
- `contract-runner` und `golden-corpus` sind echte blockierende Gates
- `expected_limit` loest keinen CI-Fehler aus

Noch offen:
- Branch-Protection-Rules in GitHub Settings (externer manueller Schritt)
- CI-Performance/Caching (HDL-Tool-Installation bei jedem Lauf)

Pflicht-Gates (Zielzustand):
- `npm test -- --run`
- `npm run build`
- `npm run lint`
- Contract Runner (intern)
- Golden Corpus (intern)
- HDL-Differenztests extern (focused-nine)
- UI-Timing-Audit
- Synthese-Sanity

Akzeptanzkriterien:
- keine Verhaltensaenderung ohne Regressionstest  **weitgehend erreicht**
- Reports werden als Artefakte erzeugt  **erreicht**
- Branch-Protection erzwingt gruene Gates  **noch offen** (GitHub Settings)

## Priorisierte Reihenfolge

### Phase A  Teilweise abgeschlossen

Ziel:
- semantische Hauptblocker sichtbar und reproduzierbar machen

Umfang:
- W3 Grundgeruest fertig

Erreicht:
- Golden Corpus v1 mit 12 Referenzschaltungen  ausfuehrbar + CI
- Contract Runner v1 mit 12 Gate-Contracts  ausfuehrbar + CI

Noch offen:
- v2-Erweiterung: 15-25 Referenzschaltungen (Hierarchie, grosse Designs)
- Funktionale HDL-Simulation (interner Simulator vs Verilog/VHDL)

### Phase B  Abgeschlossen 2026-03-07

Ziel:
- Kernsemantik fuer Tri-State/Bus fachlich korrekt machen

Umfang:
- W1 und W2

Definition of Done:
- kein bekannter `Z`-Downstream-Mismatch mehr  ERREICHT
- echte Mehrtreiberfaelle modelliert  ERREICHT (Konflikte loesen zu `X` auf)

### Phase C  In Arbeit

Ziel:
- UI und Export auf die neue Semantik hart ausrichten

Umfang:
- W4 und W5

Status:
- UI-Timing-Semantik ist fokussiert in CI abgesichert; naechster Schritt ist ein breiterer Waveform-/Visual-Diff
- Hierarchie/Custom-IC-Absicherung noch nicht begonnen

### Phase D  Teilweise erreicht

Ziel:
- repo-weite Qualitaetsautomation

Umfang:
- W6

Erreicht:
- 6 CI-Jobs mit Report-Artefakten
- Contract Runner + Golden Corpus als echte Gates
- Focused-Nine UI als echtes Gate
- focused-nine core als Hochrisiko-Gate

Noch offen:
- Branch Protection (externer Schritt)
- CI-Performance/Caching
- Export-Determinismus / Re-Export-Diff

## Bug-Fix-Protokoll

Jeder echte Befund bekommt ab jetzt immer dieselben Artefakte:

1. Minimal-Repro-Schaltung
2. erwartetes Verhalten
3. beobachtetes Verhalten
4. Klassifikation:
   `core-bug`, `ui-bug`, `export-bug`, `synthesis-risk`, `tooling-bug`, `model-limit`
5. Regressionstest
6. Nachverifikation mit Report

Ohne diese sechs Punkte sollte kein "Fix" als abgeschlossen gelten.

## Definition von "gruen"

Ein Bereich gilt nur dann als wirklich gruen, wenn:

- die Kernsuite gruen ist
- das Verhalten durch mindestens ein externes Orakel bestaetigt ist, sofern fachlich sinnvoll
- UI und HDL keinen Widerspruch dazu zeigen
- die bekannte Modellgrenze nicht einfach nur unerkannt geblieben ist

## Naechster empfohlener Fokus (Stand 2026-03-08)

1. **P1:** UI-Timing-Audit als CI-Job integrieren
2. **P2:** Export-Determinismus / Re-Export-Diff in Golden Corpus aufnehmen
3. **P2:** Funktionale Schaltungssimulation im Golden Corpus (iverilog/ghdl gegen goldene Exporte)
4. **P2:** 34 unsupported Contract-Runner-Muster implementieren (step-sequence, forbidden-input, etc.)
5. **P2:** Golden Corpus v2 ausbauen (mehr Schaltungen, Hierarchie, grosse Designs)
6. **P2:** Branch Protection / Required Checks in GitHub Settings konfigurieren (externer Schritt)
7. **P2:** CI-Performance (HDL-Tool-Caching, Docker-Image)

Phase B (0/1/Z/X und Mehrtreiberauflosung) ist abgeschlossen.
Phase D (CI-Qualitaetsgates) ist weitgehend erreicht mit 6 Jobs.
Phase A (HDL-Differenztest-Infrastruktur) ist teilweise erreicht mit Golden Corpus v1 + Contract Runner v1.
Naechster Schwerpunkt: Phase C (UI-Konsistenz, insb. Timing-Semantik) und Phase A Vertiefung (Export-Determinismus, funktionale Simulation).
