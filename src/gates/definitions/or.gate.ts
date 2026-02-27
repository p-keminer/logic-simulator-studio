import { gateRegistry } from '../../core/registry/GateRegistry';
import { OrShape } from '../shapes/OrShape';

gateRegistry.register({
  typeId: 'OR',
  label: 'OR',
  category: 'logic_basic',
  width: 80,
  height: 60,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.33 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.67 },
  ],
  outputs: [
    { id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 },
  ],
  evaluate: ({ a, b }) => ({ out: ((a | b) as 0 | 1) }),
  toVerilog: (gate) => `or g_${gate.id}(${gate.id}_out, ${gate.id}_a, ${gate.id}_b);`,
  shapeComponent: OrShape,
  description: 'Ausgang HIGH wenn mindestens ein Eingang HIGH',
});
