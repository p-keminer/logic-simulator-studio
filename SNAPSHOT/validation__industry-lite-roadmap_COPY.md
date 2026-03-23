# Industry-Lite EDA Roadmap

Datum: 2026-03-20
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

- `npm test` ist gruen: **868** Tests bestanden.
- `npm run build` ist gruen.
- `npm run lint` ist gruen.
- Contract Runner v1: **447 pass, 0 fail, 0 unsupported** (447 total) - in CI als eigenes Gate.
- Golden Corpus v1 Runner: **28 pass, 0 fail, 2 expected_limit** (30 total) - in CI als eigenes Gate.
- Focused-Nine Core: **12/12** funktional gruen, 0 HDL-Fails, 0 Tooling-Warnungen - in CI als eigenes Gate.
- CI hat 6 Jobs: quality-gates, contract-runner, golden-corpus, focused-nine-ui, focused-nine-core, hdl-toolchain.
- Tri-State-Ausgaenge propagieren korrekt: downstream-Gates sehen `Z`, nicht `0`.
- Multi-Treiber-Konflikte auf demselben Netz ergeben `X` (3) - kein stilles Last-Write-Wins mehr.
- Alle logic_basic- und logic_multi-Gatter exportieren nach Verilog und VHDL.
- `gc_t2_bus_mux` und `gc_v2_13_deep_nested_halfadder_boundary` sind bewusst als `expected_limit` klassifiziert - dokumentierte Exporter-Grenzen, nicht als pass verkauft.
- Report-Artefakte (JSON + Markdown) werden von allen vier fachlichen CI-Jobs hochgeladen.
- Fuer aus dem FSM-Editor synthetisierte Schaltungen ist die kanonische Projektion in STT und Timing inzwischen als aktiver Arbeitspfad verankert: Signalrollen, Batch-Isolation, gemeinsame STT-/Timing-Projektion, explizite Mixed-Fallbacks und jetzt auch gemeinsame Panel-Semantik fuer `clean`, `legacy`, `modified` und gemischte projizierte Sequential-Faelle sind umgesetzt. Offen bleiben vor allem feinere Randfaelle bei breiten/gemischten Systemen und deren Abschlussverifikation.
- Der Race-Monitor ist fuer den aktuellen Produktumfang strukturell
  abgesichert: Reset, Strukturpruning, signaturbasiertes Incident-Dedupe,
  gemeinsame Helferschicht fuer Liste/Markierungen sowie konservatives
  Upstream-Pruning fuer Glitch-Faelle sind vorhanden.

### Fachlich relevante Restluecken

- Es gibt noch kein `X`-Signal fuer Setup/Hold-Verletzungen oder Metastabilitaet (Modellgrenze, kein Bug).
- Hierarchische Custom-ICs sind simulativ brauchbar; ein erster einlagiger HDL-Exportpfad ist jetzt via strukturellem Flattening abgesichert, aber tiefergehende Hierarchie ist noch nicht first-class verifiziert.
- UI-Timing-Audit ist semantisch gruen (5 PASS) und jetzt als eigenes CI-Gate eingebunden; der offene Restpunkt ist ein breiterer Waveform-/Visual-Diff.
- Export-Determinismus (Re-Export + Diff gegen goldene Artefakte) ist jetzt aktiv; Golden Corpus v1 fuehrt ausserdem externe HDL-Syntax/Lint-Checks und szenariobasierte HDL-Simulation aus.
- Branch-Protection-Rules in GitHub Settings sind noch nicht konfiguriert (externer manueller Schritt).
- Contract-Runner-Multi-Driver-Konflikte sind jetzt ausgefuehrt; offener bleibt nur die Ausweitung von der reprÃ¤sentativen Bus-Fixture auf groessere zusammengesetzte Designs.

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
- ~~Kein automatisierter Contract-Runner~~ - RESOLVED / EXPANDED P1-5 2026-03-20 (447 pass, 0 unsupported)
- ~~Golden Corpus nicht ausfuehrbar~~ - RESOLVED / EXPANDED P1-6 2026-03-20 (28 pass, 2 expected_limit, externe HDL-Pruefung aktiv)

