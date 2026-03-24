# AI-Action-Protocol – Spezifikation

Version: 1
Status: **aktiv – API2-01**
Stand: 2026-03-24

---

## Zweck

Dieses Dokument definiert das Befehlsprotokoll, über das ein KI-Modell strukturierte Schaltungsoperationen im Logic-Gate-Simulator auslösen kann. Es ist der gemeinsame Vertrag zwischen dem System-Prompt (API2-02) und dem Frontend-Executor (API2-03).

---

## Architektur-Entscheidung: Option A (MVP)

Der Broker leitet den Antworttext des Modells **unverändert** ans Frontend durch. Das Frontend extrahiert und führt Befehlsblöcke selbst aus. Der Broker-Contract (`chat.ts`) bleibt unverändert – Befehle reisen im vorhandenen `message`-String.

```
Modell-Antwort (text + circuit-actions-Block)
  → Broker (durchleiten, kein Parse)
  → Frontend: extrahiert Block, validiert, führt aus
```

Option B (Broker parst und gibt `{ text, commands[] }` zurück) und Option C (Streaming) sind spätere Erweiterungspfade, kein MVP-Scope.

---

## Einbettungsformat

Befehle werden als Markdown-Codeblock mit dem Sprach-Tag `circuit-actions` in den Antworttext eingebettet:

````markdown
Hier ist der Halbaddierer:

```circuit-actions
{
  "version": 1,
  "actions": [...]
}
```

Die Schaltung besteht aus einem XOR-Gatter für die Summe und einem AND-Gatter für den Übertrag.
````

**Regeln:**
- Ein Antworttext darf **maximal einen** `circuit-actions`-Block enthalten.
- Der Block muss **valides JSON** sein. Syntaxfehler führen zu einem Executor-Fehler, nicht zu einem Silent-Fail.
- Text vor und nach dem Block wird normal angezeigt.
- Gibt es keinen Block, ist die Antwort rein erklärend – kein Fehler.

---

## Protokollstruktur

```json
{
  "version": 1,
  "actions": [
    { "type": "...", ... }
  ]
}
```

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `version` | `number` | ja | Protokollversion. Aktuell immer `1`. |
| `actions` | `Action[]` | ja | Geordnete Liste von Befehlen. Werden sequenziell ausgeführt. |

---

## Referenzmodell

Das Protokoll kennt zwei Arten von Gate-Referenzen:

### `ref` – neue Gates (innerhalb des Blocks vergeben)
Beim Hinzufügen eines neuen Gates vergibt das Modell ein frei wählbares `ref`-Label. Dieses Label ist nur innerhalb des aktuellen Befehlsblocks gültig und dient als Verknüpfungsanker für nachfolgende `CONNECT`-Befehle.

```json
{ "type": "ADD_GATE", "gateType": "XOR", "ref": "XOR_SUM" }
```

Danach kann `CONNECT` das Gate als `"XOR_SUM"` ansprechen:
```json
{ "type": "CONNECT", "from": { "gate": "XOR_SUM", "port": "out" }, "to": { ... } }
```

### `id` – bestehende Gates (aus dem Circuit-Snapshot)
Gates, die bereits in der Schaltung existieren, werden über ihre `id` aus dem Circuit-Context referenziert. Diese IDs sind im Snapshot unter `elements.gates[].id` und `elements.nodes[].id` sichtbar.

```json
{ "type": "CONNECT", "from": { "gate": "gate-uuid-1234", "port": "out" }, "to": { ... } }
```

**Kollision:** `ref`-Namen dürfen nicht mit bestehenden Gate-IDs aus dem Snapshot übereinstimmen. Der Executor prüft `ref` zuerst gegen die Ref-Map, dann gegen bekannte IDs.

---

## Positionierung – Auto-Layout

Gates werden **ohne Koordinaten** spezifiziert. Der Executor vergibt Positionen automatisch auf einem regelmäßigen Raster (z. B. 120 × 80 px Abstände, links-nach-rechts nach Einfügereihenfolge). Das Modell macht keine Angaben zu `x` und `y`.

