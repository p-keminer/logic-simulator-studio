import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';
import type { SignalValue } from '../../core/types';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_'); }

gateRegistry.register({
  typeId: 'RAM256',
  label: 'RAM',
  category: 'memory',
  width: 110, height: 320,
  defaultInputValues: { we: 1, cs: 1, oe: 1 },
  inputs: [
    // Address
    { id: 'a0', label: 'A0', relativeX: 0, relativeY: 0.04 },
    { id: 'a1', label: 'A1', relativeX: 0, relativeY: 0.08 },
    { id: 'a2', label: 'A2', relativeX: 0, relativeY: 0.12 },
    { id: 'a3', label: 'A3', relativeX: 0, relativeY: 0.16 },
    { id: 'a4', label: 'A4', relativeX: 0, relativeY: 0.20 },
    { id: 'a5', label: 'A5', relativeX: 0, relativeY: 0.24 },
    { id: 'a6', label: 'A6', relativeX: 0, relativeY: 0.28 },
    { id: 'a7', label: 'A7', relativeX: 0, relativeY: 0.32 },
    // Data in
    { id: 'di0', label: 'DI0', relativeX: 0, relativeY: 0.40 },
    { id: 'di1', label: 'DI1', relativeX: 0, relativeY: 0.45 },
    { id: 'di2', label: 'DI2', relativeX: 0, relativeY: 0.50 },
    { id: 'di3', label: 'DI3', relativeX: 0, relativeY: 0.55 },
    { id: 'di4', label: 'DI4', relativeX: 0, relativeY: 0.60 },
    { id: 'di5', label: 'DI5', relativeX: 0, relativeY: 0.65 },
    { id: 'di6', label: 'DI6', relativeX: 0, relativeY: 0.70 },
    { id: 'di7', label: 'DI7', relativeX: 0, relativeY: 0.75 },
    // Control
    { id: 'we', label: '/WE', relativeX: 0, relativeY: 0.84 },
    { id: 'cs', label: '/CS', relativeX: 0, relativeY: 0.90 },
    { id: 'oe', label: '/OE', relativeX: 0, relativeY: 0.96 },
  ],
  outputs: [
    { id: 'do0', label: 'DO0', relativeX: 1, relativeY: 0.07 },
    { id: 'do1', label: 'DO1', relativeX: 1, relativeY: 0.18 },
    { id: 'do2', label: 'DO2', relativeX: 1, relativeY: 0.29 },
    { id: 'do3', label: 'DO3', relativeX: 1, relativeY: 0.40 },
    { id: 'do4', label: 'DO4', relativeX: 1, relativeY: 0.51 },
    { id: 'do5', label: 'DO5', relativeX: 1, relativeY: 0.62 },
    { id: 'do6', label: 'DO6', relativeX: 1, relativeY: 0.73 },
    { id: 'do7', label: 'DO7', relativeX: 1, relativeY: 0.84 },
  ],
  evaluate: ({ a0,a1,a2,a3,a4,a5,a6,a7, cs, oe }, state) => {
    const zero = { do0:0,do1:0,do2:0,do3:0,do4:0,do5:0,do6:0,do7:0 } as Record<string, SignalValue>;
    if ((cs ?? 1) === 1 || (oe ?? 1) === 1) return zero;
    const addr =
      ((a0 ?? 0) as number)       | (((a1 ?? 0) as number) << 1) |
      (((a2 ?? 0) as number) << 2) | (((a3 ?? 0) as number) << 3) |
      (((a4 ?? 0) as number) << 4) | (((a5 ?? 0) as number) << 5) |
      (((a6 ?? 0) as number) << 6) | (((a7 ?? 0) as number) << 7);
    const byte = ((state?.data as number[] | undefined) ?? [])[addr] ?? 0;
    return {
      do0: ( byte        & 1) as SignalValue,
      do1: ((byte >> 1)  & 1) as SignalValue,
      do2: ((byte >> 2)  & 1) as SignalValue,
      do3: ((byte >> 3)  & 1) as SignalValue,
      do4: ((byte >> 4)  & 1) as SignalValue,
      do5: ((byte >> 5)  & 1) as SignalValue,
      do6: ((byte >> 6)  & 1) as SignalValue,
      do7: ((byte >> 7)  & 1) as SignalValue,
    };
  },
  stateUpdate: ({ a0,a1,a2,a3,a4,a5,a6,a7, di0,di1,di2,di3,di4,di5,di6,di7, we, cs }, _outputs, state) => {
    const curData: number[] = (state?.data as number[] | undefined) ?? new Array(256).fill(0);
    // Write when /WE=0 and /CS=0
    if ((we ?? 1) === 0 && (cs ?? 1) === 0) {
      const newData = [...curData];
      const addr =
        ((a0 ?? 0) as number)       | (((a1 ?? 0) as number) << 1) |
        (((a2 ?? 0) as number) << 2) | (((a3 ?? 0) as number) << 3) |
        (((a4 ?? 0) as number) << 4) | (((a5 ?? 0) as number) << 5) |
        (((a6 ?? 0) as number) << 6) | (((a7 ?? 0) as number) << 7);
      const byte =
        ((di0 ?? 0) as number)        | (((di1 ?? 0) as number) << 1) |
        (((di2 ?? 0) as number) << 2) | (((di3 ?? 0) as number) << 3) |
        (((di4 ?? 0) as number) << 4) | (((di5 ?? 0) as number) << 5) |
        (((di6 ?? 0) as number) << 6) | (((di7 ?? 0) as number) << 7);
      newData[addr] = byte & 0xFF;
      return { data: newData };
    }
    return { data: curData };
  },
  verilogAlwaysComb: true,
  toVerilog: (g, w) => {
    const sid     = sanitize(g.id);
    const addr    = ['a0','a1','a2','a3','a4','a5','a6','a7'].map(id => w[`${g.id}:${id}`] ?? "1'b0");
    const di      = ['di0','di1','di2','di3','di4','di5','di6','di7'].map(id => w[`${g.id}:${id}`] ?? "1'b0");
    const we_n    = w[`${g.id}:we`] ?? "1'b1";
    const cs_n    = w[`${g.id}:cs`] ?? "1'b1";
    const oe_n    = w[`${g.id}:oe`] ?? "1'b1";
    const dos     = ['do0','do1','do2','do3','do4','do5','do6','do7'].map(id => w[`${g.id}:${id}`] ?? `w_${sid}_${id}`);
    const addrCat = `{${[...addr].reverse().join(', ')}}`; // {a7,...,a0}
    const diCat   = `{${[...di].reverse().join(', ')}}`; // {di7,...,di0}
    const doCat   = `{${[...dos].reverse().join(', ')}}`; // {do7,...,do0}
    return [
      `// RAM256 ${sid}`,
      `always @(*) begin // async write (transparent latch)`,
      `  if (${cs_n} == 1'b0 && ${we_n} == 1'b0)`,
      `    ram_${sid}[${addrCat}] = ${diCat};`,
      `end`,
      `always @(*) begin // read`,
      `  if (${cs_n} == 1'b0 && ${oe_n} == 1'b0)`,
      `    ${doCat} = ram_${sid}[${addrCat}];`,
      `  else`,
      `    ${doCat} = 8'hzz;`,
      `end // RAM256 ${sid}`,
    ].join('\n');
  },
  verilogExtraRegs: (g) => {
    const sid = sanitize(g.id);
    return [{ name: `ram_${sid}`, width: 8, depth: 256 }]; // no initData → zeroed
  },
  toVHDL: (g, w) => {
    const sid     = sanitize(g.id);
    const addr    = ['a0','a1','a2','a3','a4','a5','a6','a7'].map(id => w[`${g.id}:${id}`] ?? "'0'");
    const di      = ['di0','di1','di2','di3','di4','di5','di6','di7'].map(id => w[`${g.id}:${id}`] ?? "'0'");
    const we_n    = w[`${g.id}:we`] ?? "'1'";
    const cs_n    = w[`${g.id}:cs`] ?? "'1'";
    const oe_n    = w[`${g.id}:oe`] ?? "'1'";
    const dos     = ['do0','do1','do2','do3','do4','do5','do6','do7'].map(id => w[`${g.id}:${id}`] ?? `w_${sid}_${id}`);
    const addrCat = [...addr].reverse().join(' & '); // a7 & ... & a0 (MSB first)
    const diCat   = [...di].reverse().join(' & ');   // di7 & ... & di0 (MSB first)
    const ramName = `ram_${sid}`;
    const writePorts = ['a0','a1','a2','a3','a4','a5','a6','a7',
                        'di0','di1','di2','di3','di4','di5','di6','di7','we','cs'];
    const readPorts  = ['a0','a1','a2','a3','a4','a5','a6','a7','oe','cs'];
    // Filter VHDL character literals ('0'/'1') — invalid in sensitivity lists.
    const isSignal = (s: string | undefined): s is string => !!s && !s.startsWith("'");
    const writeSense = writePorts.map(id => w[`${g.id}:${id}`]).filter(isSignal).join(', ') || `${cs_n}, ${we_n}`;
    const readConn   = readPorts.map(id => w[`${g.id}:${id}`]).filter(isSignal).join(', ');
    const readSense  = readConn ? `${readConn}, ${ramName}` : ramName;
    return [
      `-- RAM256 ${sid}`,
      `process(${writeSense}) -- async write (transparent latch)`,
      `begin`,
      `  if ${cs_n} = '0' and ${we_n} = '0' then`,
      `    ${ramName}(to_integer(unsigned(${addrCat}))) <= ${diCat};`,
      `  end if;`,
      `end process;`,
      `process(${readSense}) -- read`,
      `begin`,
      `  ${dos.map(d => `${d} <= 'Z'`).join('; ')};`,
      `  if ${cs_n} = '0' and ${oe_n} = '0' then`,
      ...dos.map((d, i) => `    ${d} <= ${ramName}(to_integer(unsigned(${addrCat})))(${i});`),
      `  end if;`,
      `end process; -- RAM256 ${sid}`,
    ].join('\n');
  },
  vhdlExtraSignals: (g) => {
    const sid = sanitize(g.id);
    return [{ name: `ram_${sid}`, width: 8, depth: 256 }]; // no initData → signal
  },
  shapeComponent: FlipFlopShape,
  description: 'RAM 256×8: /WE=0 & /CS=0 → Schreiben; /OE=0 & /CS=0 → Lesen',
});
