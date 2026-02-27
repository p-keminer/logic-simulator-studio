import { gateRegistry } from '../../core/registry/GateRegistry';
import { DotMatrixShape } from '../shapes/DotMatrixShape';

gateRegistry.register({
  typeId: 'DOTMATRIX8',
  label: '8×8 Dot Matrix',
  category: 'output',
  width: 180,
  height: 180,
  inputs: [
  { id: 'row0', label: 'R0', relativeX: 0, relativeY: 0.15 },
  { id: 'row1', label: 'R1', relativeX: 0, relativeY: 0.25 },
  { id: 'row2', label: 'R2', relativeX: 0, relativeY: 0.35 },
  { id: 'row3', label: 'R3', relativeX: 0, relativeY: 0.45 },
  { id: 'row4', label: 'R4', relativeX: 0, relativeY: 0.55 },
  { id: 'row5', label: 'R5', relativeX: 0, relativeY: 0.65 },
  { id: 'row6', label: 'R6', relativeX: 0, relativeY: 0.75 },
  { id: 'row7', label: 'R7', relativeX: 0, relativeY: 0.85 },
  { id: 'col0', label: 'C0', relativeX: 1, relativeY: 0.15 },
  { id: 'col1', label: 'C1', relativeX: 1, relativeY: 0.25 },
  { id: 'col2', label: 'C2', relativeX: 1, relativeY: 0.35 },
  { id: 'col3', label: 'C3', relativeX: 1, relativeY: 0.45 },
  { id: 'col4', label: 'C4', relativeX: 1, relativeY: 0.55 },
  { id: 'col5', label: 'C5', relativeX: 1, relativeY: 0.65 },
  { id: 'col6', label: 'C6', relativeX: 1, relativeY: 0.75 },
  { id: 'col7', label: 'C7', relativeX: 1, relativeY: 0.85 },
  ],
  outputs: [],
  evaluate: () => ({}),
  shapeComponent: DotMatrixShape,
  description: '8×8 Dot-Matrix-Anzeige: R0-7=Zeilen (links), C0-7=Spalten (rechts). Pixel leuchtet wenn ROW=1 UND COL=1.',
});
