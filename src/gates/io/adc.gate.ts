import type { GateDefinition, SignalValue } from '../../core/types';
import { gateRegistry } from '../../core/registry/GateRegistry';
import { ADCShape } from '../shapes/ADCShape';

const adcDef: GateDefinition = {
  typeId: 'ADC8',
  label: 'ADC 8-bit',
  category: 'input',
  width: 140,
  height: 120,
  inputs: [],
  outputs: [
  { id: 'b0', label: 'B0', relativeX: 1, relativeY: 0.15 },
  { id: 'b1', label: 'B1', relativeX: 1, relativeY: 0.25 },
  { id: 'b2', label: 'B2', relativeX: 1, relativeY: 0.35 },
  { id: 'b3', label: 'B3', relativeX: 1, relativeY: 0.45 },
  { id: 'b4', label: 'B4', relativeX: 1, relativeY: 0.55 },
  { id: 'b5', label: 'B5', relativeX: 1, relativeY: 0.65 },
  { id: 'b6', label: 'B6', relativeX: 1, relativeY: 0.75 },
  { id: 'b7', label: 'B7', relativeX: 1, relativeY: 0.85 },
  ],
  evaluate(_inputs, customState) {
    const v = Math.max(0, Math.min(255, (customState?.value as number) ?? 128));
    return {
      b0: ((v >> 0) & 1) as SignalValue,
      b1: ((v >> 1) & 1) as SignalValue,
      b2: ((v >> 2) & 1) as SignalValue,
      b3: ((v >> 3) & 1) as SignalValue,
      b4: ((v >> 4) & 1) as SignalValue,
      b5: ((v >> 5) & 1) as SignalValue,
      b6: ((v >> 6) & 1) as SignalValue,
      b7: ((v >> 7) & 1) as SignalValue,
    };
  },
  shapeComponent: ADCShape,
  description: 'ADC-Mockup: 8-Bit-Ausgabe (b0=LSB, b7=MSB). Wert per Slider einstellbar.',
};

gateRegistry.register(adcDef);
