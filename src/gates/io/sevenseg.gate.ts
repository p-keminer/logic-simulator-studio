import { gateRegistry } from '../../core/registry/GateRegistry';
import { SevenSegShape } from '../shapes/SevenSegShape';
import { SevenSegDualShape } from '../shapes/SevenSegDualShape';

const segInputs = (ids: string[]) =>
  ids.map((id, i) => ({
    id,
    label: id.toUpperCase(),
    relativeX: 0,
    relativeY: (i + 0.5) / ids.length,
  }));

gateRegistry.register({
  typeId: 'SEG7',
  label: '7-Segment',
  category: 'output',
  width: 88,
  height: 100,
  inputs: segInputs(['a', 'b', 'c', 'd', 'e', 'f', 'g']),
  outputs: [],
  evaluate: () => ({}),
  shapeComponent: SevenSegShape,
  description: '7-Segment-Anzeige: direkte Segmenteingaben a–g',
});

gateRegistry.register({
  typeId: 'SEG7_BCD',
  label: '7-Seg BCD',
  category: 'output',
  width: 88,
  height: 100,
  inputs: segInputs(['d3', 'd2', 'd1', 'd0']),
  outputs: [],
  evaluate: () => ({}),
  shapeComponent: SevenSegShape,
  description: '7-Segment mit BCD-Dekoder (Ziffer 0–9)',
});

// Dual 7-segment display: tens digit (t3–t0) + ones digit (d3–d0) → shows 00–99
gateRegistry.register({
  typeId: 'SEG7_BCD_2',
  label: '7-Seg Dual',
  category: 'output',
  width: 148,
  height: 100,
  inputs: [
    { id: 't3', label: 'T3', relativeX: 0, relativeY: 0.10 },
    { id: 't2', label: 'T2', relativeX: 0, relativeY: 0.24 },
    { id: 't1', label: 'T1', relativeX: 0, relativeY: 0.38 },
    { id: 't0', label: 'T0', relativeX: 0, relativeY: 0.52 },
    { id: 'd3', label: 'D3', relativeX: 0, relativeY: 0.62 },
    { id: 'd2', label: 'D2', relativeX: 0, relativeY: 0.72 },
    { id: 'd1', label: 'D1', relativeX: 0, relativeY: 0.82 },
    { id: 'd0', label: 'D0', relativeX: 0, relativeY: 0.92 },
  ],
  outputs: [],
  evaluate: () => ({}),
  shapeComponent: SevenSegDualShape,
  description: '2-stellige 7-Segment-Anzeige mit BCD-Dekoder (00–99). Zehnerstelle: T3–T0, Einerstelle: D3–D0',
});
