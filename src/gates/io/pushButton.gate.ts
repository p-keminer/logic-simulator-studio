import { gateRegistry } from '../../core/registry/GateRegistry';
import { PushButtonShape } from '../shapes/PushButtonShape';

gateRegistry.register({
  typeId: 'PUSH_BTN',
  label: 'Taster',
  category: 'input',
  width: 64,
  height: 64,
  inputs: [],
  outputs: [
    { id: 'out', label: 'Q', relativeX: 0.95, relativeY: 0.5 },
  ],
  evaluate: (_inputs, customState) => ({
    out: ((customState?.value as 0 | 1) ?? 0),
  }),
  shapeComponent: PushButtonShape,
  description: 'Momentary Push Button: Doppelklick sendet 150 ms HIGH-Puls',
});