Begründung: Das Modell kennt weder Gate-Abmessungen noch Canvas-Skalierung. Koordinaten-Arithmetic ist für LLMs fehleranfällig und für die funktionale Korrektheit der Schaltung irrelevant.

> Spätere Erweiterung (API2-04+): Optionales `anchor`-Feld für relative Positionierung zu bestehenden Gates.

---

## Befehlstypen

### `ADD_GATE`

Fügt ein Logik-Gatter hinzu.

```json
{ "type": "ADD_GATE", "gateType": "<GateTypeId>", "ref": "<ref>", "label": "<optional>" }
```

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `gateType` | `string` | ja | Exakter GateTypeId-String (siehe Anhang A) |
| `ref` | `string` | ja | Kurzname für spätere Referenzierung im Block |
| `label` | `string` | nein | Sichtbares Label im Simulator. Wenn weggelassen: `ref` wird als Label verwendet |

### `ADD_INPUT`

Fügt einen Eingangsschalter (`INPUT_SWITCH`) hinzu.

```json
{ "type": "ADD_INPUT", "ref": "<ref>", "label": "<optional>" }
```

Kurzform für `ADD_GATE` mit `gateType: "INPUT_SWITCH"`. Output-Port: `out`.

### `ADD_OUTPUT`

Fügt eine Ausgangs-LED (`OUTPUT_LED`) hinzu.

```json
{ "type": "ADD_OUTPUT", "ref": "<ref>", "label": "<optional>" }
```

Kurzform für `ADD_GATE` mit `gateType: "OUTPUT_LED"`. Input-Port: `in`.

### `CONNECT`

Verbindet zwei Ports mit einem Draht.

```json
{
  "type": "CONNECT",
  "from": { "gate": "<ref-oder-id>", "port": "<portId>" },
  "to":   { "gate": "<ref-oder-id>", "port": "<portId>" }
}
```

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `from.gate` | `string` | ja | `ref` eines neuen Gates oder `id` eines bestehenden Gates |
| `from.port` | `string` | ja | Port-ID des Quell-Gates (z. B. `out`, `q`) |
| `to.gate` | `string` | ja | `ref` oder `id` des Ziel-Gates |
| `to.port` | `string` | ja | Port-ID des Ziel-Gates (z. B. `a`, `in`) |

Port-IDs sind Gate-typspezifisch (siehe Anhang B).

### `SET_LABEL`

Setzt das sichtbare Label eines Gates.

```json
{ "type": "SET_LABEL", "gate": "<ref-oder-id>", "label": "<text>" }
```

### `DELETE_NODE`

Entfernt ein Gate aus der Schaltung. Bestehende Verbindungen zu diesem Gate werden automatisch mitgelöscht.

```json
{ "type": "DELETE_NODE", "gate": "<ref-oder-id>" }
```

### `CLEAR`

Leert die gesamte Schaltung (alle Gates und Drähte).

```json
{ "type": "CLEAR" }
```

> Achtung: `CLEAR` ist destruktiv und löscht auch bereits existierende Schaltungsinhalte. Das Modell soll diesen Befehl nur ausgeben, wenn der Nutzer explizit eine neue leere Schaltung anlegen möchte.

---

## Fehlerverhalten

| Fehlerfall | Verhalten des Executors |
|---|---|
| Ungültiges JSON im Block | Gesamter Block wird verworfen; Fehlermeldung im UI |
| Unbekannter `type` | Befehl wird übersprungen; Warnung; restliche Befehle werden ausgeführt |
| Unbekannter `gateType` | Befehl wird übersprungen; Warnung |
| Unbekannte `ref` oder `id` | Befehl wird übersprungen; Warnung |
| Port nicht vorhanden | Befehl wird übersprungen; Warnung |
| `version !== 1` | Gesamter Block wird verworfen; Fehlermeldung im UI |
| Teilfehler in Sequenz | Bereits ausgeführte Befehle bleiben erhalten (kein Rollback auf Block-Ebene) |

