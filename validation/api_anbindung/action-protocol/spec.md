# AI-Action-Protocol

Version: 1
Status: aktiv

## Zweck

Ein Modell kann neben seiner Textantwort genau einen `circuit-actions`-Block
vorschlagen. Der Broker leitet den Text unverändert weiter. Das Frontend
entfernt den Block aus der sichtbaren Chatnachricht, validiert ihn vollständig
und zeigt eine Vorschau. Ohne ausdrückliche Bestätigung wird die Schaltung nicht
verändert.

```text
Modell -> Broker -> Frontend-Validierung -> Vorschau -> Bestätigung -> ein Dispatch
```

## Format und Grenzen

````markdown
```circuit-actions
{
  "version": 1,
  "actions": [
    { "type": "ADD_GATE", "gateType": "AND", "ref": "and1" }
  ]
}
```
````

- höchstens ein Block pro Antwort
- valides JSON mit exakt den Feldern `version` und `actions`
- `version` muss `1` sein
- 1 bis 64 Aktionen
- maximal 32.000 Zeichen pro Block
- unbekannte Felder oder Aktionstypen sind ungültig
- IDs, Referenzen und Portnamen dürfen keine Steuerzeichen enthalten
- das Modell gibt keine Koordinaten vor; neue Gates werden automatisch unter
  der bestehenden Schaltung angeordnet

## Referenzen

`ref` bezeichnet ein Gate, das zuvor im selben Block erzeugt wurde. Eine
Referenz beginnt mit einem Buchstaben und enthält höchstens 64 Zeichen aus
`A-Z`, `a-z`, `0-9`, `_` und `-`.

`id` bezeichnet ein Gate, das bereits in der aktuellen Schaltung vorhanden ist.
Ein Selektor oder Endpunkt enthält immer exakt eines von `ref` oder `id`.

```json
{ "ref": "and1", "port": "out" }
```

```json
{ "id": "bestehende-gate-id", "port": "a" }
```

## Aktionen

### Gates und Ein-/Ausgänge anlegen

```json
{ "type": "ADD_GATE", "gateType": "XOR", "ref": "sum" }
```

Erlaubte `gateType`-Werte:

`AND`, `OR`, `XOR`, `NAND`, `NOR`, `XNOR`, `NOT`, `BUFFER`, `SR_LATCH`,
`D_FF`, `JK_FF`

```json
{ "type": "ADD_INPUT", "nodeType": "INPUT_SWITCH", "ref": "a" }
```

Für `ADD_INPUT` sind `INPUT_SWITCH` und `CLOCK` erlaubt.

```json
{ "type": "ADD_OUTPUT", "nodeType": "OUTPUT_LED", "ref": "result" }
```

Für `ADD_OUTPUT` ist nur `OUTPUT_LED` erlaubt. Die drei Aktionen akzeptieren
keine zusätzlichen Felder. Ein sichtbares Label wird bei Bedarf anschließend
mit `SET_LABEL` gesetzt.

### Ports verbinden

```json
{
  "type": "CONNECT",
  "from": { "ref": "a", "port": "out" },
  "to": { "ref": "sum", "port": "a" }
}
```

`from.port` muss ein Ausgang des Quell-Gates und `to.port` ein Eingang des
Ziel-Gates sein. Selbstverbindungen und ein zweiter Treiber am selben Eingang
werden abgelehnt.

Häufige Ports:

| Gate | Eingänge | Ausgänge |
|---|---|---|
| `INPUT_SWITCH`, `CLOCK` | – | `out` |
| `OUTPUT_LED` | `in` | – |
| `AND`, `OR`, `XOR`, `NAND`, `NOR`, `XNOR` | `a`, `b` | `out` |
| `NOT`, `BUFFER` | `a` | `out` |
| `SR_LATCH` | `s`, `r` | `q`, `q_n` |
| `D_FF` | `d`, `clk` | `q`, `q_n` |
| `JK_FF` | `j`, `k`, `clk` | `q`, `q_n` |

### Label setzen