Restliche offene Punkte (kein Blocker mehr):
- `X` fuer Metastabilitaet/Setup-Hold: bewusste Modellgrenze, dokumentieren statt loesen
- STT-Variablenlimit blockiert UI-Verifikation fuer breite sequenzielle Schaltungen: P2 (Reduzierte Ansicht implementiert)
- UI-Timing-Audit ist funktional gruen und als CI-Gate verdrahtet; offen bleibt nur ein breiterer Waveform-/Visual-Diff
- Der semantische FSM-Projektionspfad fuer Editor -> Canvas -> STT -> Timing ist fuer den aktuellen Scope geschlossen und in `validation/fsm0/work-package.md` als Abschluss dokumentiert; bewusster Folgepfad bleibt `FSM0-8` (Netzlisten-Minimierung / Bool-Minimierung / Mapping) statt weiterer Grundsemantik-Arbeit
- Race-Panel/Race-Monitor ist fuer den aktuellen Scope strukturell
  abgeschlossen; manueller Reset ist explizit als `clear only` definiert und
  aktive physische Ursachen duerfen spaeter wieder auftauchen. Details siehe
  `validation/race-panel-fixes/work-package.md`

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
- Golden Corpus v1 als ausfuehrbare Regression mit 30 Referenzschaltungen inklusive fuenfzehn v2-Pilot-Seeds (W3)
- Contract Runner v1 fuer 86 Gate-Contracts (W3)
- Reproduzierbare JSON-/Markdown-Reports fuer alle drei fachlichen Suiten
- CI mit 6 Jobs, davon 5 blockierende Qualitaets-/Regressionsgates (W6)
- Report-Artefakte als CI-Uploads

Noch offen:
- Externe HDL-Pruefung im Golden Corpus ist aktiv; der aktuelle Pilot-v2-Scope ist damit abgeschlossen, spaetere Ausweitung auf noch groessere/hierarchische Designs und breitere Trace-Tiefen bleibt optionaler Folgeausbau
- Export-Determinismus (Re-Export + Byte-Diff) - erledigt
- UI-Timing-Semantik (W4) - fokussierte Faelle in CI verifiziert; voller Waveform-/Visual-Diff bleibt offen
- Hierarchie-/Custom-IC-Absicherung (W5) - vier one-level-Faelle, ein direkter nested Pass-Pfad und jetzt eine explizit dokumentierte tiefere Boundary sind verifiziert; breitere/nestbare Hierarchie bleibt offen
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
- Golden Corpus v1 mit 30 Referenzschaltungen inklusive `GC-V2-1` bis `GC-V2-15`
- Ausfuehrbarer Runner (`validation/run-golden-corpus-v1.mjs`) mit 11 check-Kategorien pro Fall
- Contract Runner v1 (`validation/run-contract-runner.mjs`) fuer 86 Gate-Contracts
- Checkpoint-Verifikation gegen Verilog/VHDL-Quelltext
- Externe HDL-Syntax/Lint-Checks plus szenariobasierte iverilog/vvp- und ghdl-Simulation fuer alle nicht-boundary Faelle
- Maschinenlesbare Acceptance-Baseline wird jetzt synchron mit Summary und Report erzeugt; partielle `--slug`-Runs duerfen die kanonischen Golden-Artefakte nicht mehr ueberschreiben
- Beide als CI-Gate verdrahtet
- `gc_t2_bus_mux` und `gc_v2_13_deep_nested_halfadder_boundary` bewusst als `expected_limit` klassifiziert

Noch offen:
- Tiefere und breitere HDL-Traces statt nur kuratierter Szenarien
- Erweiterung auf weitere v2-Seeds (mehr Schaltungen, Hierarchie, bus-/memory-lastige Designs) sowie spaetere Ueberfuehrung der neuen tieferen Hierarchie-Grenze in kontrollierte Pass-Pfade bleiben jetzt bewusster Folgeausbau; die Scope-Abschlussbewertung des aktuellen erweiterten Corpus ist erfolgt

### W4. UI als Projektion des Kerns

Status: **TEILWEISE ERREICHT**

- UI-Audit existiert (focused-nine-ui-audit.mjs) und ist semantisch gruen
- 5 Fokusfaelle liefern echte Timing-Snapshots und PASS statt WARN
- UI-Timing-Rendering ist fuer die Fokusfaelle lokal und in CI verifiziert
- Offene Restluecke ist jetzt nicht mehr die CI-Anbindung, sondern ein breiterer Waveform-/Visual-Diff fuer mehr als die Fokusfaelle
- Fuer FSM-Editor -> Canvas-Synthese ist der semantische Projektionspfad inzwischen bis zum aktuellen Scope geschlossen: Projektionsmetadaten, `projectionBatchId`, zentrale STT-Projektion, kanonische Timing-Kanaele, isolierte Analyse-Subsysteme, explizite Mixed-Fallbacks, gemeinsame Legacy-/Modified-/Mixed-Hinweise, fruehe Editor-/Canvas-Rueckmeldung sowie die Boundary-/Fixture-Wall fuer Chained-, Observer-, Mixed-Islands-, Shared-Observer- und Shared-Helper-Faelle sind umgesetzt und abgesichert. Der naechste bewusste Folgepfad ist nicht weitere Grundsemantik, sondern spaetere Netzlisten-Minimierung und Mapping fuer breite FSM-Synthese.
- Die bestehende FSM-Semantik ist jetzt ausserdem frueher sichtbar: breite
  Roh-SOP-Guardrails erscheinen bereits im FSM-Editor, und der Hauptcanvas
  surfacet `legacy`-, `modified`-, `mixed`- und Mehrsystem-Hinweise schon vor
  dem Oeffnen von STT oder Timing
