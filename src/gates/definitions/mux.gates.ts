import { gateRegistry } from '../../core/registry/GateRegistry';
import { MuxShape } from '../shapes/MuxShape';
import type { SignalValue } from '../../core/types';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'x'; }

// ─── 2:1 Multiplexer ──────────────────────────────────────────────────────────
gateRegistry.register({
  typeId: 'MUX2',
  label: 'MUX2',
  category: 'mux',
  width: 80, height: 90,
  inputs: [
    { id: 'd0', label: 'D0', relativeX: 0, relativeY: 0.22 },
    { id: 'd1', label: 'D1', relativeX: 0, relativeY: 0.50 },
    { id: 's',  label: 'S',  relativeX: 0, relativeY: 0.80 },
  ],
  outputs: [
    { id: 'y', label: 'Y', relativeX: 1, relativeY: 0.50 },
  ],
  evaluate: ({ d0, d1, s }) => ({
    y: (s === 0 ? d0 : d1) as SignalValue,
  }),
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    // Phase 0 guarantees d0/d1/s are pre-populated (nc_* if unconnected).
    const d0 = w[`${g.id}:d0`];
    const d1 = w[`${g.id}:d1`];
    const s  = w[`${g.id}:s`];
    const y  = w[`${g.id}:y`];
    if (!y) return `// MUX2 ${sid}: output Y unconnected — skipped`;
    return `assign ${y} = ${s} ? ${d1} : ${d0}; // MUX2 ${sid}`;
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    // Phase 0 guarantees d0/d1/s are pre-populated (nc_* if unconnected).
    const d0 = w[`${g.id}:d0`];
    const d1 = w[`${g.id}:d1`];
    const s  = w[`${g.id}:s`];
    const y  = w[`${g.id}:y`];
    if (!y) return `-- MUX2 ${sid}: output Y unconnected — skipped`;
    return `${y} <= ${d1} when ${s} = '1' else ${d0}; -- MUX2 ${sid}`;
  },
  shapeComponent: MuxShape,
  description: '2:1 Multiplexer – S=0→Y=D0, S=1→Y=D1',
  propagationDelay: 2,
  verilogSkipUnconnectedOutputs: true,
  vhdlSkipUnconnectedOutputs: true,
});

