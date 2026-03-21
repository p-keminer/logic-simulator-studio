import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';
import type { SignalValue } from '../../core/types';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'x'; }

gateRegistry.register({
  typeId: 'ROM256',
  label: 'ROM',
  category: 'memory',
  width: 100, height: 240,
  defaultInputValues: { cs: 1, oe: 1 },
  inputs: [
    { id: 'a0', label: 'A0', relativeX: 0, relativeY: 0.05 },
    { id: 'a1', label: 'A1', relativeX: 0, relativeY: 0.12 },
    { id: 'a2', label: 'A2', relativeX: 0, relativeY: 0.19 },
    { id: 'a3', label: 'A3', relativeX: 0, relativeY: 0.26 },
    { id: 'a4', label: 'A4', relativeX: 0, relativeY: 0.33 },
    { id: 'a5', label: 'A5', relativeX: 0, relativeY: 0.40 },
    { id: 'a6', label: 'A6', relativeX: 0, relativeY: 0.47 },
    { id: 'a7', label: 'A7', relativeX: 0, relativeY: 0.54 },
    { id: 'cs', label: '/CS', relativeX: 0, relativeY: 0.68 },
    { id: 'oe', label: '/OE', relativeX: 0, relativeY: 0.78 },
  ],
  outputs: [
    { id: 'd0', label: 'D0', relativeX: 1, relativeY: 0.07 },
    { id: 'd1', label: 'D1', relativeX: 1, relativeY: 0.19 },
    { id: 'd2', label: 'D2', relativeX: 1, relativeY: 0.31 },
    { id: 'd3', label: 'D3', relativeX: 1, relativeY: 0.43 },
    { id: 'd4', label: 'D4', relativeX: 1, relativeY: 0.55 },
    { id: 'd5', label: 'D5', relativeX: 1, relativeY: 0.67 },
    { id: 'd6', label: 'D6', relativeX: 1, relativeY: 0.79 },
    { id: 'd7', label: 'D7', relativeX: 1, relativeY: 0.91 },
  ],
  evaluate: ({ a0, a1, a2, a3, a4, a5, a6, a7, cs, oe }, state) => {
    const hiz = { d0:2, d1:2, d2:2, d3:2, d4:2, d5:2, d6:2, d7:2 } as Record<string, SignalValue>;
    if ((cs ?? 1) === 1 || (oe ?? 1) === 1) return hiz;
    const addr =
      ((a0 ?? 0) as number)       | (((a1 ?? 0) as number) << 1) |
      (((a2 ?? 0) as number) << 2) | (((a3 ?? 0) as number) << 3) |
      (((a4 ?? 0) as number) << 4) | (((a5 ?? 0) as number) << 5) |
      (((a6 ?? 0) as number) << 6) | (((a7 ?? 0) as number) << 7);
    const byte = ((state?.data as number[] | undefined) ?? [])[addr] ?? 0;
    return {
      d0: ( byte        & 1) as SignalValue,
      d1: ((byte >> 1)  & 1) as SignalValue,
      d2: ((byte >> 2)  & 1) as SignalValue,
      d3: ((byte >> 3)  & 1) as SignalValue,
      d4: ((byte >> 4)  & 1) as SignalValue,
      d5: ((byte >> 5)  & 1) as SignalValue,
      d6: ((byte >> 6)  & 1) as SignalValue,
      d7: ((byte >> 7)  & 1) as SignalValue,
    };
  },
  stateUpdate: (_inputs, _outputs, state) => ({
    data: (state?.data as number[] | undefined) ?? new Array(256).fill(0),
  }),
  verilogAlwaysComb: true,
  toVerilog: (g, w) => {
    const sid      = sanitize(g.id);
    const addr     = ['a0','a1','a2','a3','a4','a5','a6','a7'].map(id => w[`${g.id}:${id}`] ?? "1'b0");
    const cs_n     = w[`${g.id}:cs`] ?? "1'b1";
    const oe_n     = w[`${g.id}:oe`] ?? "1'b1";
    const ds       = ['d0','d1','d2','d3','d4','d5','d6','d7'].map(id => w[`${g.id}:${id}`] ?? `w_${sid}_${id}`);
    const addrCat  = `{${[...addr].reverse().join(', ')}}`; // {a7,...,a0}
    const dataCat  = `{${[...ds].reverse().join(', ')}}`; // {d7,...,d0}
    return [
      `// ROM256 ${sid}`,
      `always @(*) begin`,
      `  if (${cs_n} == 1'b0 && ${oe_n} == 1'b0)`,
      `    ${dataCat} = rom_${sid}[${addrCat}];`,
      `  else`,
      `    ${dataCat} = 8'hzz;`,
      `end // ROM256 ${sid}`,
    ].join('\n');
  },
  verilogExtraRegs: (g) => {
    const sid  = sanitize(g.id);
    const data = (g.customState?.data as number[] | undefined) ?? new Array(256).fill(0);
    return [{ name: `rom_${sid}`, width: 8, depth: 256, initData: data }];
  },
  toVHDL: (g, w) => {
    const sid  = sanitize(g.id);
    const addr = ['a0','a1','a2','a3','a4','a5','a6','a7'].map(id => w[`${g.id}:${id}`] ?? "'0'");
    const cs_n = w[`${g.id}:cs`] ?? "'1'";
    const oe_n = w[`${g.id}:oe`] ?? "'1'";
    const ds   = ['d0','d1','d2','d3','d4','d5','d6','d7'].map(id => w[`${g.id}:${id}`] ?? `w_${sid}_${id}`);
    const addrCat  = [...addr].reverse().join(' & '); // a7 & ... & a0 (MSB first)
    // Filter VHDL character literals ('0'/'1') — invalid in sensitivity lists.
    const connSigs = ['a0','a1','a2','a3','a4','a5','a6','a7','cs','oe']
      .map(id => w[`${g.id}:${id}`])
      .filter((s): s is string => !!s && !s.startsWith("'"));
    const sense = connSigs.length > 0 ? connSigs.join(', ') : `${cs_n}, ${oe_n}`;
    return [
      `-- ROM256 ${sid}`,
      `process(${sense})`,
      `  variable addr_v : integer range 0 to 255;`,
      `begin`,
      `  ${ds.map(d => `${d} <= 'Z'`).join('; ')};`,
      `  if ${cs_n} = '0' and ${oe_n} = '0' then`,
      `    addr_v := to_integer(unsigned(${addrCat}));`,
      ...ds.map((d, i) => `    ${d} <= rom_${sid}(addr_v)(${i});`),
      `  end if;`,
      `end process; -- ROM256 ${sid}`,
    ].join('\n');
  },
  vhdlExtraSignals: (g) => {
    const sid  = sanitize(g.id);
    const data = (g.customState?.data as number[] | undefined) ?? new Array(256).fill(0);
    return [{ name: `rom_${sid}`, width: 8, depth: 256, initData: data }];
  },
  shapeComponent: FlipFlopShape,
  description: 'ROM 256×8: /CS=0 & /OE=0 → Daten ausgeben. Inhalt per Rechtsklick laden.',
});
