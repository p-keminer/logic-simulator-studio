/**
 * Gates with complementary outputs: Q (true) and Q̄ (inverted).
 */
import { gateRegistry } from '../../core/registry/GateRegistry';
import { AndCShape, OrCShape, XorCShape } from '../shapes/MultiGateShapes';

// Output port positions: Q at top-right, Q_n at bottom-right
const dualOutputs = [
  { id: 'q',   label: 'Q',  relativeX: 1, relativeY: 0.33 },
  { id: 'q_n', label: 'Q̄', relativeX: 1, relativeY: 0.67 },
];

gateRegistry.register({
  typeId: 'AND_C',
  label: 'AND±',
  category: 'logic_comp',
  width: 90, height: 60,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.33 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.67 },
  ],
  outputs: dualOutputs,
  evaluate: ({ a, b }) => {
    const q = (a & b) as 0 | 1;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  shapeComponent: AndCShape,
  description: 'AND mit Q und Q̄ Ausgang',
});

gateRegistry.register({
  typeId: 'OR_C',
  label: 'OR±',
  category: 'logic_comp',
  width: 90, height: 60,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.33 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.67 },
  ],
  outputs: dualOutputs,
  evaluate: ({ a, b }) => {
    const q = (a | b) as 0 | 1;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  shapeComponent: OrCShape,
  description: 'OR mit Q und Q̄ Ausgang',
});

gateRegistry.register({
  typeId: 'XOR_C',
  label: 'XOR±',
  category: 'logic_comp',
  width: 90, height: 60,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.33 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.67 },
  ],
  outputs: dualOutputs,
  evaluate: ({ a, b }) => {
    const q = (a ^ b) as 0 | 1;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  shapeComponent: XorCShape,
  description: 'XOR mit Q und Q̄ Ausgang',
});

gateRegistry.register({
  typeId: 'NAND_C',
  label: 'NAND±',
  category: 'logic_comp',
  width: 90, height: 60,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.33 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.67 },
  ],
  outputs: dualOutputs,
  evaluate: ({ a, b }) => {
    const q_n = (a & b) as 0 | 1;
    return { q: (q_n ^ 1) as 0 | 1, q_n };
  },
  shapeComponent: AndCShape,
  description: 'NAND mit Q und Q̄ Ausgang',
});

gateRegistry.register({
  typeId: 'NOR_C',
  label: 'NOR±',
  category: 'logic_comp',
  width: 90, height: 60,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.33 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.67 },
  ],
  outputs: dualOutputs,
  evaluate: ({ a, b }) => {
    const q_n = (a | b) as 0 | 1;
    return { q: (q_n ^ 1) as 0 | 1, q_n };
  },
  shapeComponent: OrCShape,
  description: 'NOR mit Q und Q̄ Ausgang',
});
