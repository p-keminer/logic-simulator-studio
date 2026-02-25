import { gateRegistry } from '../../core/registry/GateRegistry';
import { ClockShape } from '../shapes/ClockShape';

gateRegistry.register({
  typeId: 'CLOCK',
  label: 'Taktgenerator',
  category: 'io',
  width: 80,
  height: 50,
  inputs: [],
  outputs: [{ id: 'clk', label: 'CLK', relativeX: 1, relativeY: 0.5 }],
  evaluate: (_inputs, customState) => ({
    clk: (customState?.value as 0 | 1) ?? 0,
  }),
  shapeComponent: ClockShape,
  description: 'Taktgenerator — Doppelklick zum Einstellen der Frequenz (0.1–100 Hz)',
});