```json
{ "type": "SET_LABEL", "ref": "sum", "label": "Summe" }
```

Alternativ kann ein bestehendes Gate über `id` angesprochen werden. Das Label
ist 1 bis 128 Zeichen lang und darf keine Steuerzeichen enthalten.

### Bestehendes Gate löschen

```json
{ "type": "DELETE_NODE", "id": "bestehende-gate-id" }
```

`DELETE_NODE` akzeptiert ausschließlich die `id` eines aktuell vorhandenen
Gates. Seine Verbindungen werden mit entfernt. Die Vorschau kennzeichnet diese
Aktion als destruktiv.

### Schaltungsinhalt leeren

```json
{ "type": "CLEAR" }
```

`CLEAR` ist höchstens einmal und nur als erste Aktion erlaubt. Es entfernt alle
Gates und Verbindungen, erhält aber die Identität der geöffneten Schaltung. Die
Vorschau kennzeichnet die Aktion als destruktiv.

## Validierung und Ausführung

Der Executor simuliert den gesamten Block zunächst gegen ein virtuelles Modell
der aktuellen Schaltung. Folgende Fehler verwerfen den vollständigen Block:

- ungültiges JSON, falsche Version oder mehrere Blöcke
- unbekannte oder nicht freigegebene Gate-Typen
- unbekannte, doppelte oder syntaktisch ungültige Referenzen
- nicht vorhandene Gates oder Ports
- falsche Port-Richtung, Selbstverbindung oder bereits belegter Eingang
- unbekannte oder fehlende Felder
- ungültige Position von `CLEAR`
- Überschreitung einer Größen- oder Anzahlgrenze

Es gibt keine Teilanwendung und keine übersprungenen Einzelbefehle. Erst ein
vollständig gültiger Block erzeugt eine sichtbare, geordnete Vorschau. Der
Nutzer kann sie verwerfen oder bestätigen; destruktive Einträge und der
Bestätigungsbutton sind besonders markiert.

Unmittelbar vor der Bestätigung wird derselbe Quellblock noch einmal gegen den
neuesten Schaltungszustand validiert. Danach werden alle Mutationen mit genau
einem `CIRCUIT_ACTIONS_APPLY_BATCH`-Dispatch angewendet. Der komplette Block ist
damit atomar und über genau einen Undo-Schritt rückgängig zu machen, auch wenn er
mit `CLEAR` beginnt.

## Beispiel: Halbaddierer

```json
{
  "version": 1,
  "actions": [
    { "type": "ADD_INPUT", "nodeType": "INPUT_SWITCH", "ref": "a" },
    { "type": "ADD_INPUT", "nodeType": "INPUT_SWITCH", "ref": "b" },
    { "type": "ADD_GATE", "gateType": "XOR", "ref": "sum" },
    { "type": "ADD_GATE", "gateType": "AND", "ref": "carry" },
    { "type": "ADD_OUTPUT", "nodeType": "OUTPUT_LED", "ref": "sumOut" },
    { "type": "ADD_OUTPUT", "nodeType": "OUTPUT_LED", "ref": "carryOut" },
    { "type": "CONNECT", "from": { "ref": "a", "port": "out" }, "to": { "ref": "sum", "port": "a" } },
    { "type": "CONNECT", "from": { "ref": "b", "port": "out" }, "to": { "ref": "sum", "port": "b" } },
    { "type": "CONNECT", "from": { "ref": "a", "port": "out" }, "to": { "ref": "carry", "port": "a" } },
    { "type": "CONNECT", "from": { "ref": "b", "port": "out" }, "to": { "ref": "carry", "port": "b" } },
    { "type": "CONNECT", "from": { "ref": "sum", "port": "out" }, "to": { "ref": "sumOut", "port": "in" } },
    { "type": "CONNECT", "from": { "ref": "carry", "port": "out" }, "to": { "ref": "carryOut", "port": "in" } },
    { "type": "SET_LABEL", "ref": "sumOut", "label": "Summe" },
    { "type": "SET_LABEL", "ref": "carryOut", "label": "Übertrag" }
  ]
}
```
