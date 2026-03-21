import type { CircuitSource } from '../../src/modules/circuit-context/types';

export const createWhitelistedCircuitFixture = (): CircuitSource => ({
  id: ' active-demo ',
  name: '  Demo Circuit With Extra UI State  ',
  selectedElementIds: [' gate-a ', 'node-in', 'gate-a'],
  nodes: [
    {
      id: ' node-in ',
      kind: ' input-pin ',
      label: '  Input A  ',
      debugOnlyColor: '#f00',
    },
    {
      id: ' node-out ',
      kind: ' output-pin ',
      label: '  Output Z  ',
      viewportOnly: true,
    },
  ],
  gates: [
    {
      id: ' gate-a ',
      type: ' and ',
      label: '  Main And Gate  ',
      inputs: [
        { gateId: ' gate-a ', port: ' in-1 ' },
        { gateId: ' gate-a ', port: ' in-2 ' },
      ],
      outputs: [{ gateId: ' gate-a ', port: ' out ' }],
      transientSelectionState: 'hovered',
    },
  ],
  connections: [
    {
      from: { gateId: ' gate-a ', port: ' out ' },
      to: { gateId: ' gate-a ', port: ' in-1 ' },
      bendPoints: [{ x: 10, y: 20 }],
    },
  ],
  notes: '  Explain only the active circuit, not project-wide state.  ',
  uiPanelState: {
    zoom: 1.25,
    highlightedNetId: 'net-5',
  },
} as CircuitSource);

export const createManipulatedCircuitFixture = (): CircuitSource => ({
  id: ' active-sandbox ',
  name: ' '.repeat(4) + 'Manipulated Circuit',
  selectedElementIds: [' gate-1 ', 'gate-1', 'missing-node', '  '],
  nodes: [
    { id: ' gate-1 ', kind: ' gate-node ', label: ' '.repeat(3) + 'Alpha' },
    { id: 'gate-1', kind: ' gate-node ', label: 'Duplicate Gate Node' },
    { id: ' ', kind: ' invalid ', label: 'Should disappear' },
  ],
  gates: [
    {
      id: ' gate-1 ',
      type: ' nand ',
      label: ` ${'N'.repeat(140)} `,
      inputs: [
        { gateId: ' gate-1 ', port: ' in-a ' },
        { gateId: ' gate-1 ', port: ' in-a ' },
        { gateId: ' ', port: 'broken' },
      ],
      outputs: [{ gateId: ' gate-1 ', port: ' out ' }],
    },
    {
      id: 'gate-1',
      type: ' nand ',
      label: 'Duplicate gate',
      inputs: [],
      outputs: [],
    },
    {
      id: 'bad-gate',
      type: ' ',
      label: 'Invalid gate type',
      inputs: [],
      outputs: [],
    },
  ],
  connections: [
    {
      from: { gateId: ' gate-1 ', port: ' out ' },
      to: { gateId: ' gate-1 ', port: ' in-a ' },
    },
    {
      from: { gateId: ' gate-1 ', port: ' out ' },
      to: { gateId: ' gate-1 ', port: ' in-a ' },
    },
    {
      from: { gateId: ' ', port: 'oops' },
      to: { gateId: ' gate-1 ', port: ' in-b ' },
    },
  ],
  notes: ` ${'This note is intentionally oversized. '.repeat(80)} `,
});

export const createOversizedCircuitFixture = (
  nodeCount = 24,
  gateCount = 24,
  connectionCount = 48,
): CircuitSource => {
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    id: `node-${index}`,
    kind: index % 2 === 0 ? 'input-pin' : 'output-pin',
    label: `Node ${index} ${'label '.repeat(6)}`.trim(),
  }));
  const gates = Array.from({ length: gateCount }, (_, index) => ({
    id: `gate-${index}`,
    type: index % 2 === 0 ? 'and' : 'xor',
    label: `Gate ${index} ${'detail '.repeat(8)}`.trim(),
    inputs: [
      { gateId: `gate-${index}`, port: 'in-a' },
      { gateId: `gate-${index}`, port: 'in-b' },
    ],
    outputs: [{ gateId: `gate-${index}`, port: 'out' }],
  }));
  const connections = Array.from({ length: connectionCount }, (_, index) => ({
    from: { gateId: `gate-${index % gateCount}`, port: 'out' },
    to: { gateId: `gate-${(index + 1) % gateCount}`, port: 'in-a' },
  }));

  return {
    id: 'oversized-circuit',
    name: `Oversized ${'Circuit '.repeat(10)}`.trim(),
    selectedElementIds: [
      ...nodes.map((node) => node.id),
      ...gates.map((gate) => gate.id),
    ],
    nodes,
    gates,
    connections,
    notes: 'Large active circuit fixture. '.repeat(180).trim(),
  };
};
