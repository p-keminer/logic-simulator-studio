# Industry-Lite EDA Roadmap

Datum: 2026-03-19
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

- `npm test` ist gruen: **853** Tests bestanden.
- `npm run build` ist gruen.
- `npm run lint` ist gruen.
- Contract Runner v1: **447 pass, 0 fail, 0 unsupported** (447 total) - in CI als eigenes Gate.
- Golden Corpus v1 Runner: **23 pass, 0 fail, 1 expected_limit** (24 total) - in CI als eigenes Gate.
- Focused-Nine Core: **12/12** funktional gruen, 0 HDL-Fails, 0 Tooling-Warnungen - in CI als eigenes Gate.
- CI hat 6 Jobs: quality-gates, contract-runner, golden-corpus, focused-nine-ui, focused-nine-core, hdl-toolchain.
- Tri-State-Ausgaenge propagieren korrekt: downstream-Gates sehen `Z`, nicht `0`.
- Multi-Treiber-Konflikte auf demselben Netz ergeben `X` (3) - kein stilles Last-Write-Wins mehr.
- Alle logic_basic- und logic_multi-Gatter exportieren nach Verilog und VHDL.
- `gc_t2_bus_mux` ist bewusst als `expected_limit` klassifiziert - dokumentierte Exporter-Grenze, nicht als pass verkauft.
- Report-Artefakte (JSON + Markdown) werden von allen vier fachlichen CI-Jobs hochgeladen.

### Fachlich relevante Restluecken

- Es gibt noch kein `X`-Signal fuer Setup/Hold-Verletzungen oder Metastabilitaet (Modellgrenze, kein Bug).
- Hierarchische Custom-ICs sind simulativ brauchbar; ein erster einlagiger HDL-Exportpfad ist jetzt via strukturellem Flattening abgesichert, aber tiefergehende Hierarchie ist noch nicht first-class verifiziert.
- UI-Timing-Audit ist semantisch gruen (5 PASS) und jetzt als eigenes CI-Gate eingebunden; der offene Restpunkt ist ein breiterer Waveform-/Visual-Diff.
- Export-Determinismus (Re-Export + Diff gegen goldene Artefakte) ist jetzt aktiv; Golden Corpus v1 fuehrt ausserdem externe HDL-Syntax/Lint-Checks und szenariobasierte HDL-Simulation aus.
- Branch-Protection-Rules in GitHub Settings sind noch nicht konfiguriert (externer manueller Schritt).
- Contract-Runner-Multi-Driver-Konflikte sind jetzt ausgefuehrt; offener bleibt nur die Ausweitung von der repräsentativen Bus-Fixture auf groessere zusammengesetzte Designs.

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
- ~~Kein automatisierter Contract-Runner~~ - RESOLVED / EXPANDED P1-5 2026-03-19 (447 pass, 0 unsupported)
- ~~Golden Corpus nicht ausfuehrbar~~ - RESOLVED / EXPANDED P1-6 2026-03-19 (23 pass, 1 expected_limit, externe HDL-Pruefung aktiv)

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
- Golden Corpus v1 als ausfuehrbare Regression mit 24 Referenzschaltungen inklusive neun v2-Pilot-Seeds (W3)
- Contract Runner v1 fuer 86 Gate-Contracts (W3)
- Reproduzierbare JSON-/Markdown-Reports fuer alle drei fachlichen Suiten
- CI mit 6 Jobs, davon 5 blockierende Qualitaets-/Regressionsgates (W6)
- Report-Artefakte als CI-Uploads

