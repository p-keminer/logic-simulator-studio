# Hardening-Plan: Undo/Redo-System

**Stand: 2026-03-24**

## Problemanalyse

Das aktuelle Undo/Redo speichert vollstaendige Circuit-Snapshots inklusive
transienter Simulationsdaten (`gate.outputSignals`, `wire.signal`). Nach einem
Undo/Redo sind diese Signalwerte veraltet, bis die Simulation im naechsten
RAF-Frame neu settled (~16 ms). Zusaetzlich wird der Viewport ueberschrieben
und bei schnellen Doppel-Undos kann der Redo-Stack inkonsistent werden.

## Arbeitspakete

### AP-1: `stripTransientData` — Transiente Daten aus Snapshots entfernen

**Dateien:** `src/store/CircuitContext.tsx`

**Was:**
Eine Hilfsfunktion `stripTransientData(circuit: Circuit): Circuit`, die:
- `gate.outputSignals` auf Default-Werte zuruecksetzt
  (`{ value: 0, version: 0, lastChangedAt: 0 }` fuer alle Ports)
- `wire.signal` ebenso auf Default setzt
- `gate.isSelected` / `wire.isSelected` auf `false` setzt (Selection ist transient)
- `customState` **behaelt** (Switch-Positionen, FF-Q-Werte, ROM-Daten,
  Zaehlerstaende = User-Zustand, nicht Simulations-Zustand)
- Viewport entfernt (wird in AP-2 separat behandelt)

Aufruf in `dispatchWithHistory` vor dem Stack-Push:
```typescript
const snapshot = stripTransientData(circuitRef.current);
```

**Abhaengigkeiten:** Keine — Basis-AP

**Risiken:**
- `customState` enthaelt sowohl User-Zustand (Switch-Wert) als auch
  Simulations-Zustand (`prevClk` bei FFs) — beides muss erhalten bleiben,
  da `runUntilStable` die FF-Outputs aus `customState` neu berechnet
- Deep-Copy noetig, da Immer-produzierte Objekte frozen sind —
  `circuitRef.current` darf nicht mutiert werden

---

### AP-2: Viewport-Preservation bei Undo/Redo

**Dateien:** `src/store/actions.ts`, `src/store/circuitReducer.ts`,
`src/store/CircuitContext.tsx`

**Was:**
Neuer Action-Type `CIRCUIT_RESTORE`, der den Viewport des aktuellen States
behaelt statt ihn zu ueberschreiben:

```typescript
// actions.ts
| { type: 'CIRCUIT_RESTORE'; payload: { circuit: Circuit } }

// circuitReducer.ts
case 'CIRCUIT_RESTORE':
  return { ...action.payload.circuit, viewport: state.viewport };
```

In `undo()`/`redo()`: `CIRCUIT_RESTORE` statt `CIRCUIT_LOAD` verwenden.
`CIRCUIT_RESTORE` wird zu `HISTORY_SKIP_TYPES` hinzugefuegt.

**Abhaengigkeiten:** AP-1

**Risiken:**
- `CIRCUIT_LOAD` wird weiterhin fuer Datei-Laden, FSM-Synthese und
  Name-Aenderung benutzt — darf nicht angefasst werden
- `circuit.id` aendert sich bei Undo/Redo nicht (gleicher Circuit),
  daher feuert der `circuit.id`-useEffect korrekt nicht

---

### AP-3: Explizites Re-Settle nach Undo/Redo

**Dateien:** `src/store/CircuitContext.tsx`

**Was:**
In `undo()` und `redo()` nach dem Dispatch den Simulations-State invalidieren:

```typescript
simBufferRef.current = null;
schedulerRef.current = null;
needsSettleRef.current = true;
```

Das erzwingt im naechsten RAF-Frame einen kompletten Neuaufbau via
`initBuffer()` + `runUntilStable`. Durch AP-1 (Signale im Snapshot genullt)
startet die Simulation aus einem sauberen Zustand.

**Abhaengigkeiten:** AP-1 (ohne Strip wuerde initBuffer stale Signale lesen)

**Risiken:**
- 1-Frame-Flicker: Zwischen Dispatch und naechstem RAF koennte ein Render
  mit Null-Signalen gezeichnet werden (alle Wires kurz schwarz). Bei 60 fps
  = 16 ms — akzeptabel, wird in AP-5 adressiert
- `schedulerRef.current = null` ist sicher — der Scheduler wird lazy
  im naechsten RAF-Frame neu aufgebaut

---

### AP-4: Memory-Footprint — Structural Diffing *(optional, Prio 2)*

**Dateien:** Neues Modul `src/store/historyDiff.ts`, `src/store/CircuitContext.tsx`

**Was:**
Statt vollstaendiger Snapshots nur JSON-Patches (RFC 6902) speichern.
Immer bietet `produceWithPatches` nativ an.

**Abhaengigkeiten:** AP-1, AP-2, AP-3

**Empfehlung:** Nur umsetzen bei nachgewiesenem Memory-Problem.
Geschaetzt: 100 Snapshots x ~20 KB = ~2 MB — voellig unkritisch fuer
einen Browser.

---

### AP-5: Robustheit und UX-Polish

**Dateien:** `src/store/CircuitContext.tsx`, `src/components/toolbar/Toolbar.tsx`

**Was:**

1. **Doppel-Undo-Schutz:** Bei schnellem Strg+Z Strg+Z werden mehrere
   Undo-Calls gebatcht bevor React rendert. `circuitRef.current` muss in
   `undo()`/`redo()` sofort aktualisiert werden, damit der zweite Call den
   korrekten State auf den Redo-Stack legt:
   ```typescript
   circuitRef.current = previous;  // sofort, vor React-Render
   ```

2. **Settle-Guard im RAF:** Wenn `simBufferRef.current === null`, den Frame
   ueberspringen statt mit leerem Buffer zu arbeiten — verhindert das
   1-Frame-Flicker aus AP-3

3. **Edge-Case leerer Circuit:** `stripTransientData` auf leerem Circuit
   (keine Gates/Wires) = No-Op — per Test absichern

**Abhaengigkeiten:** AP-1, AP-2, AP-3

---

## Umsetzungsreihenfolge

```
AP-1  (stripTransientData)           <-- Basis
  |
  +---> AP-2  (Viewport-Preservation)
  |
  +---> AP-3  (Re-Settle)
          |
          +---> AP-5  (Robustheit)
                  |
                  +---> AP-4  (Diffing — optional)
```

**Phase 1 (Kern):** AP-1 -> AP-2 -> AP-3
**Phase 2 (Polish):** AP-5
**Phase 3 (Optimierung):** AP-4 nur bei Bedarf

## Architekturentscheidungen

| Entscheidung         | Gewaehlt                       | Begruendung                                              |
|----------------------|--------------------------------|----------------------------------------------------------|
| Snapshot vs. Patch   | Snapshot (AP-1)                | Einfacher, robuster, Memory unkritisch (~2 MB bei 100)   |
| Viewport-Handling    | Neuer Action `CIRCUIT_RESTORE` | Keine Seiteneffekte auf bestehende CIRCUIT_LOAD-Nutzer   |
| Re-Settle-Trigger    | SimBuffer + Scheduler nullen   | Garantiert sauberen Neustart, nutzt bestehende Lazy-Init |
| Strip-Zeitpunkt      | Bei Push, nicht bei Pop        | Spart CPU bei Undo/Redo (Strip nur einmal pro Push)      |
