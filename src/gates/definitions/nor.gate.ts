import { gateRegistry } from '../../core/registry/GateRegistry';
import { NorShape } from '../shapes/NorShape';

gateRegistry.register({
  typeId: 'NOR',
  label: 'NOR',
  category: 'logic_basic',
  width: 80,
  height: 60,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.33 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.67 },
  ],
  outputs: [
    { id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 },
  ],
  evaluate: ({ a, b }) => ({ out: ((a | b) === 0 ? 1 : 0) }),
  shapeComponent: NorShape,
  description: 'Negiertes OR – HIGH nur wenn alle Eingänge LOW',
});
