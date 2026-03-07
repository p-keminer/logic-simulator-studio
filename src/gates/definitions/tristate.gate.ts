import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_'); }

// Tri-State Buffer: /OE=0 → Y=A;  /OE=1 → Y=Z (high-impedance)
gateRegistry.register({
  typeId: 'TRIBUF',
  label: 'TRI',
  category: 'logic_special',
  width: 80, height: 70,
  inputs: [
    { id: 'a',  label: 'A',   relativeX: 0, relativeY: 0.35 },
    { id: 'oe', label: '/OE', relativeX: 0, relativeY: 0.7  },
  ],
  outputs: [
    { id: 'y', label: 'Y', relativeX: 1, relativeY: 0.5 },
  ],
  evaluate: ({ a, oe }) => ({
    y: oe === 0 ? (a as 0 | 1) : 2,
  }),
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const a  = w[`${g.id}:a`]  ?? "1'b0";
    const oe = w[`${g.id}:oe`] ?? "1'b0";
    const y  = w[`${g.id}:y`]  ?? `w_${sid}_y`;
    return [
      `// TRIBUF ${sid}`,
      `assign ${y} = (~${oe}) ? ${a} : 1'bz;`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const a  = w[`${g.id}:a`]  ?? "'0'";
    const oe = w[`${g.id}:oe`] ?? "'0'";
    const y  = w[`${g.id}:y`]  ?? `w_${sid}_y`;
    return [
      `-- TRIBUF ${sid}`,
      `${y} <= ${a} when ${oe} = '0' else 'Z';`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: 'Tri-State Buffer: /OE=0 → Y=A; /OE=1 → Hi-Z',
});
