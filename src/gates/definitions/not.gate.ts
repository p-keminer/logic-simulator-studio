import { gateRegistry } from '../../core/registry/GateRegistry';
import { NotShape } from '../shapes/NotShape';

gateRegistry.register({
  typeId: 'NOT',
  label: 'NOT',
  category: 'logic',
  width: 70,
  height: 50,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.5 },
  ],
  outputs: [
    { id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 },
  ],
  evaluate: ({ a }) => ({ out: (a === 1 ? 0 : 1) }),
  toVerilog: (gate) => `not g_${gate.id}(${gate.id}_out, ${gate.id}_a);`,
  shapeComponent: NotShape,
  description: 'Invertiert den Eingang',
});
