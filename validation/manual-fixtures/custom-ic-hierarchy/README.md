# Custom-IC Hierarchy Manual Fixtures

Diese Fixtures sind fuer die manuelle Verifikation von `HIER0-2` und dem
nachfolgenden direkten Nested-Kombinationsschnitt gedacht.

Wichtige Reihenfolge:

1. `hier0_half_adder_raw.lgsc.json` laden und als Custom IC mit dem exakten Namen `HIER0_HALF_ADDER` speichern
2. `hier0_half_adder_host.lgsc.json` laden, `CIC_HIER0_HALF_ADDER` aus der Palette platzieren, verdrahten und dann Verilog/VHDL exportieren
3. `hier0_reg4_raw.lgsc.json` laden und als Custom IC mit dem exakten Namen `HIER0_REG4_WRAP` speichern
4. `hier0_reg4_host.lgsc.json` laden, `CIC_HIER0_REG4_WRAP` aus der Palette platzieren, verdrahten und dann Verilog/VHDL exportieren
5. `hier1_nested_half_adder_allowed.lgsc.json` laden und als direkt verschachteltes kombinatorisches Custom IC mit dem exakten Namen `HIER1_PARENT_HALF_ADDER` speichern
6. `hier1_nested_half_adder_host.lgsc.json` laden, `HIER1_PARENT_HALF_ADDER` aus der Palette platzieren, die sichtbaren Ports `a`, `b` und `sum_or_carry` verdrahten und dann Verilog/VHDL exportieren
7. `hier1_nested_reg4_blocked.lgsc.json` laden und pruefen, dass der stateful Nested-Fall weiter blockiert bleibt

Hinweise:

- Die Host-Dateien sind jetzt bewusst reine Canvas-Scaffolds ohne eingebettete `CIC_*`-Instanzen
- `hier1_nested_half_adder_allowed.lgsc.json` referenziert `CIC_HIER0_HALF_ADDER`
- Circuit-JSON-Dateien tragen die Definition benutzerdefinierter ICs aktuell nicht mit sich
- Deshalb muessen die benoetigten Custom-ICs vorher mit genau diesen Namen gespeichert und dann aus der Palette in die Host-Scaffolds gesetzt werden
- Das neue parent-IC muss fuer den Nested-Test exakt als `HIER1_PARENT_HALF_ADDER` gespeichert werden
- Nach dem Speichern bleiben die benutzerdefinierten ICs ueber den lokalen Storage registriert und koennen aus der Palette wieder platziert werden