Warnungen werden als nicht-blockierende UI-Hinweise angezeigt. Der Nutzer sieht eine Zusammenfassung: `"3 Befehle ausgeführt, 1 Warnung"`.

---

## Beispiel-Befehlssequenzen

### Halbaddierer (Half Adder)

Eingänge: A, B → Ausgänge: Summe (S), Übertrag (C)

```json
{
  "version": 1,
  "actions": [
    { "type": "ADD_INPUT",  "ref": "A",        "label": "A" },
    { "type": "ADD_INPUT",  "ref": "B",        "label": "B" },
    { "type": "ADD_GATE",   "gateType": "XOR", "ref": "XOR_S", "label": "XOR" },
    { "type": "ADD_GATE",   "gateType": "AND", "ref": "AND_C", "label": "AND" },
    { "type": "ADD_OUTPUT", "ref": "S",        "label": "S" },
    { "type": "ADD_OUTPUT", "ref": "C",        "label": "C" },
    { "type": "CONNECT", "from": { "gate": "A",     "port": "out" }, "to": { "gate": "XOR_S", "port": "a" } },
    { "type": "CONNECT", "from": { "gate": "B",     "port": "out" }, "to": { "gate": "XOR_S", "port": "b" } },
    { "type": "CONNECT", "from": { "gate": "A",     "port": "out" }, "to": { "gate": "AND_C", "port": "a" } },
    { "type": "CONNECT", "from": { "gate": "B",     "port": "out" }, "to": { "gate": "AND_C", "port": "b" } },
    { "type": "CONNECT", "from": { "gate": "XOR_S", "port": "out" }, "to": { "gate": "S",     "port": "in" } },
    { "type": "CONNECT", "from": { "gate": "AND_C", "port": "out" }, "to": { "gate": "C",     "port": "in" } }
  ]
}
```

---

### Volladdierer (Full Adder)

Eingänge: A, B, Cin → Ausgänge: Summe (S), Übertrag (Cout)

```json
{
  "version": 1,
  "actions": [
    { "type": "ADD_INPUT",  "ref": "A",          "label": "A" },
    { "type": "ADD_INPUT",  "ref": "B",          "label": "B" },
    { "type": "ADD_INPUT",  "ref": "CIN",        "label": "Cin" },
    { "type": "ADD_GATE",   "gateType": "XOR",   "ref": "XOR1",  "label": "XOR1" },
    { "type": "ADD_GATE",   "gateType": "XOR",   "ref": "XOR2",  "label": "XOR2" },
    { "type": "ADD_GATE",   "gateType": "AND",   "ref": "AND1",  "label": "AND1" },
    { "type": "ADD_GATE",   "gateType": "AND",   "ref": "AND2",  "label": "AND2" },
    { "type": "ADD_GATE",   "gateType": "OR",    "ref": "OR1",   "label": "OR1" },
    { "type": "ADD_OUTPUT", "ref": "S",          "label": "S" },
    { "type": "ADD_OUTPUT", "ref": "COUT",       "label": "Cout" },
    { "type": "CONNECT", "from": { "gate": "A",    "port": "out" }, "to": { "gate": "XOR1", "port": "a" } },
    { "type": "CONNECT", "from": { "gate": "B",    "port": "out" }, "to": { "gate": "XOR1", "port": "b" } },
    { "type": "CONNECT", "from": { "gate": "XOR1", "port": "out" }, "to": { "gate": "XOR2", "port": "a" } },
    { "type": "CONNECT", "from": { "gate": "CIN",  "port": "out" }, "to": { "gate": "XOR2", "port": "b" } },
    { "type": "CONNECT", "from": { "gate": "A",    "port": "out" }, "to": { "gate": "AND1", "port": "a" } },
    { "type": "CONNECT", "from": { "gate": "B",    "port": "out" }, "to": { "gate": "AND1", "port": "b" } },
    { "type": "CONNECT", "from": { "gate": "XOR1", "port": "out" }, "to": { "gate": "AND2", "port": "a" } },
    { "type": "CONNECT", "from": { "gate": "CIN",  "port": "out" }, "to": { "gate": "AND2", "port": "b" } },
    { "type": "CONNECT", "from": { "gate": "AND1", "port": "out" }, "to": { "gate": "OR1",  "port": "a" } },
    { "type": "CONNECT", "from": { "gate": "AND2", "port": "out" }, "to": { "gate": "OR1",  "port": "b" } },
    { "type": "CONNECT", "from": { "gate": "XOR2", "port": "out" }, "to": { "gate": "S",    "port": "in" } },
    { "type": "CONNECT", "from": { "gate": "OR1",  "port": "out" }, "to": { "gate": "COUT", "port": "in" } }
  ]
}
```

