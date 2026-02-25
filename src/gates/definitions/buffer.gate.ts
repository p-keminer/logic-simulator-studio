import { gateRegistry } from '../../core/registry/GateRegistry';
import { BufferShape } from '../shapes/BufferShape';

gateRegistry.register({
  typeId: 'BUFFER',
  label: 'Buffer',
  category: 'logic',
  width: 70,
  height: 50,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.5 },
  ],
  outputs: [
    { id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 },
  ],
  evaluate: ({ a }) => ({ out: a }),
  toVerilog: (gate) => `buf g_${gate.id}(${gate.id}_out, ${gate.id}_a);`,
  shapeComponent: BufferShape,
  description: 'Leitet Signal weiter (kein Einfluss auf Logikpegel)',
});
