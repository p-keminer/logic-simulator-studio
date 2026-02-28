/**
 * Sequential logic: SR-Latch, D-FF, JK-FF, T-FF
 * State is stored in customState and updated on clock edges.
 */
import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';

/** Ersetzt alle in HDL-Bezeichnern ungültigen Zeichen durch Unterstriche. */
function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_'); }

const qqnOutputs = [
  { id: 'q',   label: 'Q',  relativeX: 1, relativeY: 0.35 },
  { id: 'q_n', label: 'Q̄', relativeX: 1, relativeY: 0.65 },
];

// ─── SR-Latch (asynchronous) ─────────────────────────────────────────────────

gateRegistry.register({
  typeId: 'SR_LATCH',
  label: 'SR',
  category: 'flipflop',
  width: 80, height: 70,
  inputs: [
    { id: 's', label: 'S', relativeX: 0, relativeY: 0.3 },
    { id: 'r', label: 'R', relativeX: 0, relativeY: 0.7 },
  ],
  outputs: qqnOutputs,
  evaluate: ({ s, r }, state) => {
    const q = (state?.q as 0 | 1) ?? 0;
    if (s === 1 && r === 0) return { q: 1, q_n: 0 };
    if (s === 0 && r === 1) return { q: 0, q_n: 1 };
    if (s === 1 && r === 1) return { q: 0, q_n: 0 }; // invalid / undefined
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  stateUpdate: ({ s, r }, outputs) => {
    if (s === 1 && r === 0) return { q: 1 };
    if (s === 0 && r === 1) return { q: 0 };
    return { q: outputs.q };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const s  = w[`${g.id}:s`]   ?? "1'b0";
    const r  = w[`${g.id}:r`]   ?? "1'b0";
    const q  = w[`${g.id}:q`]   ?? `w_${sid}_q`;
    const qn = w[`${g.id}:q_n`] ?? `w_${sid}_q_n`;
    return [
      `// SR-Latch ${sid} (cross-coupled NOR)`,
      `nor g_${sid}_q (${q},  ${r}, ${qn});`,
      `nor g_${sid}_qn(${qn}, ${s}, ${q});`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const s  = w[`${g.id}:s`]   ?? "'0'";
    const r  = w[`${g.id}:r`]   ?? "'0'";
    const q  = w[`${g.id}:q`]   ?? `w_${sid}_q`;
    const qn = w[`${g.id}:q_n`] ?? `w_${sid}_q_n`;
    return [
      `-- SR-Latch ${sid} (cross-coupled NOR)`,
      `${q}  <= ${qn} nor ${r};`,
      `${qn} <= ${q}  nor ${s};`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: 'SR-Latch (asynchron): S=Setzen, R=Rücksetzen',
  isSynchronous: false,
});

// ─── D Flip-Flop (rising edge) ───────────────────────────────────────────────

gateRegistry.register({
  typeId: 'D_FF',
  label: 'D-FF',
  category: 'flipflop',
  width: 80, height: 80,
  inputs: [
    { id: 'd',   label: 'D',   relativeX: 0, relativeY: 0.3 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.65 },
  ],
  outputs: qqnOutputs,
  evaluate: ({ d: _d, clk: _clk }, state) => {
    const q = (state?.q as 0 | 1) ?? 0;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  stateUpdate: ({ d, clk }, _outputs, state) => {
    const prevClk = (state?.prevClk as 0 | 1) ?? 0;
    const q = (state?.q as 0 | 1) ?? 0;
    const newQ = (clk === 1 && prevClk === 0) ? d as 0 | 1 : q;
    return { q: newQ, prevClk: clk };
  },
  toVerilog: (g, w) => {
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const d   = w[`${g.id}:d`]   ?? "1'b0";
    const q   = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [
      `always @(posedge ${clk}) begin`,
      `  ${q} <= ${d};`,
      `end // D-FF ${g.id}`,
      `assign ${qn} = ~${q};`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const d   = w[`${g.id}:d`]   ?? "'0'";
    const q   = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [
      `process(${clk})`,
      `begin`,
      `  if rising_edge(${clk}) then`,
      `    ${q} <= ${d};`,
      `  end if;`,
      `end process; -- D-FF ${g.id}`,
      `${qn} <= not ${q};`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: 'D Flip-Flop (steigende Flanke): Q nimmt D bei CLK↑ an',
  isSynchronous: true,
});

// ─── D Flip-Flop with async Reset ────────────────────────────────────────────

gateRegistry.register({
  typeId: 'D_FF_R',
  label: 'D-FF/R',
  category: 'flipflop',
  width: 80, height: 100,
  inputs: [
    { id: 'd',   label: 'D',   relativeX: 0, relativeY: 0.25 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.55 },
    { id: 'rst', label: 'RST', relativeX: 0, relativeY: 0.8 },
  ],
  outputs: qqnOutputs,
  evaluate: (_inputs, state) => {
    const q = (state?.q as 0 | 1) ?? 0;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  stateUpdate: ({ d, clk, rst }, _outputs, state) => {
    if (rst === 1) return { q: 0, prevClk: clk };
    const prevClk = (state?.prevClk as 0 | 1) ?? 0;
    const q = (state?.q as 0 | 1) ?? 0;
    const newQ = (clk === 1 && prevClk === 0) ? d as 0 | 1 : q;
    return { q: newQ, prevClk: clk };
  },
  toVerilog: (g, w) => {
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const rst = w[`${g.id}:rst`] ?? "1'b0";
    const d   = w[`${g.id}:d`]   ?? "1'b0";
    const q   = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [
      `always @(posedge ${clk} or posedge ${rst}) begin`,
      `  if (${rst}) ${q} <= 1'b0;`,
      `  else        ${q} <= ${d};`,
      `end // D-FF/R ${g.id}`,
      `assign ${qn} = ~${q};`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const rst = w[`${g.id}:rst`] ?? "'0'";
    const d   = w[`${g.id}:d`]   ?? "'0'";
    const q   = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [
      `process(${clk}, ${rst})`,
      `begin`,
      `  if ${rst} = '1' then`,
      `    ${q} <= '0';`,
      `  elsif rising_edge(${clk}) then`,
      `    ${q} <= ${d};`,
      `  end if;`,
      `end process; -- D-FF/R ${g.id}`,
      `${qn} <= not ${q};`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: 'D Flip-Flop mit asynchronem Reset',
  isSynchronous: true,
});

// ─── JK Flip-Flop ─────────────────────────────────────────────────────────────

gateRegistry.register({
  typeId: 'JK_FF',
  label: 'JK-FF',
  category: 'flipflop',
  width: 80, height: 90,
  inputs: [
    { id: 'j',   label: 'J',   relativeX: 0, relativeY: 0.25 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.55 },
    { id: 'k',   label: 'K',   relativeX: 0, relativeY: 0.8 },
  ],
  outputs: qqnOutputs,
  evaluate: (_inputs, state) => {
    const q = (state?.q as 0 | 1) ?? 0;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  stateUpdate: ({ j, clk, k }, _outputs, state) => {
    const prevClk = (state?.prevClk as 0 | 1) ?? 0;
    const q = (state?.q as 0 | 1) ?? 0;
    let newQ = q;
    if (clk === 1 && prevClk === 0) {
      if (j === 0 && k === 0) newQ = q;         // Hold
      else if (j === 0 && k === 1) newQ = 0;    // Reset
      else if (j === 1 && k === 0) newQ = 1;    // Set
      else newQ = (q ^ 1) as 0 | 1;             // Toggle
    }
    return { q: newQ, prevClk: clk };
  },
  toVerilog: (g, w) => {
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const j   = w[`${g.id}:j`]   ?? "1'b0";
    const k   = w[`${g.id}:k`]   ?? "1'b0";
    const q   = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [
      `always @(posedge ${clk}) begin`,
      `  if      (${j} && !${k}) ${q} <= 1'b1;`,
      `  else if (!${j} && ${k}) ${q} <= 1'b0;`,
      `  else if (${j} && ${k})  ${q} <= ~${q};`,
      `end // JK-FF ${g.id}`,
      `assign ${qn} = ~${q};`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const j   = w[`${g.id}:j`]   ?? "'0'";
    const k   = w[`${g.id}:k`]   ?? "'0'";
    const q   = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [
      `process(${clk})`,
      `begin`,
      `  if rising_edge(${clk}) then`,
      `    if    ${j} = '1' and ${k} = '0' then ${q} <= '1';`,
      `    elsif ${j} = '0' and ${k} = '1' then ${q} <= '0';`,
      `    elsif ${j} = '1' and ${k} = '1' then ${q} <= not ${q};`,
      `    end if;`,
      `  end if;`,
      `end process; -- JK-FF ${g.id}`,
      `${qn} <= not ${q};`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: 'JK Flip-Flop: J=Set, K=Reset, J=K=1 togglet Q',
  isSynchronous: true,
});

// ─── T Flip-Flop ──────────────────────────────────────────────────────────────

gateRegistry.register({
  typeId: 'T_FF',
  label: 'T-FF',
  category: 'flipflop',
  width: 80, height: 80,
  inputs: [
    { id: 't',   label: 'T',   relativeX: 0, relativeY: 0.3 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.65 },
  ],
  outputs: qqnOutputs,
  evaluate: (_inputs, state) => {
    const q = (state?.q as 0 | 1) ?? 0;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  stateUpdate: ({ t, clk }, _outputs, state) => {
    const prevClk = (state?.prevClk as 0 | 1) ?? 0;
    const q = (state?.q as 0 | 1) ?? 0;
    const newQ = (clk === 1 && prevClk === 0 && t === 1) ? (q ^ 1) as 0 | 1 : q;
    return { q: newQ, prevClk: clk };
  },
  toVerilog: (g, w) => {
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const t   = w[`${g.id}:t`]   ?? "1'b0";
    const q   = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [
      `always @(posedge ${clk}) begin`,
      `  if (${t}) ${q} <= ~${q};`,
      `end // T-FF ${g.id}`,
      `assign ${qn} = ~${q};`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const t   = w[`${g.id}:t`]   ?? "'0'";
    const q   = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [
      `process(${clk})`,
      `begin`,
      `  if rising_edge(${clk}) then`,
      `    if ${t} = '1' then ${q} <= not ${q}; end if;`,
      `  end if;`,
      `end process; -- T-FF ${g.id}`,
      `${qn} <= not ${q};`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: 'T Flip-Flop: toggelt Q bei CLK↑ wenn T=1',
  isSynchronous: true,
});

// ─── D Latch (level-sensitive) ────────────────────────────────────────────────

gateRegistry.register({
  typeId: 'D_LATCH',
  label: 'D-Latch',
  category: 'flipflop',
  width: 80, height: 80,
  inputs: [
    { id: 'd',  label: 'D', relativeX: 0, relativeY: 0.3 },
    { id: 'en', label: 'EN', relativeX: 0, relativeY: 0.65 },
  ],
  outputs: qqnOutputs,
  evaluate: ({ d, en }, state) => {
    const q = en === 1 ? d as 0 | 1 : (state?.q as 0 | 1) ?? 0;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  stateUpdate: ({ d, en }, _outputs, state) => {
    const q = en === 1 ? d : (state?.q ?? 0);
    return { q };
  },
  toVerilog: (g, w) => {
    const en = w[`${g.id}:en`] ?? "1'b0";
    const d  = w[`${g.id}:d`]  ?? "1'b0";
    const q  = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [
      `always @(*) begin`,
      `  if (${en}) begin`,
      `    ${q}  <= ${d};`,
      `    ${qn} <= ~${d};`,
      `  end`,
      `end // D-Latch ${g.id}`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const en = w[`${g.id}:en`] ?? "'0'";
    const d  = w[`${g.id}:d`]  ?? "'0'";
    const q  = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [
      `process(${en}, ${d})`,
      `begin`,
      `  if ${en} = '1' then`,
      `    ${q}  <= ${d};`,
      `    ${qn} <= not ${d};`,
      `  end if;`,
      `end process; -- D-Latch ${g.id}`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: 'D-Latch (pegelgesteuert): transparent wenn EN=1',
});
