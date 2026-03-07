import { gateRegistry } from '../../core/registry/GateRegistry';
import { AndShape } from '../shapes/AndShape';
import { logicAND } from '../../core/simulation/signal';

gateRegistry.register({
  typeId: 'AND',
  label: 'AND',
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
  evaluate: ({ a, b }) => ({ out: logicAND([a, b]) }),
  shapeComponent: AndShape,
  description: 'Ausgang HIGH wenn alle Eingänge HIGH',
});
