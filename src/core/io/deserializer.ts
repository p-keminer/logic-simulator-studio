import type { Circuit } from '../types';
import { gateRegistry } from '../registry/GateRegistry';
import { registerEmbeddedCustomIcLibrary } from '../customIc/embeddedLibrary';

export class DeserializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeserializationError';
  }
}

export function deserializeCircuit(json: string): Circuit {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new DeserializationError('Ungültiges JSON-Format');
  }

  const circuit = raw as Circuit;

  if (!circuit.id || !circuit.gates || !circuit.wires) {
    throw new DeserializationError('Fehlende Pflichtfelder im Circuit-Objekt');
  }

  try {
    registerEmbeddedCustomIcLibrary(circuit);
  } catch (error) {
    throw new DeserializationError(`Eingebettete Custom-IC-Bibliothek konnte nicht geladen werden: ${String(error)}`);
  }

  // Validate all gate types are registered
  for (const gate of Object.values(circuit.gates)) {
    if (!gateRegistry.has(gate.typeId)) {
      throw new DeserializationError(
        `Unbekannter Gattertyp "${gate.typeId}". Diese Schaltung benötigt möglicherweise ein Plugin oder eine neuere Version.`
      );
    }
  }

  // Ensure signal fields exist (migration: older saves may lack them)
  const defaultSignal = { value: 0 as const, version: 0, lastChangedAt: 0 };
  for (const gate of Object.values(circuit.gates)) {
    gate.isSelected = false;
    if (!gate.outputSignals) gate.outputSignals = {};
    const def = gateRegistry.get(gate.typeId);
    for (const output of def.outputs) {
      if (!gate.outputSignals[output.id]) {
        gate.outputSignals[output.id] = { ...defaultSignal };
      }
    }
  }

  for (const wire of Object.values(circuit.wires)) {
    wire.isSelected = false;
    if (!wire.signal) wire.signal = { ...defaultSignal };
  }

  if (!circuit.viewport) {
    circuit.viewport = { panX: 0, panY: 0, zoom: 1 };
  }

  return circuit;
}

export function loadCircuitFromFile(): Promise<Circuit> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.lgsc.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('Keine Datei ausgewählt'));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const circuit = deserializeCircuit(reader.result as string);
          resolve(circuit);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
