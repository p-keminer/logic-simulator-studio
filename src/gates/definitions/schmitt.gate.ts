import { gateRegistry } from '../../core/registry/GateRegistry';
import { SchmittShape } from '../shapes/SchmittShape';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_'); }

gateRegistry.register({
  typeId: 'SCHMITT',
  label: 'Schmitt',
  category: 'logic_special',
  width: 70, height: 50,
  inputs:  [{ id: 'a', label: 'A', relativeX: 0, relativeY: 0.5 }],
  outputs: [{ id: 'y', label: 'Y', relativeX: 1, relativeY: 0.5 }],
  evaluate: ({ a }) => ({ y: (a as 0 | 1) ?? 0 }),
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    // Phase 0 guarantees a is pre-populated (nc_a if unconnected).
    const a = w[`${g.id}:a`];
    const y = w[`${g.id}:y`];
    if (!y) return `// SCHMITT ${sid}: output Y unconnected — skipped`;
    return `assign ${y} = ${a}; // SCHMITT ${sid}`;
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    // Phase 0 guarantees a is pre-populated (nc_a if unconnected).
    const a = w[`${g.id}:a`];
    const y = w[`${g.id}:y`];
    if (!y) return `-- SCHMITT ${sid}: output Y unconnected — skipped`;
    return `${y} <= ${a}; -- SCHMITT ${sid}`;
  },
  shapeComponent: SchmittShape,
  description: 'Schmitt-Trigger: Puffer mit Hysterese-Symbol (binary: Y = A)',
  verilogSkipUnconnectedOutputs: true,
  vhdlSkipUnconnectedOutputs: true,
});
