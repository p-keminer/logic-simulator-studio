import { gateRegistry } from '../../core/registry/GateRegistry';
import { ConstShape } from '../shapes/ConstShape';

gateRegistry.register({
  typeId: 'CONST_HIGH',
  label: 'VCC (1)',
  category: 'input',
  width: 50,
  height: 40,
  inputs: [],
  outputs: [{ id: 'out', relativeX: 1, relativeY: 0.5 }],
  evaluate: () => ({ out: 1 }),
  shapeComponent: ConstShape,
  description: 'Konstant HIGH (logisch 1)',
  propagationDelay: 0,
});

gateRegistry.register({
  typeId: 'CONST_LOW',
  label: 'GND (0)',
  category: 'input',
  width: 50,
  height: 40,
  inputs: [],
  outputs: [{ id: 'out', relativeX: 1, relativeY: 0.5 }],
  evaluate: () => ({ out: 0 }),
  shapeComponent: ConstShape,
  description: 'Konstant LOW (logisch 0)',
  propagationDelay: 0,
});