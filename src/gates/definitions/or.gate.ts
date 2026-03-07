import { gateRegistry } from '../../core/registry/GateRegistry';
import { OrShape } from '../shapes/OrShape';
import { logicOR } from '../../core/simulation/signal';

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
  evaluate: ({ a, b }) => ({ out: logicOR([a, b]) }),
  shapeComponent: OrShape,
  description: 'Ausgang HIGH wenn mindestens ein Eingang HIGH',
});
