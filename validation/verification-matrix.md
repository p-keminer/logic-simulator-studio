# Repeatable Verification Matrix

Datum: 2026-03-19
Repo: `<repo-root>`

## Zweck

Diese Matrix definiert das feste Pruefmuster fuer kuenftige Aenderungen.
Jede relevante Logikklasse wird immer gegen dieselben Orakel geprueft.

## Orakel

Die folgenden Ebenen sind die Standard-Orakel:

- `CORE`
  interner Simulator
- `TT/STT`
  Wahrheitstabelle oder Zustandsuebergangstabelle
- `TIMING`
  Timing-Diagramm
- `VERILOG`
  Export plus externer Lauf mit `iverilog`
- `VHDL`
  Export plus externer Lauf mit `ghdl`
- `SYNTH`
  Synthese-Sanity mit `yosys`
- `UI`
  Browser-/Projektionspruefung

## Pflichtmuster

| Klasse | Beispielmuster | CORE | TT/STT | TIMING | VERILOG | VHDL | SYNTH | UI |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Unary combinational | `NOT`, `BUF` | X | X | X | X | X | X | X |
| Binary combinational | `AND`, `OR`, `XOR`, `NAND`, `NOR` | X | X | X | X | X | X | X |
| Multi-stage combinational | Adder, comparator, mux chain | X | X | X | X | X | X | X |
| Decoder / encoder / mux | `74HC138`, `74HC148`, `74HC151` | X | X | X | X | X | X | X |
| Feedback without clock | `SR_LATCH`, `D_LATCH` | X | X | X | X | X | X | X |
| Edge FF basic | `D_FF`, `JK_FF`, `T_FF` | X | X | X | X | X | X | X |
| Async controls | preset, clear, reset | X | X | X | X | X | X | X |
| Register with enable/load | `REG4`, `REG8`, `74HC373`, `74HC374` | X | X | X | X | X | X | X |
| Shift register | `SHIFT4`, `PISO4`, `PIPO4`, `74HC194`, `74HC595` | X | X | X | X | X | X | X |
| Counter | `BIN_CTR*`, `74HC161`, `74HC163` | X | X | X | X | X | X | X |
| Memory | ROM/RAM | X |  | X | X | X | X | X |
| Tri-State direct | `TRIBUF`, `OE` inactive | X | X | X | X | X | X | X |
| Tri-State downstream | `TRIBUF -> logic` | X | X | X | X | X | X | X |
| Multi-driver | two drivers on one net | X | X | X | X | X | X | X |
| Mixed datapath | ALU + register + counter + mux | X | X | X | X | X | X | X |
| Hierarchical custom IC | custom block used in larger circuit | X | X | X | X | X | X | X |
| FSM export projection | FSM-Editor -> synthetisierte Canvas-Schaltung | X | X | X | X | X | X | X |
| Race monitor lifecycle | Race-Erkennung -> Panel -> Wire-Marking -> Reset | X | X | X |  |  |  | X |

## Mindestabdeckung pro Klasse

### Kombinatorik

- alle statischen Inputkombinationen fuer kleine Gatter
- mindestens ein mehrstufiger Pfad
- mindestens ein Fanout-Fall

### Latches und Flip-Flops

- initialer Zustand
- Haltefall
- aktiver Uebergang
- inaktiver Uebergang
- asynchrone Steuerleitungen, falls vorhanden

### Register und Counter

- Reset
- Enable
- Load
- mindestens drei aufeinanderfolgende Taktschritte
- Randfall an Ueberlauf/Grenze

### Tri-State und Bus

- `OE aktiv`
- `OE inaktiv`
- `Z` direkt am Ausgang
- `Z` durch nachgelagerte Logik
- zwei gleiche aktive Treiber
- zwei unterschiedliche aktive Treiber
- nur `Z`-Treiber

### Hierarchie

- Subcircuit allein
- Subcircuit in Oberbaugruppe
- Exportpfad oder expliziter Unsupported-Befund

### FSM-Exportprojektion

- Editor-Zustandsraum fachlich sauber definiert
- synthetisierte State-Bits kanonisch erkennbar
- STT ist eine statische Zustandsrelation und keine Live-Mitschrift des
  blinkenden Simulationszustands
- verkuerzte STT fuer breite sequenzielle Schaltungen ist deterministisch und
  fachlich stabil
