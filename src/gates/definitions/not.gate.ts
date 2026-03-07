import { gateRegistry } from '../../core/registry/GateRegistry';
import { NotShape } from '../shapes/NotShape';
import { logicNOT } from '../../core/simulation/signal';

gateRegistry.register({
  typeId: 'NOT',
  label: 'NOT',
  category: 'logic_basic',
  width: 70,
  height: 50,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.5 },
  ],
  outputs: [
    { id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 },
  ],
  evaluate: ({ a }) => ({ out: logicNOT(a) }),
  shapeComponent: NotShape,
  description: 'Invertiert den Eingang',
});
