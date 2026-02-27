import { gateRegistry } from '../../core/registry/GateRegistry';
import { InputSwitchShape } from '../shapes/InputSwitchShape';

gateRegistry.register({
  typeId: 'INPUT_SWITCH',
  label: 'Schalter',
  category: 'input',
  width: 80,
  height: 44,
  inputs: [],
  outputs: [
    { id: 'out', label: 'Q', relativeX: 0.95, relativeY: 0.5 },
  ],
  evaluate: (_inputs, customState) => ({
    out: ((customState?.value as 0 | 1) ?? 0),
  }),
  shapeComponent: InputSwitchShape,
  description: 'Manueller HIGH/LOW Eingang (Klick zum Umschalten)',
});