Noch offen:
- Externe HDL-Pruefung im Golden Corpus ist aktiv; offen bleibt die Ausweitung auf groessere/hierarchische Designs und breitere Trace-Tiefen
- Export-Determinismus (Re-Export + Byte-Diff) - erledigt
- UI-Timing-Semantik (W4) - fokussierte Faelle in CI verifiziert; voller Waveform-/Visual-Diff bleibt offen
- Hierarchie-/Custom-IC-Absicherung (W5) - zwei einlagige Flattening-Pfade verifiziert, breitere/nestbare Hierarchie bleibt offen
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
- Golden Corpus v1 mit 24 Referenzschaltungen inklusive `GC-V2-1`, `GC-V2-2`, `GC-V2-3`, `GC-V2-4`, `GC-V2-5`, `GC-V2-6`, `GC-V2-7`, `GC-V2-8` und `GC-V2-9`
- Ausfuehrbarer Runner (`validation/run-golden-corpus-v1.mjs`) mit 11 check-Kategorien pro Fall
- Contract Runner v1 (`validation/run-contract-runner.mjs`) fuer 86 Gate-Contracts
- Checkpoint-Verifikation gegen Verilog/VHDL-Quelltext
- Externe HDL-Syntax/Lint-Checks plus szenariobasierte iverilog/vvp- und ghdl-Simulation fuer alle nicht-boundary Faelle
- Beide als CI-Gate verdrahtet
- `gc_t2_bus_mux` bewusst als `expected_limit` klassifiziert

Noch offen:
- Tiefere und breitere HDL-Traces statt nur kuratierter Szenarien
- Erweiterung auf weitere v2-Seeds (mehr Schaltungen, Hierarchie, bus-/memory-lastige Designs)

### W4. UI als Projektion des Kerns

Status: **TEILWEISE ERREICHT**

- UI-Audit existiert (focused-nine-ui-audit.mjs) und ist semantisch gruen
- 5 Fokusfaelle liefern echte Timing-Snapshots und PASS statt WARN
- UI-Timing-Rendering ist fuer die Fokusfaelle lokal und in CI verifiziert
- Offene Restluecke ist jetzt nicht mehr die CI-Anbindung, sondern ein breiterer Waveform-/Visual-Diff fuer mehr als die Fokusfaelle

### W5. Hierarchie und Exportierbarkeit

Status: **TEILWEISE ERREICHT** (2026-03-19)

- Custom ICs sind simulativ nutzbar
- Ein einlagiger HDL-Exportpfad fuer registrierte Custom ICs ist jetzt ueber strukturelles Flattening verifiziert
- Keine Contracts oder Tests fuer Custom ICs
- Offene Entscheidung bleibt: tiefere/nestbare Hierarchie first-class exportierbar machen oder bewusst begrenzen

### W6. Qualitaetsgates und CI

Status: **WEITGEHEND ERREICHT** (2026-03-19)

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
- Golden Corpus v1 mit 24 Referenzschaltungen  ausfuehrbar + CI
- Contract Runner v1 mit 86 Gate-Contracts  ausfuehrbar + CI

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
- Hierarchie/Custom-IC-Absicherung hat mit `GC-V2-6` und `GC-V2-9` zwei one-level-Pfade; naechster Schritt ist tiefere/nestbare Absicherung

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
- Funktionale HDL-Simulation gegen Golden-Corpus-Exporte

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

## Naechster empfohlener Fokus (Stand 2026-03-19)

1. **P2:** Funktionale Schaltungssimulation im Golden Corpus vertiefen (laengere und dichtere HDL-Traces)
2. **P2:** Contract-Runner-Abdeckung weiter verbreitern (komplexere circuit-level Muster)
3. **P2:** Golden Corpus v2 ausbauen (mehr Schaltungen, Hierarchie, grosse Designs)
  Acht v2-Pilot-Seeds `GC-V2-1`, `GC-V2-2`, `GC-V2-3`, `GC-V2-4`, `GC-V2-5`, `GC-V2-6`, `GC-V2-7` und `GC-V2-8` sind jetzt integriert; als Naechstes folgen breitere HDL-Traces und ein zweiter Hierarchie-/Custom-IC-Fall
4. **P2:** Branch Protection / Required Checks in GitHub Settings konfigurieren (externer Schritt)
5. **P2:** CI-Performance (HDL-Tool-Caching, Docker-Image)

Phase B (0/1/Z/X und Mehrtreiberauflosung) ist abgeschlossen.
Phase D (CI-Qualitaetsgates) ist weitgehend erreicht mit 6 Jobs.
Phase A (HDL-Differenztest-Infrastruktur) ist teilweise erreicht mit Golden Corpus v1 + Contract Runner v1.
Naechster Schwerpunkt: Phase A Vertiefung (funktionale HDL-Simulation, Corpus-v2) und Phase C (breiterer Waveform-/Visual-Diff fuer die UI-Projektion).
