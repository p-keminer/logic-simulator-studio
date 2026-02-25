import { gateRegistry } from '../../core/registry/GateRegistry';
import { SchmittShape } from '../shapes/SchmittShape';

gateRegistry.register({
  typeId: 'SCHMITT',
  label: 'Schmitt',
  category: 'logic',
  width: 70, height: 50,
  inputs:  [{ id: 'a', label: 'A', relativeX: 0, relativeY: 0.5 }],
  outputs: [{ id: 'y', label: 'Y', relativeX: 1, relativeY: 0.5 }],
  evaluate: ({ a }) => ({ y: (a as 0 | 1) ?? 0 }),
  shapeComponent: SchmittShape,
  description: 'Schmitt-Trigger: Puffer mit Hysterese-Symbol (binary: Y = A)',
});
