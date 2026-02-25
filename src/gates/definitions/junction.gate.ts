import type { GateDefinition, SignalValue } from '../../core/types';
import { JunctionShape } from '../shapes/JunctionShape';
import { gateRegistry } from '../../core/registry/GateRegistry';

const junctionDef: GateDefinition = {
  typeId: 'JUNCTION',
  label: '•',
  category: 'internal',
  width: 16,
  height: 16,
  propagationDelay: 0,
  inputs: [
    { id: 'in', label: '', relativeX: 0, relativeY: 0.5 },
  ],
  outputs: [
    { id: 'y0', label: '', relativeX: 1,   relativeY: 0.5 },
    { id: 'y1', label: '', relativeX: 0.5, relativeY: 0   },
    { id: 'y2', label: '', relativeX: 0.5, relativeY: 1   },
  ],
  evaluate(inputs: Record<string, SignalValue>) {
    const v = (inputs['in'] ?? 0) as SignalValue;
    return { y0: v, y1: v, y2: v };
  },
  shapeComponent: JunctionShape,
};

gateRegistry.register(junctionDef);
