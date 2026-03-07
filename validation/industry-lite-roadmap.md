# Industry-Lite EDA Roadmap

Datum: 2026-03-07
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

- `npm test` ist gruen: `713` Tests bestanden.
- `npm run build` ist gruen.
- `npm run lint` ist gruen.
- Tri-State-Ausgaenge propagieren korrekt: downstream-Gates sehen `Z`, nicht `0`.
- Multi-Treiber-Konflikte auf demselben Netz ergeben `X` (3) — kein stilles Last-Write-Wins mehr.
- Alle logic_basic- und logic_multi-Gatter exportieren nach Verilog und VHDL.
- `tri_not_sanitized` und `multi_driver_same_input` sind im P0-Stand nicht mehr reproduzierbar.
- Focused-nine-Audit: 12/12 funktional gruen, 0 HDL-Fails, 0 Tooling-Warnungen (hc373_oe_z Verilator-LATCH via Verilog-2001 + lint_off/lint_on geloest, P1-1 2026-03-07).

### Fachlich relevante Restluecken

- Es gibt noch kein `X`-Signal fuer Setup/Hold-Verletzungen oder Metastabilitaet (Modellgrenze, kein Bug).
- Hierarchische Custom-ICs sind simulativ brauchbar, aber fuer HDL-Export noch nicht first-class abgesichert.
- ~~`74HC373` Verilog-Export Verilator-LATCH-Warnung~~ — RESOLVED P1-1 2026-03-07 (Verilog-2001 + `/* verilator lint_off LATCH */`…`/* verilator lint_on LATCH */`, nicht `always_latch`).

## Maturitaetsziel

### Stufe 1: Stable Teaching Tool

Definition:
- Tests, Build und Lint stabil
- Standardgatter, Register, Counter, FSM-Grundfaelle reproduzierbar korrekt
- bekannte Grenzen dokumentiert

Status:
- weitgehend erreicht

### Stufe 2: Consistent Design Tool

Definition:
- dieselbe Schaltung verhaelt sich konsistent in
  Simulator, Wahrheitstabelle/STT, Timing, Verilog, VHDL
- bekannte Modellgrenzen sind bewusst und testbar, nicht zufaellig

Status:
- weitgehend erreicht (P0-Fortschritt 2026-03-07)

Abgeschlossen:
- ~~`Z -> 0`-Sanitization~~ — RESOLVED P0 2026-03-07
- ~~fehlende Mehrtreiberauflosung~~ — RESOLVED P0 2026-03-07 (Konflikte ergeben `X`)
- ~~fehlende HDL-Export-Abdeckung fuer Basigatter~~ — RESOLVED P0 2026-03-07

Restliche offene Punkte (kein Blocker mehr):
- `X` fuer Metastabilitaet/Setup-Hold: bewusste Modellgrenze, dokumentieren statt loesen
- ~~Verilator-LATCH-Warnung bei `74HC373`~~ — RESOLVED P1-1 2026-03-07
- STT-Variablenlimit blockiert UI-Verifikation fuer breite sequenzielle Schaltungen: P2 (Reduzierte Ansicht implementiert)

### Stufe 3: Industry-Lite EDA

Definition:
- formales Signalmodell
- systematische externe HDL-Differenztests
- Golden-Corpus fuer Kernklassen
- reproduzierbare Reports
- CI-Qualitaetsgates

Status:
- begonnen, aber noch nicht erreicht

## Arbeitsstroeme

### W1. Formales Signalmodell

Ziel:
- von implizitem `0/1/Z`-Hybrid auf explizites `0/1/Z/X`

Arbeit:
- `SignalValue` klar definieren
- `HI_Z` und `UNKNOWN` sauber benennen
- zentrale Aufloesungsfunktion fuer Treiber einfuehren
- `Z -> 0`-Sanitization aus dem Kernpfad entfernen
- Konfliktfaelle als `X` modellieren

Akzeptanzkriterien:
- `TRIBUF -> NOT` ergibt intern denselben Befund wie externes HDL
- Konflikt `0` gegen `1` auf demselben Netz ergibt `X`
- nur `Z`-Treiber ergibt `Z`
- bestehende 0/1-Schaltungen regressieren nicht

Risiko:
- hohes Regressionspotenzial im Kern

Empfohlene Reihenfolge:
1. Aufloesungsfunktion einfuehren
2. Downstream-Sanitization entfernen
3. `X` im Modell aktivieren
4. Golden-Corpus dagegen laufen lassen

### W2. Mehrtreiber- und Bus-Semantik

Ziel:
- echte Netze statt impliziter Einzeltreiber pro Zielport

Arbeit:
- Eingangszuordnung so umbauen, dass mehrere Drivereintraege erhalten bleiben
- Net-Resolution zentral anwenden
- Bus-Konflikte sichtbar machen
- Tri-State-Faelle formal richtig behandeln

Akzeptanzkriterien:
- Multi-Driver-Schaltungen sind intern modellierbar
- Export und Simulator verwenden dieselbe Netzsemantik
- keine stillschweigende Auswahl des "letzten Drahts"

### W3. HDL-Differenztests

Ziel:
- internen Simulator gegen externe Referenztools pruefen

Arbeit:
- Golden-Corpus aufbauen
- Stimulus-Definitionen maschinenlesbar ablegen
- Runner fuer internen Simulator
- Runner fuer Verilog (`iverilog`)
- Runner fuer VHDL (`ghdl`)
- Synthese-Sanity (`yosys`)

