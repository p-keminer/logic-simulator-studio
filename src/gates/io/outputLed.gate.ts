import { gateRegistry } from '../../core/registry/GateRegistry';
import { OutputLedShape } from '../shapes/OutputLedShape';

gateRegistry.register({
  typeId: 'OUTPUT_LED',
  label: 'LED',
  category: 'io',
  width: 60,
  height: 60,
  inputs: [
    { id: 'in', label: 'D', relativeX: 0, relativeY: 0.5 },
  ],
  outputs: [],
  evaluate: ({ in: d }) => ({ _display: d }),
  shapeComponent: OutputLedShape,
  description: 'LED-Ausgangsanzeige',
});