---

### SR-Latch

Eingänge: S, R → Ausgänge: Q, Q̄

```json
{
  "version": 1,
  "actions": [
    { "type": "ADD_INPUT",  "ref": "S",       "label": "S" },
    { "type": "ADD_INPUT",  "ref": "R",       "label": "R" },
    { "type": "ADD_GATE",   "gateType": "SR_LATCH", "ref": "LATCH" },
    { "type": "ADD_OUTPUT", "ref": "Q",       "label": "Q" },
    { "type": "ADD_OUTPUT", "ref": "Q_N",     "label": "Q̄" },
    { "type": "CONNECT", "from": { "gate": "S",     "port": "out" }, "to": { "gate": "LATCH", "port": "s"   } },
    { "type": "CONNECT", "from": { "gate": "R",     "port": "out" }, "to": { "gate": "LATCH", "port": "r"   } },
    { "type": "CONNECT", "from": { "gate": "LATCH", "port": "q"   }, "to": { "gate": "Q",     "port": "in"  } },
    { "type": "CONNECT", "from": { "gate": "LATCH", "port": "q_n" }, "to": { "gate": "Q_N",   "port": "in"  } }
  ]
}
```

---

## Anhang A – Verfügbare GateTypeIds

Nur diese Strings sind gültige `gateType`-Werte. Der Executor lehnt unbekannte TypeIds ab.

### Logik-Gatter

| TypeId | Beschreibung | Eingänge | Ausgänge |
|---|---|---|---|
| `AND` | 2-Eingang AND | `a`, `b` | `out` |
| `AND3` | 3-Eingang AND | `a`, `b`, `c` | `out` |
| `AND4` | 4-Eingang AND | `a`, `b`, `c`, `d` | `out` |
| `AND_C` | AND mit komplementärem Ausgang | `a`, `b` | `out`, `out_n` |
| `OR` | 2-Eingang OR | `a`, `b` | `out` |
| `OR3` | 3-Eingang OR | `a`, `b`, `c` | `out` |
| `OR4` | 4-Eingang OR | `a`, `b`, `c`, `d` | `out` |
| `OR_C` | OR mit komplementärem Ausgang | `a`, `b` | `out`, `out_n` |
| `NAND` | 2-Eingang NAND | `a`, `b` | `out` |
| `NAND3` | 3-Eingang NAND | `a`, `b`, `c` | `out` |
| `NAND4` | 4-Eingang NAND | `a`, `b`, `c`, `d` | `out` |
| `NAND_C` | NAND mit komplementärem Ausgang | `a`, `b` | `out`, `out_n` |
| `NOR` | 2-Eingang NOR | `a`, `b` | `out` |
| `NOR3` | 3-Eingang NOR | `a`, `b`, `c` | `out` |
| `NOR4` | 4-Eingang NOR | `a`, `b`, `c`, `d` | `out` |
| `NOR_C` | NOR mit komplementärem Ausgang | `a`, `b` | `out`, `out_n` |
| `XOR` | 2-Eingang XOR | `a`, `b` | `out` |
| `XOR3` | 3-Eingang XOR | `a`, `b`, `c` | `out` |
| `XOR_C` | XOR mit komplementärem Ausgang | `a`, `b` | `out`, `out_n` |
| `XNOR` | 2-Eingang XNOR | `a`, `b` | `out` |
| `NOT` | Inverter | `a` | `out` |
| `BUFFER` | Buffer | `a` | `out` |
| `SCHMITT` | Schmitt-Trigger | `a` | `out` |
| `TRIBUF` | Tri-State-Buffer | `a`, `en` | `out` |

