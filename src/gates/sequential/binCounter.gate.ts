import type { GateDefinition, SignalValue } from '../../core/types';
import { BinCounter7SegShape } from '../shapes/BinCounter7SegShape';
import { BinCounter7Seg2Shape } from '../shapes/BinCounter7Seg2Shape';
import { gateRegistry } from '../../core/registry/GateRegistry';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_'); }

// ── 0-15 counter with hex 7-segment display ───────────────────────────────────
const binCounterDef: GateDefinition = {
  typeId: 'BIN_CTR7S',
  label: 'BIN-CTR',
  category: 'output',
  width: 100,
  height: 220,
  propagationDelay: 5,
  inputs: [
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.25 },
    { id: 'rst', label: 'RST', relativeX: 0, relativeY: 0.50 },
    { id: 'en',  label: 'EN',  relativeX: 0, relativeY: 0.75 },
  ],
  outputs: [
    { id: 'q0',  label: 'Q0',  relativeX: 1, relativeY: 0.30 },
    { id: 'q1',  label: 'Q1',  relativeX: 1, relativeY: 0.43 },
    { id: 'q2',  label: 'Q2',  relativeX: 1, relativeY: 0.57 },
    { id: 'q3',  label: 'Q3',  relativeX: 1, relativeY: 0.70 },
    { id: 'rco', label: 'RCO', relativeX: 1, relativeY: 0.85 },
  ],
  isSynchronous: true,
  stateKeys: ['count'],
  evaluate(_inputs, customState) {
    const count = Math.max(0, Math.min(15, (customState?.count as number) ?? 0));
    return {
      q0:  ((count >> 0) & 1) as SignalValue,
      q1:  ((count >> 1) & 1) as SignalValue,
      q2:  ((count >> 2) & 1) as SignalValue,
      q3:  ((count >> 3) & 1) as SignalValue,
      rco: (count === 15 ? 1 : 0) as SignalValue,
    };
  },
  stateUpdate(inputs, _outputs, customState) {
    const count   = (customState?.count   as number) ?? 0;
    const prevClk = (customState?.prevClk as number) ?? 0;
    const clk = inputs['clk'] ?? 0;
    const rst = inputs['rst'] ?? 0;
    const en  = inputs['en']  ?? 1;
    if (rst === 1) return { count: 0, prevClk: clk };
    if (prevClk === 0 && clk === 1 && en === 1) return { count: (count + 1) % 16, prevClk: 1 };
    return { count, prevClk: clk };
  },
  verilogExtraRegs: (g) => [{ name: `cnt_${sanitize(g.id)}`, width: 4 }],
  vhdlExtraSignals: (g) => [{ name: `cnt_${sanitize(g.id)}`, width: 4 }],
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const cnt = `cnt_${sid}`;
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const rst = w[`${g.id}:rst`] ?? "1'b0";
    const en  = w[`${g.id}:en`]  ?? "1'b1";
    const q0  = w[`${g.id}:q0`]  ?? `w_${sid}_q0`;
    const q1  = w[`${g.id}:q1`]  ?? `w_${sid}_q1`;
    const q2  = w[`${g.id}:q2`]  ?? `w_${sid}_q2`;
    const q3  = w[`${g.id}:q3`]  ?? `w_${sid}_q3`;
    const rco = w[`${g.id}:rco`] ?? `w_${sid}_rco`;
    return [
      `// BIN_CTR7S ${sid}`,
      `always @(posedge ${clk} or posedge ${rst}) begin`,
      `  if (${rst})     ${cnt} <= 4'd0;`,
      `  else if (${en}) ${cnt} <= ${cnt} + 1'b1;`,
      `end // BIN_CTR7S ${sid}`,
      `assign ${q0}  = ${cnt}[0];`,
      `assign ${q1}  = ${cnt}[1];`,
      `assign ${q2}  = ${cnt}[2];`,
      `assign ${q3}  = ${cnt}[3];`,
      `assign ${rco} = (${cnt} == 4'd15) ? 1'b1 : 1'b0;`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const cnt = `cnt_${sid}`;
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const rst = w[`${g.id}:rst`] ?? "'0'";
    const en  = w[`${g.id}:en`]  ?? "'1'";
    const q0  = w[`${g.id}:q0`]  ?? `w_${sid}_q0`;
    const q1  = w[`${g.id}:q1`]  ?? `w_${sid}_q1`;
    const q2  = w[`${g.id}:q2`]  ?? `w_${sid}_q2`;
    const q3  = w[`${g.id}:q3`]  ?? `w_${sid}_q3`;
    const rco = w[`${g.id}:rco`] ?? `w_${sid}_rco`;
    return [
      `-- BIN_CTR7S ${sid}`,
      `process(${clk}, ${rst})`,
      `begin`,
      `  if ${rst} = '1' then`,
      `    ${cnt} <= (others => '0');`,
      `  elsif rising_edge(${clk}) then`,
      `    if ${en} = '1' then`,
      `      ${cnt} <= std_logic_vector(unsigned(${cnt}) + 1);`,
      `    end if;`,
      `  end if;`,
      `end process; -- BIN_CTR7S ${sid}`,
      `${q0}  <= ${cnt}(0);`,
      `${q1}  <= ${cnt}(1);`,
      `${q2}  <= ${cnt}(2);`,
      `${q3}  <= ${cnt}(3);`,
      `${rco} <= '1' when ${cnt} = "1111" else '0';`,
    ].join('\n');
  },
  verilogWireOutputs: ['q0', 'q1', 'q2', 'q3', 'rco'],
  clockInputId: 'clk',
  shapeComponent: BinCounter7SegShape,
  description: 'Binärzähler 0-15 mit integrierter Hex-7-Segment-Anzeige. CLK↑+EN=1 → Zählen; RST=1 → Zurücksetzen.',
};