- Fuer breite FSMs ist die unverdichtete SOP-Canvas-Synthese jetzt bewusst
  blockiert, sobald sie voraussichtlich eine browserkritische Gate- und
  Leitungsmenge erzeugen wuerde; damit bleibt die reduzierte STT nutzbar,
  waehrend die spaetere verdichtete Synthese als eigener Folgepfad offen bleibt
- Die aktuelle FSM-Synthese ist weiterhin bewusst strukturell und didaktisch:
  sie erzeugt transparente SOP-/Hilfslogik statt bereits gate-minimierter
  Netzlisten. Eine spaetere Optimierungsstufe mit Wiederverwendung vorhandener
  Inversionen (`q_n`), Reduktion ueberfluessiger `NOT`-Gatter, Bool-
  Minimierung und optionalem Technology-Mapping auf `NAND`/`NOR` ist
  ausdruecklich vorgesehen, wird aber hinter die weitere Grundstruktur-
  Arbeit eingeordnet.

Offenes Struktur-Arbeitspaket:
- `validation/fsm0/work-package.md`
- Kernidee: Signalrollen und Sichtbarkeitsklassen einfuehren, die FSM-Synthese annotieren, einen read-only Sequential-Projection-Layer bauen und STT/Timing auf dieselbe kanonische Projektion umstellen
- bereits umgesetzt: erste Signalrollen, Projektionsmetadaten, Batch-Isolation, die gemeinsame STT-/Timing-Projektion fuer isolierte FSMs sowie jetzt gemeinsame Panel-Semantik fuer Legacy-/Modified-/Mixed-Faelle und isolierte projizierte Systeme
- naechste Validierungsobjekte: Batch-Konsistenz fuer restliche Mischnetze, reduzierte STT fuer breite FSMs, Mixed-Mode-Fallbacks in Randfaellen und die Abschlussverifikation dieser Semantik

Bewusst nach hinten geschobener Optimierungstrack:
- minimierte FSM-Synthese statt rein struktureller SOP-Netze
- Nutzung vorhandener FF-Komplementausgaenge statt separater Inverter, wo
  fachlich moeglich
- spaeter ggf. boolesche Minimierung mit gemeinsamen Termen und Technology-
  Mapping
- Reihenfolge bleibt bewusst:
  1. semantische Projektion / STT / Timing / Subsystem-Grenzen stabilisieren
  2. dann erst Netzlisten-Kompression und Gate-Minimierung

Zusaetzliches offenes Struktur-Arbeitspaket:
- `validation/race-panel-fixes/work-package.md`
- Kernidee: Race-Lifecycle als eigene Store-Logik behandeln, nicht als lokaler Panel-Hotfix
- erster und zweiter verifizierter Slice sind umgesetzt: Dedupe/Pruning/Reset,
  Incident-Metadaten `count`, `firstSeen`, `lastSeen` sowie gemeinsame
  Helferschicht fuer Race-Liste und Markierungen
- aktueller Abschluss: konservatives Struktur-Fingerprint-Pruning fuer
  Glitch-Ursachen und explizit dokumentierte Reset-Semantik schliessen den
  Race-Lifecycle fuer den aktuellen Scope ab; weitere Arbeit waere nur noch
  spaetere optionale Vertiefung

### W5. Hierarchie und Exportierbarkeit

Status: **TEILWEISE ERREICHT** (2026-03-21)

