import type { Circuit } from '../types';

const SCHEMA_VERSION = '1.0.0';

export function serializeCircuit(circuit: Circuit): string {
  const payload: Circuit = {
    ...circuit,
    version: SCHEMA_VERSION,
    metadata: {
      ...circuit.metadata,
      updatedAt: new Date().toISOString(),
    },
    gates: Object.fromEntries(
      Object.entries(circuit.gates).map(([id, gate]) => [
        id,
        {
          ...gate,
          isSelected: false,
          outputSignals: Object.fromEntries(
            Object.entries(gate.outputSignals).map(([portId, sig]) => [
              portId,
              { value: sig.value, version: 0, lastChangedAt: 0 },
            ])
          ),
        },
      ])
    ),
    wires: Object.fromEntries(
      Object.entries(circuit.wires).map(([id, wire]) => [
        id,
        { ...wire, isSelected: false, signal: { value: 0 as const, version: 0, lastChangedAt: 0 } },
      ])
    ),
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadCircuit(circuit: Circuit, filename?: string): void {
  const json = serializeCircuit(circuit);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `${circuit.name.replace(/\s+/g, '_')}.lgsc.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
