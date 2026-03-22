import type { Circuit } from '../types';
import { collectEmbeddedCustomIcLibrary } from '../customIc/embeddedLibrary';

const SCHEMA_VERSION = '1.0.0';

function createSerializableCircuit(
  circuit: Circuit,
  options?: { includeEmbeddedCustomIcLibrary?: boolean },
): Circuit {
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

  if (options?.includeEmbeddedCustomIcLibrary) {
    payload.customIcLibrary = collectEmbeddedCustomIcLibrary(circuit).map((entry) => ({
      ...entry,
      circuit: createSerializableCircuit(entry.circuit, { includeEmbeddedCustomIcLibrary: false }),
    }));
  } else {
    delete payload.customIcLibrary;
  }

  return payload;
}

export function serializeCircuit(circuit: Circuit): string {
  return JSON.stringify(
    createSerializableCircuit(circuit, { includeEmbeddedCustomIcLibrary: true }),
    null,
    2,
  );
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