Akzeptanzkriterien:
- pro Schaltung maschinenlesbarer Pass/Fail-Befund
- Mismatch pro Schritt und Signal sichtbar
- Reports reproduzierbar

Aktueller Parallelblock:
- dieser Arbeitsstrom kann unabhaengig von W1 teilweise vorgezogen werden
- Golden-Corpus v1 ist inzwischen als 12er-Basissuite vorhanden (`golden-corpus-v1.md`, `golden-corpus-v1.json`, generierte `.lgsc.json`/`.v`/`.vhd` Artefakte), aber noch nicht an einen Runner oder CI gebunden

### W4. UI als Projektion des Kerns

Ziel:
- UI darf keine eigene Logik "erfinden"

Arbeit:
- Wahrheitstabelle/STT nur aus denselben Kernzustandsdaten ableiten
- Timing-Diagramm gegen Kern-Snapshots pruefen
- UI-Audits fuer bekannte kritische Schaltungsklassen aufbauen

Akzeptanzkriterien:
- keine UI-only-Abweichung gegen Kernsimulation
- jeder UI-Befund laesst sich auf denselben Snapshot zurueckfuehren

### W5. Hierarchie und Exportierbarkeit

Ziel:
- Custom-ICs fachlich belastbar machen

Arbeit:
- klar festlegen: voll exportierbar oder bewusst nur simulativ
- falls exportierbar:
  `toVerilog()` und `toVHDL()` fuer Hierarchie einfuehren
- falls nicht:
  UI, Doku und Reports muessen das explizit markieren

Akzeptanzkriterien:
- keine versteckte Teilunterstuetzung
- Hierarchiegrenzen sind dokumentiert und testbar

### W6. Qualitaetsgates und CI

Ziel:
- jede Aenderung laeuft durch dieselben reproduzierbaren Gates

Aktueller Stand (2026-03-07):
- CI vorhanden: `.github/workflows/quality-gates.yml` — Job `quality-gates` (test/build/lint), Job `focused-nine-core` (12-case Simulation + HDL-Regression), Job `hdl-toolchain` (iverilog/ghdl/yosys/verilator Pruefung)
- focused-nine UI-Audit und Golden-Corpus-v1-Ausfuehrung: noch nicht in CI, laufen weiter manuell bzw. nur als Artefaktsatz

Pflicht-Gates (vollstaendiges Ziel):
- `npm test -- --run`
- `npm run build`
- `npm run lint`
- Golden-Corpus intern
- HDL-Differenztests extern (focused-nine)
- Synthese-Sanity

Akzeptanzkriterien:
- keine Verhaltensaenderung ohne Regressionstest
- Reports werden als Artefakte erzeugt

## Priorisierte Reihenfolge

### Phase A

Ziel:
- semantische Hauptblocker sichtbar und reproduzierbar machen

Umfang:
- W3 Grundgeruest fertig
- Golden-Corpus v1
- Mismatch-Reports

Definition of Done:
- 15 bis 25 Referenzschaltungen
- interner Simulator vs Verilog/VHDL laeuft automatisch

### Phase B — Abgeschlossen 2026-03-07

Ziel:
- Kernsemantik fuer Tri-State/Bus fachlich korrekt machen

Umfang:
- W1 und W2

Definition of Done:
- kein bekannter `Z`-Downstream-Mismatch mehr — ERREICHT
- echte Mehrtreiberfaelle modelliert — ERREICHT (Konflikte loesen zu `X` auf)

### Phase C

Ziel:
- UI und Export auf die neue Semantik hart ausrichten

Umfang:
- W4 und W5

Definition of Done:
- UI-Projektion ist konsistent
- Hierarchiegrenzen sind sauber geregelt

### Phase D

Ziel:
- repo-weite Qualitaetsautomation

Umfang:
- W6

Definition of Done:
- CI-Gates laufen reproduzierbar
- Reports sind Standardbestandteil der Entwicklung

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

## Naechster empfohlener Fokus (Post-P0/P1-1-Stand 2026-03-07)

1. ~~**P1:** Verilator-LATCH-Warnung fuer `74HC373`~~ — RESOLVED P1-1 2026-03-07
2. **P1:** `prevClk/stateKeys` fuer edge-getriggerte FFs sauber modellieren oder bewusst dokumentieren
3. **P1/P2:** Automatischen Truth-Table- und Step-Sequence-Runner implementieren (W3-Grundgeruest)
4. **P1/P2:** Golden-Corpus v1 zuerst ausführbar machen und in CI bringen; danach v2 fuer sequentielle, Tri-State- und Hierarchiefaelle ausbauen
5. **P2:** Timing-Waveform-Diff im UI-Audit semantisch vertiefen (5 Faelle WARN wegen headless RAF-Limit — steps=0)

Phasen A und B (HDL-Differenztest-Infrastruktur, `0/1/Z/X` und Mehrtreiberauflosung) sind abgeschlossen.
W6 hat jetzt eine erste fachliche Regression in CI. Golden-Corpus v1 ist als Basissuite vorhanden, aber noch nicht ausführbar.
Naechster Schwerpunkt: breitere Verifikationsautomatisierung (Truth-Table-/Step-Runner, Golden-Corpus-Ausfuehrung)
und UI-Konsistenz (Phase C Vorbereitung).
