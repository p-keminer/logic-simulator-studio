/**
 * Multi-input logic gate definitions (3-input and 4-input).
 */
import { gateRegistry } from '../../core/registry/GateRegistry';
import {
  And3Shape, And4Shape, Nand3Shape, Nand4Shape,
  Or3Shape, Or4Shape, Nor3Shape, Nor4Shape,
  Xor3Shape,
} from '../shapes/MultiGateShapes';

// Helper: distribute N inputs evenly on left side
function makeInputs(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: String.fromCharCode(97 + i), // a, b, c, d
    label: String.fromCharCode(65 + i),
    relativeX: 0,
    relativeY: (i + 1) / (n + 1),
  }));
}

// ─── 3-input AND / NAND ─────────────────────────────────────────────────────

gateRegistry.register({
  typeId: 'AND3',
  label: 'AND3',
  category: 'logic_multi',
  width: 80, height: 70,
  inputs: makeInputs(3),
  outputs: [{ id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 }],
  evaluate: ({ a, b, c }) => ({ out: ((a & b & c) as 0 | 1) }),
  toVerilog: (g, w) => `and g_${g.id}(${w[g.id + ':out'] ?? 'w_' + g.id}, ${w[g.id + ':a'] ?? '0'}, ${w[g.id + ':b'] ?? '0'}, ${w[g.id + ':c'] ?? '0'});`,
  shapeComponent: And3Shape,
  description: '3-Eingang AND',
});

gateRegistry.register({
  typeId: 'AND4',
  label: 'AND4',
  category: 'logic_multi',
  width: 80, height: 80,
  inputs: makeInputs(4),
  outputs: [{ id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 }],
  evaluate: ({ a, b, c, d }) => ({ out: ((a & b & c & d) as 0 | 1) }),
  toVerilog: (g, w) => `and g_${g.id}(${w[g.id + ':out'] ?? 'w_' + g.id}, ${w[g.id + ':a'] ?? '0'}, ${w[g.id + ':b'] ?? '0'}, ${w[g.id + ':c'] ?? '0'}, ${w[g.id + ':d'] ?? '0'});`,
  shapeComponent: And4Shape,
  description: '4-Eingang AND',
});

gateRegistry.register({
  typeId: 'NAND3',
  label: 'NAND3',
  category: 'logic_multi',
  width: 80, height: 70,
  inputs: makeInputs(3),
  outputs: [{ id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 }],
  evaluate: ({ a, b, c }) => ({ out: (((a & b & c) === 1 ? 0 : 1) as 0 | 1) }),
  shapeComponent: Nand3Shape,
  description: '3-Eingang NAND',
});

gateRegistry.register({
  typeId: 'NAND4',
  label: 'NAND4',
  category: 'logic_multi',
  width: 80, height: 80,
  inputs: makeInputs(4),
  outputs: [{ id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 }],
  evaluate: ({ a, b, c, d }) => ({ out: (((a & b & c & d) === 1 ? 0 : 1) as 0 | 1) }),
  shapeComponent: Nand4Shape,
  description: '4-Eingang NAND',
});

// ─── 3-input OR / NOR ───────────────────────────────────────────────────────

gateRegistry.register({
  typeId: 'OR3',
  label: 'OR3',
  category: 'logic_multi',
  width: 80, height: 70,
  inputs: makeInputs(3),
  outputs: [{ id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 }],
  evaluate: ({ a, b, c }) => ({ out: ((a | b | c) as 0 | 1) }),
  shapeComponent: Or3Shape,
  description: '3-Eingang OR',
});

gateRegistry.register({
  typeId: 'OR4',
  label: 'OR4',
  category: 'logic_multi',
  width: 80, height: 80,
  inputs: makeInputs(4),
  outputs: [{ id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 }],
  evaluate: ({ a, b, c, d }) => ({ out: ((a | b | c | d) as 0 | 1) }),
  shapeComponent: Or4Shape,
  description: '4-Eingang OR',
});

gateRegistry.register({
  typeId: 'NOR3',
  label: 'NOR3',
  category: 'logic_multi',
  width: 80, height: 70,
  inputs: makeInputs(3),
  outputs: [{ id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 }],
  evaluate: ({ a, b, c }) => ({ out: (((a | b | c) === 0 ? 1 : 0) as 0 | 1) }),
  shapeComponent: Nor3Shape,
  description: '3-Eingang NOR',
});

gateRegistry.register({
  typeId: 'NOR4',
  label: 'NOR4',
  category: 'logic_multi',
  width: 80, height: 80,
  inputs: makeInputs(4),
  outputs: [{ id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 }],
  evaluate: ({ a, b, c, d }) => ({ out: (((a | b | c | d) === 0 ? 1 : 0) as 0 | 1) }),
  shapeComponent: Nor4Shape,
  description: '4-Eingang NOR',
});

// ─── 3-input XOR ────────────────────────────────────────────────────────────

gateRegistry.register({
  typeId: 'XOR3',
  label: 'XOR3',
  category: 'logic_multi',
  width: 80, height: 70,
  inputs: makeInputs(3),
  outputs: [{ id: 'out', label: 'Y', relativeX: 1, relativeY: 0.5 }],
  evaluate: ({ a, b, c }) => ({ out: ((a ^ b ^ c) as 0 | 1) }),
  shapeComponent: Xor3Shape,
  description: '3-Eingang XOR (Parität)',
});