### Routing

| TypeId | Beschreibung |
|---|---|
| `MUX2` | 2:1 Multiplexer |
| `MUX4` | 4:1 Multiplexer |
| `DEMUX2` | 1:2 Demultiplexer |
| `DEMUX4` | 1:4 Demultiplexer |
| `SPLIT4` | 4-Bit-Splitter |
| `SPLIT8` | 8-Bit-Splitter |
| `JUNCTION` | Draht-Verbindungspunkt |

### Arithmetik / Vergleich

| TypeId | Beschreibung |
|---|---|
| `ALU4` | 4-Bit ALU |
| `CMP1` | 1-Bit-Komparator |
| `CMP4` | 4-Bit-Komparator |

### I/O

| TypeId | Beschreibung | Eingänge | Ausgänge |
|---|---|---|---|
| `INPUT_SWITCH` | Eingangsschalter | – | `out` |
| `OUTPUT_LED` | Ausgangs-LED | `in` | – |
| `CONST_HIGH` | Konstant HIGH | – | `out` |
| `CONST_LOW` | Konstant LOW | – | `out` |
| `CLOCK` | Taktgenerator | – | `out` |
| `PUSH_BTN` | Taster | – | `out` |
| `TEXT_NOTE` | Textanmerkung (kein Signal) | – | – |
| `SEG7` | 7-Segment-Anzeige (binär) | `a`–`g` | – |
| `SEG7_BCD` | 7-Segment-Anzeige (BCD) | `d0`–`d3` | – |
| `SEG7_DUAL` | Dual 7-Segment | diverse | – |
| `SEG7_BCD_2` | Dual BCD 7-Segment | diverse | – |
| `ADC8` | 8-Bit ADC-Eingang | – | `d0`–`d7` |
| `DOTMATRIX8` | 8×8-Punktmatrix | diverse | – |

### Sequenzielle Logik (Flip-Flops / Latches)

| TypeId | Beschreibung | Eingänge | Ausgänge |
|---|---|---|---|
| `SR_LATCH` | SR-Latch | `s`, `r` | `q`, `q_n` |
| `D_FF` | D-Flip-Flop | `d`, `clk` | `q`, `q_n` |
| `D_FF_R` | D-FF mit synchronem Reset | `d`, `clk`, `rst` | `q`, `q_n` |
| `D_FF_ASSR` | D-FF mit asynchronem Set/Reset | `d`, `clk`, `set`, `rst` | `q`, `q_n` |
| `JK_FF` | JK-Flip-Flop | `j`, `clk`, `k` | `q`, `q_n` |
| `JK_FF_ASSR` | JK-FF mit asynchronem Set/Reset | `j`, `clk`, `k`, `set`, `rst` | `q`, `q_n` |
| `T_FF` | T-Flip-Flop | `t`, `clk` | `q`, `q_n` |
| `T_FF_ASSR` | T-FF mit asynchronem Set/Reset | `t`, `clk`, `set`, `rst` | `q`, `q_n` |
| `D_LATCH` | D-Latch | `d`, `en` | `q`, `q_n` |
| `SR_FF_EDGE` | SR-FF (flankengetriggert) | `s`, `clk`, `r` | `q`, `q_n` |
| `MS_JK_FF` | Master-Slave JK-FF | `j`, `clk`, `k` | `q`, `q_n` |

### Register / Speicher

