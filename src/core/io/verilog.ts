// Bit-order convention: bit 0 = LSB throughout this generator.
// Signal type rule: continuous / gate-primitive driver → wire; procedural driver → reg.
import type { Circuit, GateInstance } from '../types';
import { gateRegistry } from '../registry/GateRegistry';

interface WireMap {
  /** portKey "gateId:portId" → signal name */
  byPort: Record<string, string>;
}

function sanitize(id: string) {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

// Gate types that have no direct Verilog equivalent and should be excluded from logic
const EXCLUDE_FROM_VERILOG = new Set([
  'CLOCK', 'PUSH_BTN', 'JUNCTION', 'TEXT_NOTE',
  'OUTPUT_LED_7SEG', 'DOT_MATRIX', 'STEPPER_MOTOR', 'ADC8',
  'CUSTOM_IC',
]);

/** Renders extra reg declarations, supporting 1-D regs and 2-D memory arrays. */
function renderVerilogExtraRegs(
  regs: { name: string; width: number; depth?: number; initData?: number[] }[]
): string[] {
  const lines: string[] = [];
  for (const { name, width, depth, initData } of regs) {
    if (depth !== undefined) {
      const nibbles = Math.ceil(width / 4);
      lines.push(`  reg [${width - 1}:0] ${name} [0:${depth - 1}];`);
      if (initData && initData.some(v => v !== 0)) {
        lines.push(`  initial begin`);
        for (let i = 0; i < depth; i++) {
          const v = initData[i] ?? 0;
          if (v !== 0) {
            lines.push(`    ${name}[${i}] = ${width}'h${v.toString(16).toUpperCase().padStart(nibbles, '0')};`);
          }
        }
        lines.push(`  end`);
      }
    } else {
      lines.push(`  reg [${width - 1}:0] ${name};`);
    }
  }
  return lines;
}

function buildWireMap(circuit: Circuit): WireMap {
  const byPort: Record<string, string> = {};

  let swIdx = 0;
  for (const gate of Object.values(circuit.gates)) {
    if (gate.typeId === 'INPUT_SWITCH') {
      const name = gate.label ? sanitize(gate.label) : `sw_${swIdx++}`;
      byPort[`${gate.id}:out`] = name;
    }
  }

  let wIdx = 0;
  for (const wire of Object.values(circuit.wires)) {
    const fromKey = `${wire.from.gateId}:${wire.from.portId}`;
    if (!byPort[fromKey]) {
      byPort[fromKey] = `w_${wIdx++}`;
    }
    byPort[`${wire.to.gateId}:${wire.to.portId}`] = byPort[fromKey];
  }

  let ledIdx = 0;
  for (const gate of Object.values(circuit.gates)) {
    if (gate.typeId === 'OUTPUT_LED') {
      const inKey = `${gate.id}:in`;
      if (!byPort[inKey]) {
        const name = gate.label ? sanitize(gate.label) : `led_${ledIdx++}`;
        byPort[inKey] = name;
      }
    }
  }

  return { byPort };
}

/** Convert a port label to a safe Verilog identifier (strips leading /, sanitizes). */
function portIdent(label: string | undefined, fallback: string): string {
  const raw = (label ?? fallback).replace(/^\/+/, 'n'); // /OE → nOE, /CS → nCS
  return sanitize(raw).replace(/^_+/, '') || sanitize(fallback);
}

export function generateVerilog(circuit: Circuit): string {
  const moduleName = sanitize(circuit.name) || 'circuit';
  const { byPort } = buildWireMap(circuit);

  // Phase 0: Pre-populate byPort for unconnected gate input pins.
  // Without this, toVerilog() falls back to literal constants (e.g. "1'b0"), which
  // silently produce dead conditions like `if (1'b0 == 1'b1)` in the RTL.
  // Naming them here causes Bug-fix-1 to promote them to module input ports instead,
  // which is the correct industrial behaviour for truly unconnected pins.
  for (const gate of Object.values(circuit.gates)) {
    if (gate.typeId === 'INPUT_SWITCH' || gate.typeId === 'OUTPUT_LED') continue;
    if (EXCLUDE_FROM_VERILOG.has(gate.typeId) || !gateRegistry.has(gate.typeId)) continue;
    const def = gateRegistry.get(gate.typeId);
    for (const inp of def.inputs) {
      const key = `${gate.id}:${inp.id}`;
      if (byPort[key] === undefined) {
        byPort[key] = `nc_${portIdent(inp.label, inp.id)}`;
      }
    }
  }

  const inputs:   string[] = [];
  const outputs:  string[] = [];
  const wires  = new Set<string>(); // combinational internal signals → wire
  const regs   = new Set<string>(); // procedural (always @) internal signals → reg
  const gateLines: string[] = [];
  const ffLines:   string[] = [];

  for (const gate of Object.values(circuit.gates)) {
    if (gate.typeId === 'INPUT_SWITCH') {
      const name = byPort[`${gate.id}:out`] ?? `sw_${gate.id}`;
      inputs.push(name);
    } else if (gate.typeId === 'OUTPUT_LED') {
      const name = byPort[`${gate.id}:in`] ?? `led_${gate.id}`;
      outputs.push(name);
    } else if (!EXCLUDE_FROM_VERILOG.has(gate.typeId) && gateRegistry.has(gate.typeId)) {
      const def = gateRegistry.get(gate.typeId);

      // Per-output wire overrides: some gates (e.g. D-FF) drive certain outputs via
      // 'assign' even though the gate is otherwise isSynchronous/verilogAlwaysComb.
      // Those outputs must remain wire to avoid mixed-driver synthesis errors.
      const wireOutputIds = new Set(def.verilogWireOutputs ?? []);

      // Classify each output as wire (continuous) or reg (procedural).
      for (const out of def.outputs) {
        const k = `${gate.id}:${out.id}`;
        const wName = byPort[k] ?? `w_${sanitize(gate.id)}_${out.id}`;
        if (!inputs.includes(wName) && !outputs.includes(wName)) {
          if ((def.isSynchronous || def.verilogAlwaysComb) && !wireOutputIds.has(out.id)) {
            regs.add(wName);
          } else {
            wires.add(wName);
          }
        }
      }

      // Generate Verilog for this gate
      let line: string;
      if (gate.typeId === 'CONST_HIGH') {
        const s = byPort[`${gate.id}:out`];
        line = s ? `assign ${s} = 1'b1; // CONST_HIGH` : `// CONST_HIGH (unconnected)`;
      } else if (gate.typeId === 'CONST_LOW') {
        const s = byPort[`${gate.id}:out`];
        line = s ? `assign ${s} = 1'b0; // CONST_LOW` : `// CONST_LOW (unconnected)`;
      } else if (def.toVerilog) {
        line = def.toVerilog(gate, byPort);
      } else {
        line = defaultGateVerilog(gate, byPort);
      }

      // Multi-line support: indent each line
      const indented = line.split('\n').map(l => '  ' + l).join('\n');
      (def.isSynchronous ? ffLines : gateLines).push(indented);
    }
  }

  // Bug fix 1: any signal consumed by logic but not yet declared (e.g. CLOCK → FF clock pin)
  // must appear as an input port.
  for (const gate of Object.values(circuit.gates)) {
    if (EXCLUDE_FROM_VERILOG.has(gate.typeId) || !gateRegistry.has(gate.typeId)) continue;
    const def = gateRegistry.get(gate.typeId);
    for (const inp of def.inputs) {
      const wName = byPort[`${gate.id}:${inp.id}`];
      if (wName && !inputs.includes(wName) && !outputs.includes(wName) && !wires.has(wName) && !regs.has(wName)) {
        inputs.push(wName);
      }
    }
  }

  // Bug fix 2: capture output driver class BEFORE removal so port type (wire/reg) is correct.
  // A signal in 'regs' was driven by always @(posedge) or always @(*) → output reg.
  // A signal in 'wires' or neither → driven by assign/primitive → output wire.
  const outputIsReg = new Set<string>();
  for (const name of outputs) {
    if (regs.has(name)) outputIsReg.add(name);
    regs.delete(name);
    wires.delete(name);
  }

  // Collect extra internal regs (e.g. shift registers in PISO4, ROM/RAM arrays) declared at module scope
  const extraVerilogRegs: { name: string; width: number; depth?: number; initData?: number[] }[] = [];
  for (const gate of Object.values(circuit.gates)) {
    if (EXCLUDE_FROM_VERILOG.has(gate.typeId) || !gateRegistry.has(gate.typeId)) continue;
    const def = gateRegistry.get(gate.typeId);
    if (def.verilogExtraRegs) {
      for (const reg of def.verilogExtraRegs(gate)) {
        extraVerilogRegs.push(reg);
      }
    }
  }

  // Build port declarations
  const portParts: string[] = [];
  for (const name of inputs)  portParts.push(`  input  wire ${name}`);
  for (const name of outputs) {
    // output reg: driven by always block; output wire: driven by assign/primitive
    portParts.push(`  output ${outputIsReg.has(name) ? 'reg ' : 'wire'} ${name}`);
  }

  const lines: string[] = [
    `// Generated by LogicSim`,
    `// Verilog-2001 — bit 0 = LSB`,
    `\`default_nettype none`,
    ``,
    `module ${moduleName} (`,
    ...(portParts.length > 0
      ? [portParts.join(',\n'), `);`]
      : [`);`]
    ),
    ``,
    ...(wires.size > 0 ? [`  wire ${[...wires].join(', ')};`, ``] : []),
    ...(regs.size  > 0 ? [`  reg  ${[...regs].join(', ')};`,  ``] : []),
    ...renderVerilogExtraRegs(extraVerilogRegs),
    ...(extraVerilogRegs.length > 0 ? [``,] : []),
    ...(gateLines.length > 0 ? [...gateLines, ``] : []),
    ...(ffLines.length > 0 ? [
      `  // Sequential logic`,
      ...ffLines,
      ``,
    ] : []),
    `endmodule // ${moduleName}`,
    `\`default_nettype wire`,
  ];

  return lines.join('\n');
}

function defaultGateVerilog(gate: GateInstance, byPort: Record<string, string>): string {
  const def  = gateRegistry.get(gate.typeId);
  const ins  = def.inputs.map((p)  => byPort[`${gate.id}:${p.id}`] ?? `1'b0`);
  const outs = def.outputs.map((p) => byPort[`${gate.id}:${p.id}`] ?? `w_${sanitize(gate.id)}_${p.id}`);

  // Map type to Verilog primitive keyword
  const PRIM_MAP: Record<string, string> = {
    AND: 'and', OR: 'or', NOT: 'not', NAND: 'nand', NOR: 'nor',
    XOR: 'xor', XNOR: 'xnor', BUFFER: 'buf',
    AND3: 'and', AND4: 'and', OR3: 'or', OR4: 'or',
    NAND3: 'nand', NAND4: 'nand', NOR3: 'nor', NOR4: 'nor', XOR3: 'xor',
  };
  const prim = PRIM_MAP[gate.typeId];
  if (prim) {
    return `${prim} g_${sanitize(gate.id)}(${[...outs, ...ins].join(', ')});`;
  }

  return `// ${gate.typeId} (${gate.id}): manual Verilog implementation required`;
}
