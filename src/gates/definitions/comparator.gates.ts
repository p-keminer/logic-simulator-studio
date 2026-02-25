import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';

// ─── 1-Bit Comparator ────────────────────────────────────────────────────────
gateRegistry.register({
  typeId: 'CMP1',
  label: 'CMP',
  category: 'logic_comp',
  width: 80, height: 80,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.3 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.7 },
  ],
  outputs: [
    { id: 'eq', label: '=',  relativeX: 1, relativeY: 0.25 },
    { id: 'gt', label: '>',  relativeX: 1, relativeY: 0.5  },
    { id: 'lt', label: '<',  relativeX: 1, relativeY: 0.75 },
  ],
  evaluate: ({ a, b }) => ({
    eq: (a === b ? 1 : 0) as 0 | 1,
    gt: (a  >  b ? 1 : 0) as 0 | 1,
    lt: (a  <  b ? 1 : 0) as 0 | 1,
  }),
  shapeComponent: FlipFlopShape,
  description: '1-Bit Komparator: EQ (A=B), GT (A>B), LT (A<B)',
});

// ─── 4-Bit Cascadable Comparator ─────────────────────────────────────────────
gateRegistry.register({
  typeId: 'CMP4',
  label: 'CMP4',
  category: 'logic_comp',
  width: 90, height: 200,
  inputs: [
    { id: 'a0',   label: 'A0',   relativeX: 0, relativeY: 0.07 },
    { id: 'a1',   label: 'A1',   relativeX: 0, relativeY: 0.17 },
    { id: 'a2',   label: 'A2',   relativeX: 0, relativeY: 0.27 },
    { id: 'a3',   label: 'A3',   relativeX: 0, relativeY: 0.37 },
    { id: 'b0',   label: 'B0',   relativeX: 0, relativeY: 0.50 },
    { id: 'b1',   label: 'B1',   relativeX: 0, relativeY: 0.60 },
    { id: 'b2',   label: 'B2',   relativeX: 0, relativeY: 0.70 },
    { id: 'b3',   label: 'B3',   relativeX: 0, relativeY: 0.80 },
    { id: 'ltin', label: 'LTin', relativeX: 0, relativeY: 0.87 },
    { id: 'eqin', label: 'EQin', relativeX: 0, relativeY: 0.93 },
    { id: 'gtin', label: 'GTin', relativeX: 0, relativeY: 0.99 },
  ],
  outputs: [
    { id: 'lt', label: '<',  relativeX: 1, relativeY: 0.33 },
    { id: 'eq', label: '=',  relativeX: 1, relativeY: 0.5  },
    { id: 'gt', label: '>',  relativeX: 1, relativeY: 0.67 },
  ],
  evaluate: ({ a0, a1, a2, a3, b0, b1, b2, b3, ltin, eqin, gtin }) => {
    const a = ((a0 ?? 0) as number) | (((a1 ?? 0) as number) << 1) | (((a2 ?? 0) as number) << 2) | (((a3 ?? 0) as number) << 3);
    const b = ((b0 ?? 0) as number) | (((b1 ?? 0) as number) << 1) | (((b2 ?? 0) as number) << 2) | (((b3 ?? 0) as number) << 3);
    if (a < b) return { lt: 1, eq: 0, gt: 0 };
    if (a > b) return { lt: 0, eq: 0, gt: 1 };
    // Equal: cascade through
    return {
      lt: (ltin ?? 0) as 0 | 1,
      eq: (eqin ?? 0) as 0 | 1,
      gt: (gtin ?? 0) as 0 | 1,
    };
  },
  shapeComponent: FlipFlopShape,
  description: '4-Bit Komparator (kaskadierfähig): Vergleicht A[3:0] mit B[3:0]',
});
