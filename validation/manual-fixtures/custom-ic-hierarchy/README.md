# Custom-IC Hierarchy Manual Fixtures

Diese Fixtures sind fuer die manuelle Verifikation von `HIER0-2` gedacht.

Wichtige Reihenfolge:

1. `hier0_half_adder_raw.lgsc.json` laden und als Custom IC mit dem exakten Namen `HIER0_HALF_ADDER` speichern
2. `hier0_half_adder_host.lgsc.json` laden und Verilog/VHDL exportieren
3. `hier0_reg4_raw.lgsc.json` laden und als Custom IC mit dem exakten Namen `HIER0_REG4_WRAP` speichern
4. `hier0_reg4_host.lgsc.json` laden und Verilog/VHDL exportieren
5. `hier0_nested_half_adder_attempt.lgsc.json` laden und versuchen, die Schaltung erneut als neues Custom IC zu speichern

Hinweise:

- Die Host-Dateien referenzieren bewusst `CIC_HIER0_HALF_ADDER` bzw. `CIC_HIER0_REG4_WRAP`
- Deshalb muessen die beiden Raw-Dateien vorher mit genau diesen Namen gespeichert worden sein
- Nach dem Speichern bleiben die benutzerdefinierten ICs ueber den lokalen Storage registriert und koennen dann aus der Host-Datei geladen werden
