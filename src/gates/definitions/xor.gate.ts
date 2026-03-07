import { gateRegistry } from '../../core/registry/GateRegistry';
import { XorShape } from '../shapes/XorShape';
import { logicXOR } from '../../core/simulation/signal';

gateRegistry.register({
  typeId: 'XOR',
  label: 'XOR',
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
  evaluate: ({ a, b }) => ({ out: logicXOR(a, b) }),
  shapeComponent: XorShape,
  description: 'HIGH wenn Eingänge verschieden',
});
