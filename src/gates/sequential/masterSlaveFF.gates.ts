/**
 * Master-Slave JK Flip-Flop and Edge-triggered SR Flip-Flop
 */
import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_'); }

const qqnOutputs = [
  { id: 'q',   label: 'Q',  relativeX: 1, relativeY: 0.35 },
  { id: 'q_n', label: 'Q̅', relativeX: 1, relativeY: 0.65 },
];

// ─── Master-Slave JK Flip-Flop ───────────────────────────────────────────────
// Q changes only on FALLING clock edge (slave-latch transfer)
// Master latch is transparent while CLK=1
gateRegistry.register({
  typeId: 'MS_JK_FF',
  label: 'MS-JK',
  category: 'flipflop',
  width: 80, height: 90,
  inputs: [
    { id: 'j',   label: 'J',   relativeX: 0, relativeY: 0.25 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.55 },
    { id: 'k',   label: 'K',   relativeX: 0, relativeY: 0.8  },
  ],
  outputs: qqnOutputs,
  evaluate: (_inputs, state) => {
    const q = (state?.qS as 0 | 1) ?? 0;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  stateUpdate: ({ j, clk, k }, _outputs, state) => {
    const prevClk = (state?.prevClk as 0 | 1) ?? 0;
    const qM      = (state?.qM as 0 | 1) ?? 0;
    const qS      = (state?.qS as 0 | 1) ?? 0;

    // Master tracks when CLK=1 (level-sensitive)
    // Toggle must use qS (stable slave output), not qM — feedback comes from Q!
    let newQM = qM;
    if (clk === 1) {
      if      (j === 0 && k === 1) newQM = 0;
      else if (j === 1 && k === 0) newQM = 1;
      else if (j === 1 && k === 1) newQM = (qS ^ 1) as 0 | 1;
      // j=0, k=0 → hold
    }

    // Slave transfers on falling edge
    let newQS = qS;
    if (clk === 0 && prevClk === 1) newQS = newQM;

    return { qM: newQM, qS: newQS, prevClk: clk };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const j   = w[`${g.id}:j`]   ?? "1'b0";
    const k   = w[`${g.id}:k`]   ?? "1'b0";
    const q   = w[`${g.id}:q`]   ?? `w_${sid}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sid}_q_n`;
    return [
      `// MS-JK FF ${sid}: Q captures on falling CLK edge`,
      `always @(negedge ${clk}) begin`,
      `  if      (${j} && !${k})  ${q} <= 1'b1;`,
      `  else if (!${j} && ${k})  ${q} <= 1'b0;`,
      `  else if (${j} && ${k})   ${q} <= ~${q};`,
      `end // MS-JK ${sid}`,
      `assign ${qn} = ~${q};`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const j   = w[`${g.id}:j`]   ?? "'0'";
    const k   = w[`${g.id}:k`]   ?? "'0'";
    const q   = w[`${g.id}:q`]   ?? `w_${sid}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sid}_q_n`;
    return [
      `-- MS-JK FF ${sid}: Q captures on falling CLK edge`,
      `process(${clk})`,
      `begin`,
      `  if falling_edge(${clk}) then`,
      `    if    ${j} = '1' and ${k} = '0' then ${q} <= '1';`,
      `    elsif ${j} = '0' and ${k} = '1' then ${q} <= '0';`,
      `    elsif ${j} = '1' and ${k} = '1' then ${q} <= not ${q};`,
      `    end if;`,
      `  end if;`,
      `end process; -- MS-JK ${sid}`,
      `${qn} <= not ${q};`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: 'Master-Slave JK FF: Q ändert sich nur auf fallender CLK-Flanke',
  isSynchronous: true,
  clockInputId: 'clk',
  verilogWireOutputs: ['q_n'],
});

// ─── Edge-triggered SR Flip-Flop ─────────────────────────────────────────────
// Like SR-Latch but only responds on rising clock edge
gateRegistry.register({
  typeId: 'SR_FF_EDGE',
  label: 'SR-E',
  category: 'flipflop',
  width: 80, height: 90,
  inputs: [
    { id: 's',   label: 'S',   relativeX: 0, relativeY: 0.25 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.55 },
    { id: 'r',   label: 'R',   relativeX: 0, relativeY: 0.8  },
  ],
  outputs: qqnOutputs,
  evaluate: (_inputs, state) => {
    const q = (state?.q as 0 | 1) ?? 0;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  stateUpdate: ({ s, clk, r }, _outputs, state) => {
    const prevClk = (state?.prevClk as 0 | 1) ?? 0;
    const q       = (state?.q as 0 | 1) ?? 0;
    let newQ = q;
    if (clk === 1 && prevClk === 0) {
      // Rising edge
      if      (s === 1 && r === 0) newQ = 1;
      else if (s === 0 && r === 1) newQ = 0;
      else if (s === 1 && r === 1) newQ = 0; // undefined / forbidden
      // s=0, r=0 → hold
    }
    return { q: newQ, prevClk: clk };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const s   = w[`${g.id}:s`]   ?? "1'b0";
    const r   = w[`${g.id}:r`]   ?? "1'b0";
    const q   = w[`${g.id}:q`]   ?? `w_${sid}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sid}_q_n`;
    return [
      `always @(posedge ${clk}) begin`,
      `  if      (${s} && !${r})  ${q} <= 1'b1;`,
      `  else if (!${s} && ${r})  ${q} <= 1'b0;`,
      `  else if (${s} && ${r})   ${q} <= 1'b0; // forbidden → 0`,
      `end // SR-FF-Edge ${sid}`,
      `assign ${qn} = ~${q};`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const s   = w[`${g.id}:s`]   ?? "'0'";
    const r   = w[`${g.id}:r`]   ?? "'0'";
    const q   = w[`${g.id}:q`]   ?? `w_${sid}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sid}_q_n`;
    return [
      `process(${clk})`,
      `begin`,
      `  if rising_edge(${clk}) then`,
      `    if    ${s} = '1' and ${r} = '0' then ${q} <= '1';`,
      `    elsif ${s} = '0' and ${r} = '1' then ${q} <= '0';`,
      `    elsif ${s} = '1' and ${r} = '1' then ${q} <= '0'; -- forbidden`,
      `    end if;`,
      `  end if;`,
      `end process; -- SR-FF-Edge ${sid}`,
      `${qn} <= not ${q};`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: 'Flanken-SR-FF (steigende Flanke): S=Setzen, R=Rücksetzen bei CLK↑',
  isSynchronous: true,
  clockInputId: 'clk',
  verilogWireOutputs: ['q_n'],
});
