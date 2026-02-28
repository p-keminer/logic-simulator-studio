import { gateRegistry } from '../../core/registry/GateRegistry';
import { BufferShape } from '../shapes/BufferShape';

gateRegistry.register({
  typeId: 'BUFFER',
  label: 'Buffer',
  category: 'logic_basic',
  width: 70,
  height: 50,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.5 },
  ],
  outputs: [
    { id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 },
  ],
  evaluate: ({ a }) => ({ out: a }),
  shapeComponent: BufferShape,
  description: 'Leitet Signal weiter (kein Einfluss auf Logikpegel)',
});