gateRegistry.register(binCounterDef);

// ── 0-99 counter with dual decimal 7-segment display ─────────────────────────
const binCounter99Def: GateDefinition = {
  typeId: 'BIN_CTR_99',
  label: 'BIN-CTR 99',
  category: 'output',
  width: 120,
  height: 240,
  propagationDelay: 5,
  inputs: [
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.22 },
    { id: 'rst', label: 'RST', relativeX: 0, relativeY: 0.44 },
    { id: 'en',  label: 'EN',  relativeX: 0, relativeY: 0.66 },
  ],
  outputs: [
    { id: 'q0',  label: 'Q0',  relativeX: 1, relativeY: 0.27 },
    { id: 'q1',  label: 'Q1',  relativeX: 1, relativeY: 0.38 },
    { id: 'q2',  label: 'Q2',  relativeX: 1, relativeY: 0.49 },
    { id: 'q3',  label: 'Q3',  relativeX: 1, relativeY: 0.60 },
    { id: 'q4',  label: 'Q4',  relativeX: 1, relativeY: 0.71 },
    { id: 'q5',  label: 'Q5',  relativeX: 1, relativeY: 0.82 },
    { id: 'rco', label: 'RCO', relativeX: 1, relativeY: 0.93 },
  ],
  isSynchronous: true,
  stateKeys: ['count'],
  evaluate(_inputs, customState) {
    const count = Math.max(0, Math.min(99, (customState?.count as number) ?? 0));
    return {
      q0:  ((count >> 0) & 1) as SignalValue,
      q1:  ((count >> 1) & 1) as SignalValue,
      q2:  ((count >> 2) & 1) as SignalValue,
      q3:  ((count >> 3) & 1) as SignalValue,
      q4:  ((count >> 4) & 1) as SignalValue,
      q5:  ((count >> 5) & 1) as SignalValue,
      rco: (count === 99 ? 1 : 0) as SignalValue,
    };
  },
  stateUpdate(inputs, _outputs, customState) {
    const count   = (customState?.count   as number) ?? 0;
    const prevClk = (customState?.prevClk as number) ?? 0;
    const clk = inputs['clk'] ?? 0;
    const rst = inputs['rst'] ?? 0;
    const en  = inputs['en']  ?? 1;
    if (rst === 1) return { count: 0, prevClk: clk };
    if (prevClk === 0 && clk === 1 && en === 1) return { count: (count + 1) % 100, prevClk: 1 };
    return { count, prevClk: clk };
  },
  verilogExtraRegs: (g) => [{ name: `cnt_${sanitize(g.id)}`, width: 7 }],
  vhdlExtraSignals: (g) => [{ name: `cnt_${sanitize(g.id)}`, width: 7 }],
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const cnt = `cnt_${sid}`;
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const rst = w[`${g.id}:rst`] ?? "1'b0";
    const en  = w[`${g.id}:en`]  ?? "1'b1";
    const q0  = w[`${g.id}:q0`]  ?? `w_${sid}_q0`;
    const q1  = w[`${g.id}:q1`]  ?? `w_${sid}_q1`;
    const q2  = w[`${g.id}:q2`]  ?? `w_${sid}_q2`;
    const q3  = w[`${g.id}:q3`]  ?? `w_${sid}_q3`;
    const q4  = w[`${g.id}:q4`]  ?? `w_${sid}_q4`;
    const q5  = w[`${g.id}:q5`]  ?? `w_${sid}_q5`;
    const rco = w[`${g.id}:rco`] ?? `w_${sid}_rco`;
    return [
      `// BIN_CTR_99 ${sid}`,
      `always @(posedge ${clk} or posedge ${rst}) begin`,
      `  if (${rst}) ${cnt} <= 7'd0;`,
      `  else if (${en}) begin`,
      `    if (${cnt} == 7'd99) ${cnt} <= 7'd0;`,
      `    else                 ${cnt} <= ${cnt} + 1'b1;`,
      `  end`,
      `end // BIN_CTR_99 ${sid}`,
      `assign ${q0}  = ${cnt}[0];`,
      `assign ${q1}  = ${cnt}[1];`,
      `assign ${q2}  = ${cnt}[2];`,
      `assign ${q3}  = ${cnt}[3];`,
      `assign ${q4}  = ${cnt}[4];`,
      `assign ${q5}  = ${cnt}[5];`,
      `assign ${rco} = (${cnt} == 7'd99) ? 1'b1 : 1'b0;`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const cnt = `cnt_${sid}`;
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const rst = w[`${g.id}:rst`] ?? "'0'";
    const en  = w[`${g.id}:en`]  ?? "'1'";
    const q0  = w[`${g.id}:q0`]  ?? `w_${sid}_q0`;
    const q1  = w[`${g.id}:q1`]  ?? `w_${sid}_q1`;
    const q2  = w[`${g.id}:q2`]  ?? `w_${sid}_q2`;
    const q3  = w[`${g.id}:q3`]  ?? `w_${sid}_q3`;
    const q4  = w[`${g.id}:q4`]  ?? `w_${sid}_q4`;
    const q5  = w[`${g.id}:q5`]  ?? `w_${sid}_q5`;
    const rco = w[`${g.id}:rco`] ?? `w_${sid}_rco`;
    return [
      `-- BIN_CTR_99 ${sid}`,
      `process(${clk}, ${rst})`,
      `begin`,
      `  if ${rst} = '1' then`,
      `    ${cnt} <= (others => '0');`,
      `  elsif rising_edge(${clk}) then`,
      `    if ${en} = '1' then`,
      `      if unsigned(${cnt}) = 99 then`,
      `        ${cnt} <= (others => '0');`,
      `      else`,
      `        ${cnt} <= std_logic_vector(unsigned(${cnt}) + 1);`,
      `      end if;`,
      `    end if;`,
      `  end if;`,
      `end process; -- BIN_CTR_99 ${sid}`,
      `${q0}  <= ${cnt}(0);`,
      `${q1}  <= ${cnt}(1);`,
      `${q2}  <= ${cnt}(2);`,
      `${q3}  <= ${cnt}(3);`,
      `${q4}  <= ${cnt}(4);`,
      `${q5}  <= ${cnt}(5);`,
      `${rco} <= '1' when unsigned(${cnt}) = 99 else '0';`,
    ].join('\n');
  },
  verilogWireOutputs: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'rco'],
  clockInputId: 'clk',
  shapeComponent: BinCounter7Seg2Shape,
  description: 'Dezimalzähler 00-99 mit integrierter 2-stelliger 7-Segment-Anzeige. CLK↑+EN=1 → Zählen; RST=1 → Zurücksetzen.',
};

gateRegistry.register(binCounter99Def);