// ─── 4:1 Multiplexer ──────────────────────────────────────────────────────────
gateRegistry.register({
  typeId: 'MUX4',
  label: 'MUX4',
  category: 'mux',
  width: 80, height: 130,
  inputs: [
    { id: 'd0', label: 'D0', relativeX: 0, relativeY: 0.13 },
    { id: 'd1', label: 'D1', relativeX: 0, relativeY: 0.28 },
    { id: 'd2', label: 'D2', relativeX: 0, relativeY: 0.43 },
    { id: 'd3', label: 'D3', relativeX: 0, relativeY: 0.58 },
    { id: 's0', label: 'S0', relativeX: 0, relativeY: 0.74 },
    { id: 's1', label: 'S1', relativeX: 0, relativeY: 0.89 },
  ],
  outputs: [
    { id: 'y', label: 'Y', relativeX: 1, relativeY: 0.50 },
  ],
  evaluate: ({ d0, d1, d2, d3, s0, s1 }) => {
    const sel = (s1 << 1) | s0;
    const vals = [d0, d1, d2, d3];
    return { y: (vals[sel] ?? 0) as SignalValue };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    // Phase 0 guarantees d0/d1/d2/d3/s0/s1 are pre-populated (nc_* if unconnected).
    const d0 = w[`${g.id}:d0`]; const d1 = w[`${g.id}:d1`];
    const d2 = w[`${g.id}:d2`]; const d3 = w[`${g.id}:d3`];
    const s0 = w[`${g.id}:s0`]; const s1 = w[`${g.id}:s1`];
    const y  = w[`${g.id}:y`];
    if (!y) return `// MUX4 ${sid}: output Y unconnected — skipped`;
    return [
      `// MUX4 ${sid}`,
      `always @(*) begin`,
      `  case ({${s1}, ${s0}})`,
      `    2'b00: ${y} = ${d0};`,
      `    2'b01: ${y} = ${d1};`,
      `    2'b10: ${y} = ${d2};`,
      `    2'b11: ${y} = ${d3};`,
      `    default: ${y} = 1'b0;`,
      `  endcase`,
      `end // MUX4 ${sid}`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    // Phase 0 guarantees d0/d1/d2/d3/s0/s1 are pre-populated (nc_* if unconnected).
    const d0 = w[`${g.id}:d0`]; const d1 = w[`${g.id}:d1`];
    const d2 = w[`${g.id}:d2`]; const d3 = w[`${g.id}:d3`];
    const s0 = w[`${g.id}:s0`]; const s1 = w[`${g.id}:s1`];
    const y  = w[`${g.id}:y`];
    if (!y) return `-- MUX4 ${sid}: output Y unconnected — skipped`;
    const allSigs = [d0, d1, d2, d3, s0, s1].filter((x): x is string => !!x && !x.startsWith("'"));
    const sens = [...new Set(allSigs)].join(', ') || 'd0';
    return [
      `-- MUX4 ${sid}`,
      `process(${sens})`,
      `begin`,
      `  if    ${s1} = '0' and ${s0} = '0' then ${y} <= ${d0};`,
      `  elsif ${s1} = '0' and ${s0} = '1' then ${y} <= ${d1};`,
      `  elsif ${s1} = '1' and ${s0} = '0' then ${y} <= ${d2};`,
      `  else                                    ${y} <= ${d3};`,
      `  end if;`,
      `end process; -- MUX4 ${sid}`,
    ].join('\n');
  },
  shapeComponent: MuxShape,
  description: '4:1 Multiplexer – S1:S0 wählt D0–D3',
  propagationDelay: 3,
  verilogAlwaysComb: true,
  verilogSkipUnconnectedOutputs: true,
  vhdlSkipUnconnectedOutputs: true,
});

// ─── 1:2 Demultiplexer ────────────────────────────────────────────────────────
gateRegistry.register({
  typeId: 'DEMUX2',
  label: 'DEMUX2',
  category: 'mux',
  width: 80, height: 90,
  inputs: [
    { id: 'd', label: 'D', relativeX: 0, relativeY: 0.35 },
    { id: 's', label: 'S', relativeX: 0, relativeY: 0.72 },
  ],
  outputs: [
    { id: 'y0', label: 'Y0', relativeX: 1, relativeY: 0.30 },
    { id: 'y1', label: 'Y1', relativeX: 1, relativeY: 0.70 },
  ],
  evaluate: ({ d, s }) => ({
    y0: (s === 0 ? d : 0) as SignalValue,
    y1: (s === 1 ? d : 0) as SignalValue,
  }),
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const d  = w[`${g.id}:d`]  ?? "1'b0";
    const s  = w[`${g.id}:s`]  ?? "1'b0";
    const y0 = w[`${g.id}:y0`] ?? `w_${sid}_y0`;
    const y1 = w[`${g.id}:y1`] ?? `w_${sid}_y1`;
    return [
      `// DEMUX2 ${sid}`,
      `always @(*) begin`,
      `  case (${s})`,
      `    1'b0: begin ${y0} = ${d}; ${y1} = 1'b0; end`,
      `    1'b1: begin ${y0} = 1'b0; ${y1} = ${d}; end`,
      `    default: begin ${y0} = 1'b0; ${y1} = 1'b0; end`,
      `  endcase`,
      `end // DEMUX2 ${sid}`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const d  = w[`${g.id}:d`]  ?? "'0'";
    const s  = w[`${g.id}:s`]  ?? "'0'";
    const y0 = w[`${g.id}:y0`] ?? `w_${sid}_y0`;
    const y1 = w[`${g.id}:y1`] ?? `w_${sid}_y1`;
    const sens2 = [d, s].filter(x => !x.startsWith("'")).join(', ') || 'd, s';
    return [
      `-- DEMUX2 ${sid}`,
      `process(${sens2})`,
      `begin`,
      `  ${y0} <= '0'; ${y1} <= '0';`,
      `  if ${s} = '0' then ${y0} <= ${d};`,
      `  else                ${y1} <= ${d};`,
      `  end if;`,
      `end process; -- DEMUX2 ${sid}`,
    ].join('\n');
  },
  shapeComponent: MuxShape,
  description: '1:2 Demultiplexer – S=0→Y0=D, S=1→Y1=D',
  propagationDelay: 2,
  verilogAlwaysComb: true,
});

// ─── 1:4 Demultiplexer ────────────────────────────────────────────────────────
gateRegistry.register({
  typeId: 'DEMUX4',
  label: 'DEMUX4',
  category: 'mux',
  width: 80, height: 130,
  inputs: [
    { id: 'd',  label: 'D',  relativeX: 0, relativeY: 0.20 },
    { id: 's0', label: 'S0', relativeX: 0, relativeY: 0.55 },
    { id: 's1', label: 'S1', relativeX: 0, relativeY: 0.78 },
  ],
  outputs: [
    { id: 'y0', label: 'Y0', relativeX: 1, relativeY: 0.13 },
    { id: 'y1', label: 'Y1', relativeX: 1, relativeY: 0.38 },
    { id: 'y2', label: 'Y2', relativeX: 1, relativeY: 0.63 },
    { id: 'y3', label: 'Y3', relativeX: 1, relativeY: 0.88 },
  ],
  evaluate: ({ d, s0, s1 }) => {
    const sel = (s1 << 1) | s0;
    return {
      y0: (sel === 0 ? d : 0) as SignalValue,
      y1: (sel === 1 ? d : 0) as SignalValue,
      y2: (sel === 2 ? d : 0) as SignalValue,
      y3: (sel === 3 ? d : 0) as SignalValue,
    };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const d  = w[`${g.id}:d`]  ?? "1'b0";
    const s0 = w[`${g.id}:s0`] ?? "1'b0";
    const s1 = w[`${g.id}:s1`] ?? "1'b0";
    const y0 = w[`${g.id}:y0`] ?? `w_${sid}_y0`;
    const y1 = w[`${g.id}:y1`] ?? `w_${sid}_y1`;
    const y2 = w[`${g.id}:y2`] ?? `w_${sid}_y2`;
    const y3 = w[`${g.id}:y3`] ?? `w_${sid}_y3`;
    return [
      `// DEMUX4 ${sid}`,
      `always @(*) begin`,
      `  case ({${s1}, ${s0}})`,
      `    2'b00: begin ${y0}=${d}; ${y1}=1'b0; ${y2}=1'b0; ${y3}=1'b0; end`,
      `    2'b01: begin ${y0}=1'b0; ${y1}=${d}; ${y2}=1'b0; ${y3}=1'b0; end`,
      `    2'b10: begin ${y0}=1'b0; ${y1}=1'b0; ${y2}=${d}; ${y3}=1'b0; end`,
      `    2'b11: begin ${y0}=1'b0; ${y1}=1'b0; ${y2}=1'b0; ${y3}=${d}; end`,
      `    default: begin ${y0}=1'b0; ${y1}=1'b0; ${y2}=1'b0; ${y3}=1'b0; end`,
      `  endcase`,
      `end // DEMUX4 ${sid}`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const d  = w[`${g.id}:d`]  ?? "'0'";
    const s0 = w[`${g.id}:s0`] ?? "'0'";
    const s1 = w[`${g.id}:s1`] ?? "'0'";
    const y0 = w[`${g.id}:y0`] ?? `w_${sid}_y0`;
    const y1 = w[`${g.id}:y1`] ?? `w_${sid}_y1`;
    const y2 = w[`${g.id}:y2`] ?? `w_${sid}_y2`;
    const y3 = w[`${g.id}:y3`] ?? `w_${sid}_y3`;
    const sens4 = [d, s0, s1].filter(x => !x.startsWith("'")).join(', ') || 'd, s0, s1';
    return [
      `-- DEMUX4 ${sid}`,
      `process(${sens4})`,
      `begin`,
      `  ${y0} <= '0'; ${y1} <= '0'; ${y2} <= '0'; ${y3} <= '0';`,
      `  if    ${s1} = '0' and ${s0} = '0' then ${y0} <= ${d};`,
      `  elsif ${s1} = '0' and ${s0} = '1' then ${y1} <= ${d};`,
      `  elsif ${s1} = '1' and ${s0} = '0' then ${y2} <= ${d};`,
      `  else                                    ${y3} <= ${d};`,
      `  end if;`,
      `end process; -- DEMUX4 ${sid}`,
    ].join('\n');
  },
  shapeComponent: MuxShape,
  description: '1:4 Demultiplexer – S1:S0 leitet D auf Y0–Y3',
  propagationDelay: 3,
  verilogAlwaysComb: true,
});