- Custom ICs sind simulativ nutzbar
- Ein einlagiger HDL-Exportpfad fuer registrierte Custom ICs ist jetzt ueber strukturelles Flattening verifiziert
- Ein kleiner read-only Struktur-Layer beschreibt jetzt Custom-IC-Grenzen zentral: Ein-/Ausgaenge, stateful vs. combinational, Clock-/Reset-Relevanz und die aktuelle Flattening-Grenze
- Eine explizite Policy-Schicht unterscheidet jetzt sauber zwischen one-level kombinatorisch, one-level sequentiell und bewusst geblockter Nested-Hierarchie
- Ein zusaetzlicher read-only Contract-Layer stuft Custom-IC-Grenzen jetzt als canonical, degraded oder blocked ein und faengt kaputte one-level-Faelle wie tote Eingangsports, ungetriebene OUTPUT_LED-Grenzen oder Multi-Driver-Ausgaenge zentral ab
- Ein weiterer read-only Nested-Readiness-Layer klassifiziert jetzt, welche one-level-Custom-ICs spaeter ueberhaupt fuer eine kontrollierte Nested-Freigabe taugen wuerden: eligible kombinatorisch, eligible sequentiell, degraded contract, blocked contract oder bereits nested
- Ein zusaetzlicher read-only Nested-Allow-Policy-Layer leitet daraus jetzt explizit ab, welche one-level-Custom-ICs spaeter ueberhaupt als kontrollierte Nested-Kandidaten fuer Registrierung und Export gelten duerften; das aktuelle Produktverhalten bleibt dabei unveraendert bewusst blockierend
- Ein kleiner Rollout-Schnitt nutzt diese Vorarbeit jetzt praktisch: direkte kanonische kombinatorische Nested-Custom-ICs koennen gespeichert und fuer HDL rekursiv strukturell aufgeloest werden; stateful und tiefere Nested-Faelle bleiben weiter bewusst blockiert
- Der Datei-/Persistenzpfad haengt jetzt nicht mehr stumm an lokal registrierten Custom-ICs: gespeicherte Schaltungen betten ihre verwendeten Custom-IC-Definitionen rekursiv ein und rehydrieren sie beim Laden vor der Gate-Validierung
- Es gibt jetzt gezielte Unit-Regressionen fuer kombinatorische, sequentielle und bewusst geblockte verschachtelte Custom-IC-Faelle
- Die Golden-Regression wurde fuer Hierarchie ebenfalls verbreitert: zusaetzlich zu Half-Adder und REG4 gibt es jetzt einen one-level Tri-State-Fall, einen one-level 74HC194-Fall mit verstecktem Registerzustand, einen ersten direkten nested-combinational-Custom-IC-Passfall und nun auch einen ersten expliziten tieferen Nested-Boundary-Fall
- Export-Modal und Custom-IC-Dialog spiegeln diese Policy jetzt explizit im UI: one-level-Faelle als strukturell aufloesbar, Nested-Faelle als bewusst geblockt
- Offene Entscheidung bleibt: tiefere/nestbare Hierarchie first-class exportierbar machen oder bewusst begrenzen

### W6. Qualitaetsgates und CI

Status: **WEITGEHEND ERREICHT** (2026-03-20)

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
- Golden Corpus v1 mit 27 Referenzschaltungen  ausfuehrbar + CI
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
- Fuer FSM-Exporte ist zusaetzlich das Struktur-Arbeitspaket offen: semantische Projektion fuer STT/Timing statt Roh-Gate-Anzeige, inklusive read-only Sequential-Projection-Layer und statischer/verkuerzter STT
- Fuer Race-/Hazard-Monitoring ist das Struktur-Arbeitspaket fuer den aktuellen Scope abgeschlossen; spaetere Erweiterungen waeren nur noch optionale Vertiefung

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

## Naechster empfohlener Fokus (Stand 2026-03-20)

1. **P2:** Funktionale Schaltungssimulation im Golden Corpus weiter vertiefen (Trace-Depth-Hardening ist jetzt ueber alle gelandeten `GC-V2-*`-Seeds verbreitert; als Naechstes besonders grosse oder stateful Seeds weiter verdichten)
2. **P2:** Contract-Runner-Abdeckung weiter verbreitern (komplexere circuit-level Muster)
3. **P2:** Golden Corpus v2 ausbauen (mehr Schaltungen, Hierarchie, grosse Designs)
Fuenfzehn v2-Pilot-Seeds bis `GC-V2-15` sind jetzt integriert; als naechster sauberer Abschluss-Schritt folgt zuerst die Akzeptanz-/Report-Haertung des erweiterten Corpus, bevor spaeter weitere Grossfaelle oder die kontrollierte Aufweitung der jetzt dokumentierten tieferen Hierarchie-Grenze nachgezogen werden
4. **P2:** Branch Protection / Required Checks in GitHub Settings konfigurieren (externer Schritt)
5. **P2:** CI-Performance (HDL-Tool-Caching, Docker-Image)

Phase B (0/1/Z/X und Mehrtreiberauflosung) ist abgeschlossen.
Phase D (CI-Qualitaetsgates) ist weitgehend erreicht mit 6 Jobs.
Phase A (HDL-Differenztest-Infrastruktur) ist teilweise erreicht mit Golden Corpus v1 + Contract Runner v1.
Naechster Schwerpunkt: Phase A Vertiefung (funktionale HDL-Simulation, Corpus-v2) und Phase C (breiterer Waveform-/Visual-Diff fuer die UI-Projektion).
