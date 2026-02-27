import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';

// Tri-State Buffer: /OE=0 → Y=A;  /OE=1 → Y=0 (Hi-Z represented as 0)
gateRegistry.register({
  typeId: 'TRIBUF',
  label: 'TRI',
  category: 'logic_special',
  width: 80, height: 70,
  inputs: [
    { id: 'a',  label: 'A',   relativeX: 0, relativeY: 0.35 },
    { id: 'oe', label: '/OE', relativeX: 0, relativeY: 0.7  },
  ],
  outputs: [
    { id: 'y', label: 'Y', relativeX: 1, relativeY: 0.5 },
  ],
  evaluate: ({ a, oe }) => ({
    y: (oe === 0 ? (a as 0 | 1) : 0) as 0 | 1,
  }),
  shapeComponent: FlipFlopShape,
  description: 'Tri-State Buffer: /OE=0 → Y=A; /OE=1 → Hi-Z (als 0 dargestellt)',
});
