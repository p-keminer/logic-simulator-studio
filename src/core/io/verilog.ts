// Bit-order convention: bit 0 = LSB throughout this generator.
// Signal type rule: continuous / gate-primitive driver → wire; procedural driver → reg.
import type { Circuit, GateInstance } from '../types';
import { gateRegistry } from '../registry/GateRegistry';
import { sanitizeVerilog, makeUnique } from './identSanitize';

interface WireMap {
  /** portKey "gateId:portId" → signal name */
  byPort: Record<string, string>;
}

/** Fast sanitize for internal gate IDs (always safe — never keywords, never start with digit). */
function sanitize(id: string) {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

// Gate types that have no direct Verilog equivalent and should be excluded from logic
const EXCLUDE_FROM_VERILOG = new Set([
  'CLOCK', 'PUSH_BTN', 'JUNCTION', 'TEXT_NOTE',
  'SEG7', 'SEG7_BCD', 'SEG7_DUAL', 'SEG7_BCD_2',
  'DOTMATRIX8', 'STEPPER_VIZ', 'ADC8',
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
  // Track all assigned port names to guarantee uniqueness after sanitizing.
  const usedPortNames = new Set<string>();

  let swIdx = 0;
  for (const gate of Object.values(circuit.gates)) {
    if (gate.typeId === 'INPUT_SWITCH') {
      const raw  = gate.label ? sanitizeVerilog(gate.label, 'signal') : `sw_${swIdx++}`;
      const name = makeUnique(raw, usedPortNames);
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

  // Propagate signal names through JUNCTIONs: all outputs get the input's name.
  // Without this, JUNCTION output ports receive new w_N names that are never
  // driven (JUNCTION is excluded from logic generation).
  // After updating junction output names, re-propagate through downstream wires
  // so that targets (e.g. OUTPUT_LEDs) receive the corrected signal name.
  for (const gate of Object.values(circuit.gates)) {
    if (gate.typeId !== 'JUNCTION') continue;
    const inName = byPort[`${gate.id}:in`];
    if (!inName) continue;
    for (const outId of ['y0', 'y1', 'y2']) {
      byPort[`${gate.id}:${outId}`] = inName;
    }
  }
  for (const wire of Object.values(circuit.wires)) {
    if (circuit.gates[wire.from.gateId]?.typeId === 'JUNCTION') {
      const fromKey = `${wire.from.gateId}:${wire.from.portId}`;
      if (byPort[fromKey]) {
        byPort[`${wire.to.gateId}:${wire.to.portId}`] = byPort[fromKey];
      }
    }
  }

  let ledIdx = 0;
  for (const gate of Object.values(circuit.gates)) {
    if (gate.typeId === 'OUTPUT_LED') {
      const inKey = `${gate.id}:in`;
      if (!byPort[inKey]) {
        const raw  = gate.label ? sanitizeVerilog(gate.label, 'signal') : `led_${ledIdx++}`;
        const name = makeUnique(raw, usedPortNames);
        byPort[inKey] = name;
      }
    }
  }

  return { byPort };
}

/** Convert a port label to a safe Verilog identifier (strips leading /, sanitizes). */
function portIdent(label: string | undefined, fallback: string): string {
  const raw = (label ?? fallback).replace(/^\/+/, 'n'); // /OE → nOE, /CS → nCS
  return sanitizeVerilog(raw, 'signal') || sanitizeVerilog(fallback, 'signal');
}

export function generateVerilog(circuit: Circuit): string {
  const moduleName = sanitizeVerilog(circuit.name || 'circuit', 'module');
  const { byPort } = buildWireMap(circuit);

  // ── Phase 0: Pre-populate byPort for unconnected gate input pins ──────────────
  // Without this, toVerilog() falls back to literal constants (e.g. "1'b0"), which
  // silently produce dead conditions like `if (1'b0 == 1'b1)` in the RTL.
  // Naming them here causes Pass 3 (Bug-fix-1) to promote them to module input
  // ports, which is the correct industrial behaviour for truly unconnected pins.
  //
  // Collision guard: two different gates with the same unconnected pin label must
  // NOT share the same nc_ name — that would silently tie them together.
  // A numeric suffix is added on collision: nc_LD, nc_LD_2, nc_LD_3, …
  {
    const usedNcNames = new Set<string>(Object.values(byPort));
    for (const gate of Object.values(circuit.gates)) {
      if (gate.typeId === 'INPUT_SWITCH' || gate.typeId === 'OUTPUT_LED') continue;
      if (EXCLUDE_FROM_VERILOG.has(gate.typeId) || !gateRegistry.has(gate.typeId)) continue;
      const def = gateRegistry.get(gate.typeId);
      for (const inp of def.inputs) {
        const key = `${gate.id}:${inp.id}`;
        if (byPort[key] !== undefined) continue;
        const base = `nc_${portIdent(inp.label, inp.id)}`;
        let name = base;
        for (let n = 2; usedNcNames.has(name); n++) name = `${base}_${n}`;
        byPort[key] = name;
        usedNcNames.add(name);
      }
    }
  }

  // ── Build constant map: track which input ports are driven by CONST_HIGH/LOW ──
  const constMap: Record<string, 0 | 1> = {};
  for (const wire of Object.values(circuit.wires)) {
    const srcGate = circuit.gates[wire.from.gateId];
    if (!srcGate) continue;
    if (srcGate.typeId === 'CONST_HIGH') constMap[`${wire.to.gateId}:${wire.to.portId}`] = 1;
    else if (srcGate.typeId === 'CONST_LOW') constMap[`${wire.to.gateId}:${wire.to.portId}`] = 0;
  }

  const inputs:  string[] = [];
  const outputs: string[] = [];

  // ── Pass 1: Collect all port names ───────────────────────────────────────────
  // MUST be a separate pass from signal classification (Pass 2).
  // If port collection and classification are mixed in one loop, the gate iteration
  // order (non-deterministic for object keys) determines whether an OUTPUT_LED name
  // is already in `outputs[]` when a driving FF gate is processed.
  // If the LED is processed first, the FF output is NOT added to `regs`, causing
  // the port to be mistyped as `output wire` instead of `output reg`.
  for (const gate of Object.values(circuit.gates)) {
    if (gate.typeId === 'INPUT_SWITCH') {
      inputs.push(byPort[`${gate.id}:out`] ?? `sw_${gate.id}`);
    } else if (gate.typeId === 'OUTPUT_LED') {
      outputs.push(byPort[`${gate.id}:in`] ?? `led_${gate.id}`);
    }
  }

  // ── Pass 2: Classify signals and generate logic ───────────────────────────────
  // Now that inputs[] and outputs[] are complete, driver classification is correct.
  //
  // Two concerns are kept separate:
  //   procDriven — ALL signals driven by always @(…), used for port type decisions.
  //   regs/wires — only INTERNAL (non-port) signals, used for `reg`/`wire` declarations.
  const procDriven = new Set<string>(); // driven by always block → reg in declarations
  const wires  = new Set<string>();     // internal continuous signals
  const regs   = new Set<string>();     // internal procedural signals
  const gateLines: string[] = [];
  const ffLines:   string[] = [];

  for (const gate of Object.values(circuit.gates)) {
    if (gate.typeId === 'INPUT_SWITCH' || gate.typeId === 'OUTPUT_LED') continue;
    if (EXCLUDE_FROM_VERILOG.has(gate.typeId) || !gateRegistry.has(gate.typeId)) continue;

    const def = gateRegistry.get(gate.typeId);

    // Per-output wire overrides: some gates drive certain outputs via 'assign' even
    // when the gate is isSynchronous/verilogAlwaysComb for other outputs (e.g. D-FF
    // drives q via always @(posedge) → reg, but q_n via assign → wire).
    const wireOutputIds = new Set(def.verilogWireOutputs ?? []);

    for (const out of def.outputs) {
      const k = `${gate.id}:${out.id}`;
      // Gates flagged with verilogSkipUnconnectedOutputs handle missing outputs in
      // their own toVerilog() (return a comment). For all other gates — including
      // custom-toVerilog gates that still use `?? w_${sid}_out` fallbacks internally
      // — we always emit a fallback declaration so those references are never undeclared
      // under `default_nettype none`.
      const wName = (def.toVerilog && def.verilogSkipUnconnectedOutputs)
        ? byPort[k]
        : byPort[k] ?? `w_${sanitize(gate.id)}_${out.id}`;
      if (!wName) continue; // flagged gate with unconnected output — nothing to declare
      const isProc = (def.isSynchronous || def.verilogAlwaysComb) && !wireOutputIds.has(out.id);

      // Track driver type for ALL signals — including those that are port names.
      // This is what makes output port typing correct regardless of gate order.
      if (isProc) procDriven.add(wName);

      // Internal signal declarations: only for signals that are not ports.
      if (!inputs.includes(wName) && !outputs.includes(wName)) {
        if (isProc) regs.add(wName);
        else        wires.add(wName);
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
      line = def.toVerilog(gate, byPort, constMap);
    } else {
      line = defaultGateVerilog(gate, byPort);
    }

    const indented = line.split('\n').map(l => '  ' + l).join('\n');
    (def.isSynchronous ? ffLines : gateLines).push(indented);
  }

  // ── Pass 3: Promote undeclared input signals to module input ports ────────────
  // Handles signals consumed by logic gates (e.g. the CLK wire from a CLOCK gate
  // which is excluded from EXCLUDE_FROM_VERILOG) that have no driver in this module.
  // Phase 0 already pre-populated nc_ names for unconnected pins, so this pass
  // predominantly catches wires from excluded gate types (CLOCK → FF clock input).
  for (const gate of Object.values(circuit.gates)) {
    if (EXCLUDE_FROM_VERILOG.has(gate.typeId) || !gateRegistry.has(gate.typeId)) continue;
    const def = gateRegistry.get(gate.typeId);
    for (const inp of def.inputs) {
      const wName = byPort[`${gate.id}:${inp.id}`];
      if (wName && !inputs.includes(wName) && !outputs.includes(wName)
          && !wires.has(wName) && !regs.has(wName)) {
        inputs.push(wName);
      }
    }
  }

  // Collect extra internal regs (shift registers in PISO4, ROM/RAM arrays).
  const extraVerilogRegs: { name: string; width: number; depth?: number; initData?: number[] }[] = [];
  for (const gate of Object.values(circuit.gates)) {
    if (EXCLUDE_FROM_VERILOG.has(gate.typeId) || !gateRegistry.has(gate.typeId)) continue;
    const def = gateRegistry.get(gate.typeId);
    if (def.verilogExtraRegs) {
      for (const reg of def.verilogExtraRegs(gate)) extraVerilogRegs.push(reg);
    }
  }

  // ── Build port declarations ───────────────────────────────────────────────────
  // Output port type is determined from procDriven (populated in Pass 2 for ALL
  // signals, not just internal ones), which is always correct because Pass 1 ensures
  // inputs[]/outputs[] are complete before Pass 2 runs.
  const portParts: string[] = [];
  for (const name of inputs)  portParts.push(`  input  wire ${name}`);
  for (const name of outputs) {
    portParts.push(`  output ${procDriven.has(name) ? 'reg ' : 'wire'} ${name}`);
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

  return `// ERROR: HDL export not implemented for ${gate.typeId} (${gate.id}) — add toVerilog() to gate definition`;
}
