import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';
import type { SignalValue } from '../../core/types';

gateRegistry.register({
  typeId: 'ROM256',
  label: 'ROM',
  category: 'memory',
  width: 100, height: 240,
  inputs: [
    { id: 'a0', label: 'A0', relativeX: 0, relativeY: 0.05 },
    { id: 'a1', label: 'A1', relativeX: 0, relativeY: 0.12 },
    { id: 'a2', label: 'A2', relativeX: 0, relativeY: 0.19 },
    { id: 'a3', label: 'A3', relativeX: 0, relativeY: 0.26 },
    { id: 'a4', label: 'A4', relativeX: 0, relativeY: 0.33 },
    { id: 'a5', label: 'A5', relativeX: 0, relativeY: 0.40 },
    { id: 'a6', label: 'A6', relativeX: 0, relativeY: 0.47 },
    { id: 'a7', label: 'A7', relativeX: 0, relativeY: 0.54 },
    { id: 'cs', label: '/CS', relativeX: 0, relativeY: 0.68 },
    { id: 'oe', label: '/OE', relativeX: 0, relativeY: 0.78 },
  ],
  outputs: [
    { id: 'd0', label: 'D0', relativeX: 1, relativeY: 0.07 },
    { id: 'd1', label: 'D1', relativeX: 1, relativeY: 0.19 },
    { id: 'd2', label: 'D2', relativeX: 1, relativeY: 0.31 },
    { id: 'd3', label: 'D3', relativeX: 1, relativeY: 0.43 },
    { id: 'd4', label: 'D4', relativeX: 1, relativeY: 0.55 },
    { id: 'd5', label: 'D5', relativeX: 1, relativeY: 0.67 },
    { id: 'd6', label: 'D6', relativeX: 1, relativeY: 0.79 },
    { id: 'd7', label: 'D7', relativeX: 1, relativeY: 0.91 },
  ],
  evaluate: ({ a0, a1, a2, a3, a4, a5, a6, a7, cs, oe }, state) => {
    const zero = { d0:0, d1:0, d2:0, d3:0, d4:0, d5:0, d6:0, d7:0 } as Record<string, SignalValue>;
    if ((cs ?? 1) === 1 || (oe ?? 1) === 1) return zero;
    const addr =
      ((a0 ?? 0) as number)       | (((a1 ?? 0) as number) << 1) |
      (((a2 ?? 0) as number) << 2) | (((a3 ?? 0) as number) << 3) |
      (((a4 ?? 0) as number) << 4) | (((a5 ?? 0) as number) << 5) |
      (((a6 ?? 0) as number) << 6) | (((a7 ?? 0) as number) << 7);
    const byte = ((state?.data as number[] | undefined) ?? [])[addr] ?? 0;
    return {
      d0: ( byte        & 1) as SignalValue,
      d1: ((byte >> 1)  & 1) as SignalValue,
      d2: ((byte >> 2)  & 1) as SignalValue,
      d3: ((byte >> 3)  & 1) as SignalValue,
      d4: ((byte >> 4)  & 1) as SignalValue,
      d5: ((byte >> 5)  & 1) as SignalValue,
      d6: ((byte >> 6)  & 1) as SignalValue,
      d7: ((byte >> 7)  & 1) as SignalValue,
    };
  },
  stateUpdate: (_inputs, _outputs, state) => ({
    data: (state?.data as number[] | undefined) ?? new Array(256).fill(0),
  }),
  shapeComponent: FlipFlopShape,
  description: 'ROM 256×8: /CS=0 & /OE=0 → Daten ausgeben. Inhalt per Rechtsklick laden.',
});
