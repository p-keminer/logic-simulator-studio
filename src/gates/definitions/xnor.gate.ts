import { gateRegistry } from '../../core/registry/GateRegistry';
import { XnorShape } from '../shapes/XnorShape';
import { logicXNOR } from '../../core/simulation/signal';

gateRegistry.register({
  typeId: 'XNOR',
  label: 'XNOR',
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
  evaluate: ({ a, b }) => ({ out: logicXNOR(a, b) }),
  shapeComponent: XnorShape,
  description: 'HIGH wenn Eingänge gleich',
});