| TypeId | Beschreibung |
|---|---|
| `REG4` | 4-Bit-Register |
| `REG8` | 8-Bit-Register |
| `SHIFT4` | 4-Bit-Schieberegister |
| `PISO4` | 4-Bit Parallel-In Serial-Out |
| `PIPO4` | 4-Bit Parallel-In Parallel-Out |
| `PIPO8` | 8-Bit Parallel-In Parallel-Out |
| `ROM256` | 256-Byte ROM |
| `RAM256` | 256-Byte RAM |

### Zähler

| TypeId | Beschreibung |
|---|---|
| `BIN_CTR7S` | 7-Segment-Binärzähler |
| `BIN_CTR_99` | BCD-Zähler 0–99 |

### IC 74xx-Bibliothek

| TypeId | Beschreibung |
|---|---|
| `74HC00` | Quad 2-Input NAND |
| `74HC04` | Hex Inverter |
| `74HC08` | Quad 2-Input AND |
| `74HC32` | Quad 2-Input OR |
| `74HC86` | Quad 2-Input XOR |
| `74HC138` | 3-zu-8-Decoder |
| `74HC283` | 4-Bit-Volladdierer |
| `74HC74` | Dual D-FF |
| `74HC595` | 8-Bit-Schieberegister |
| `74HC161` | 4-Bit-Binärzähler (synchron) |
| `74HC163` | 4-Bit-Binärzähler (sync. Reset) |
| `74HC151` | 8:1 Multiplexer |
| `74HC153` | Dual 4:1 Multiplexer |
| `74HC194` | 4-Bit Universal-Schieberegister |
| `74HC373` | Octal D-Latch |
| `74HC374` | Octal D-FF |
| `74HC148` | 8-zu-3-Prioritätsencoder |

---

## Anhang B – Port-IDs häufiger Gates

Vollständige Port-IDs sind immer aus dem Circuit-Snapshot (`elements.gates[].pins`) lesbar. Die folgende Tabelle listet die wichtigsten für den Einstieg:

| Gate | Eingangs-Ports | Ausgangs-Ports |
|---|---|---|
| `AND`, `OR`, `XOR`, `NAND`, `NOR`, `XNOR` | `a`, `b` | `out` |
| `AND3`, `OR3`, `XOR3`, `NAND3`, `NOR3` | `a`, `b`, `c` | `out` |
| `AND4`, `OR4`, `NAND4`, `NOR4` | `a`, `b`, `c`, `d` | `out` |
| `NOT`, `BUFFER`, `SCHMITT` | `a` | `out` |
| `TRIBUF` | `a`, `en` | `out` |
| `INPUT_SWITCH`, `CONST_HIGH`, `CONST_LOW`, `CLOCK` | – | `out` |
| `OUTPUT_LED` | `in` | – |
| `SR_LATCH` | `s`, `r` | `q`, `q_n` |
| `D_FF`, `D_FF_R` | `d`, `clk` (`rst`) | `q`, `q_n` |
| `JK_FF` | `j`, `clk`, `k` | `q`, `q_n` |
| `T_FF` | `t`, `clk` | `q`, `q_n` |
| `D_LATCH` | `d`, `en` | `q`, `q_n` |
| `MS_JK_FF` | `j`, `clk`, `k` | `q`, `q_n` |

---

## Abnahmekriterien (API2-01)

- [x] Protokoll-Spezifikation liegt als Markdown unter `validation/api_anbindung/action-protocol/spec.md`
- [x] Mindestens Halbaddierer, Volladdierer und SR-Latch als vollständige Beispiel-Sequenzen dokumentiert
- [x] Alle GateTypeIds mit korrekten Port-IDs aus dem Live-Code verifiziert
- [ ] API2-02: System-Prompt im `PromptOrchestrator` beschreibt das Protokoll und enthält ein Few-Shot-Beispiel
- [ ] API2-03: Frontend-Parser extrahiert `circuit-actions`-Blöcke und der Executor übersetzt sie in Store-Aktionen