- STT zeigt nur fachliche Zustands-/Ausgangssignale in der Standardansicht
- Timing zeigt keine doppelten `Q`/`!Q`/LED-Mirror-Kanaele in der Standardansicht
- HDL-Export bleibt konsistent zur kanonischen Projektion

### FSM-Exportregressionen

Die folgenden projektionsspezifischen Regressionen sollen den neuen
Infrastrukturschnitt absichern:

- `fsm_projection_batch_consistency`
  - eine Synthese erzeugt einen gemeinsamen Batch-Schluessel fuer alle
    projektierten Gates
  - zwei getrennte Synthesen bleiben isoliert
  - gemischte Batches fallen stabil auf die generische STT zurueck
- `fsm_projection_canonical_stt`
  - isolierte FSMs zeigen nur kanonische Eingangs-, Zustands- und
    Ausgangssignale
  - Helper-, Mirror- und Inversionssignale bleiben aus der Standardansicht
    heraus
- `fsm_projection_timing_canonical_channels`
  - Timing nutzt dieselbe kanonische Projektion wie die STT
  - Reihenfolge und Gruppierung bleiben deterministisch
  - keine Doppelung von `Q`/`!Q`/LED-Mirror-Kanaelen
- `fsm_projection_reduced_view`
  - breite FSMs erhalten eine reduzierte, aber stabile STT
  - Steuerleitungen bleiben sichtbar, Daten-/Hilfssignale werden begrenzt
- `fsm_projection_mixed_fallback`
  - eine bewusst gemischte FSM-/Nicht-FSM-Schaltung laeuft weiter ueber die
    generische STT statt in eine halb-projizierte Sonderansicht zu kippen
- `fsm_projection_legacy_fixture`
  - ein real gespeicherter Alt-Export ohne Projektionsmetadaten wird, falls die
    Struktur eindeutig genug ist, read-only in die kanonische Projektion
    ueberfuehrt
  - bei nicht eindeutigen Altfaellen bleibt der Fallback aktiv, statt eine
    halb-geratene Projektion zu erzwingen

### Race-Monitor-Lifecycle

- geloeschte Race-Ursachen verschwinden automatisch aus Panel und Markierungen
- manueller Reset leert den Race-Zustand reproduzierbar
- identische wiederkehrende Races werden koalesziert statt endlos neu angehaengt
- Race-Lifecycle-Logik bleibt von reinem Panel-Rendering getrennt

## Pflichtartefakte pro Befund

Jeder neue Fehlerfall muss mindestens erzeugen:

- Repro-Schaltung
- Stimulus-Sequenz
- erwartetes Resultat
- tatsaechliches Resultat
- Klassifikation
- Regressionstest oder Golden-Corpus-Eintrag

## Statusklassen

- `pass`
  konsistent ueber alle erwarteten Orakel
- `fail`
  echter Widerspruch oder klarer Produktfehler
- `warn`
  bekannte Modellgrenze oder bewusst nicht voll unterstuetzter Fall
- `tool-fail`
  externer Runner oder Infrastrukturdefekt

## Freigaberegel fuer Kernumbauten

Ein Kernumbau an Signalmodell, Scheduler, Tick-Engine, Busauflosung oder Export darf erst als abgeschlossen gelten, wenn:

- alle Pflichtmuster der betroffenen Klassen gelaufen sind
- keine neue rote Regression ausserhalb der bewusst geaenderten Semantik entsteht
- der Unterschied gegen vorher dokumentiert ist
- mindestens ein externer HDL-Lauf den neuen Zustand bestaetigt

## Sofort relevante Fokusmuster

Diese Muster muessen vor allen anderen voll gruen werden:

1. `TRIBUF -> NOT`
2. `74HC373` mit `OE`
3. `74HC374` mit `OE`
4. `74HC595` seriell plus `OE`
5. Zwei Treiber auf einem Netz
6. `D_FF`, `JK_FF`, `T_FF` mit STT und Timing
7. `74HC161` und `74HC163` ueber mehrere Takte
8. `74HC194` Shift/Load/Freeze
9. gemischter Datenpfad `ALU + Register + Counter`
10. FSM-Editor -> Canvas-Synthese mit STT-/Timing-Projektion
11. Race-Erkennung -> Wire-Loeschung -> Auto-Prune + Manual-Reset + Dedupe

Diese elf Muster decken den groessten Teil des verbleibenden fachlichen Risikos ab.
