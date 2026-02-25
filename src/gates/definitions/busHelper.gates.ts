import { gateRegistry } from '../../core/registry/GateRegistry';
import { BusSplitterShape } from '../shapes/BusSplitterShape';
import type { SignalValue } from '../../core/types';

// ─── 4-Bit Bus Splitter / Merger ─────────────────────────────────────────────
gateRegistry.register({
  typeId: 'SPLIT4',
  label: 'BUS-4',
  category: 'logic_mi',
  width: 30, height: 80,
  inputs: [
    { id: 'a0', label: '0', relativeX: 0, relativeY: 0.12 },
    { id: 'a1', label: '1', relativeX: 0, relativeY: 0.37 },
    { id: 'a2', label: '2', relativeX: 0, relativeY: 0.62 },
    { id: 'a3', label: '3', relativeX: 0, relativeY: 0.88 },
  ],
  outputs: [
    { id: 'y0', label: '0', relativeX: 1, relativeY: 0.12 },
    { id: 'y1', label: '1', relativeX: 1, relativeY: 0.37 },
    { id: 'y2', label: '2', relativeX: 1, relativeY: 0.62 },
    { id: 'y3', label: '3', relativeX: 1, relativeY: 0.88 },
  ],
  evaluate: ({ a0, a1, a2, a3 }) => ({
    y0: (a0 ?? 0) as SignalValue,
    y1: (a1 ?? 0) as SignalValue,
    y2: (a2 ?? 0) as SignalValue,
    y3: (a3 ?? 0) as SignalValue,
  }),
  shapeComponent: BusSplitterShape,
  description: '4-Bit Bus-Splitter/Merger: Pass-Through (links=Bus, rechts=Einzelleitungen)',
});

// ─── 8-Bit Bus Splitter / Merger ─────────────────────────────────────────────
gateRegistry.register({
  typeId: 'SPLIT8',
  label: 'BUS-8',
  category: 'logic_mi',
  width: 30, height: 160,
  inputs: [
    { id: 'a0', label: '0', relativeX: 0, relativeY: 0.06 },
    { id: 'a1', label: '1', relativeX: 0, relativeY: 0.19 },
    { id: 'a2', label: '2', relativeX: 0, relativeY: 0.31 },
    { id: 'a3', label: '3', relativeX: 0, relativeY: 0.44 },
    { id: 'a4', label: '4', relativeX: 0, relativeY: 0.56 },
    { id: 'a5', label: '5', relativeX: 0, relativeY: 0.69 },
    { id: 'a6', label: '6', relativeX: 0, relativeY: 0.81 },
    { id: 'a7', label: '7', relativeX: 0, relativeY: 0.94 },
  ],
  outputs: [
    { id: 'y0', label: '0', relativeX: 1, relativeY: 0.06 },
    { id: 'y1', label: '1', relativeX: 1, relativeY: 0.19 },
    { id: 'y2', label: '2', relativeX: 1, relativeY: 0.31 },
    { id: 'y3', label: '3', relativeX: 1, relativeY: 0.44 },
    { id: 'y4', label: '4', relativeX: 1, relativeY: 0.56 },
    { id: 'y5', label: '5', relativeX: 1, relativeY: 0.69 },
    { id: 'y6', label: '6', relativeX: 1, relativeY: 0.81 },
    { id: 'y7', label: '7', relativeX: 1, relativeY: 0.94 },
  ],
  evaluate: ({ a0, a1, a2, a3, a4, a5, a6, a7 }) => ({
    y0: (a0 ?? 0) as SignalValue,
    y1: (a1 ?? 0) as SignalValue,
    y2: (a2 ?? 0) as SignalValue,
    y3: (a3 ?? 0) as SignalValue,
    y4: (a4 ?? 0) as SignalValue,
    y5: (a5 ?? 0) as SignalValue,
    y6: (a6 ?? 0) as SignalValue,
    y7: (a7 ?? 0) as SignalValue,
  }),
  shapeComponent: BusSplitterShape,
  description: '8-Bit Bus-Splitter/Merger: Pass-Through',
});
