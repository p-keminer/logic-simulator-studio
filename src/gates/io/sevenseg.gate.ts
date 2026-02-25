import { gateRegistry } from '../../core/registry/GateRegistry';
import { SevenSegShape } from '../shapes/SevenSegShape';

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
  category: 'io',
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
  category: 'io',
  width: 88,
  height: 100,
  inputs: segInputs(['d3', 'd2', 'd1', 'd0']),
  outputs: [],
  evaluate: () => ({}),
  shapeComponent: SevenSegShape,
  description: '7-Segment mit BCD-Dekoder (Ziffer 0–9)',
});