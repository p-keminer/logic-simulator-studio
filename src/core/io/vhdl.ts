import type { Circuit, GateInstance } from '../types';
import { gateRegistry } from '../registry/GateRegistry';
import { sanitizeVHDL, makeUnique } from './identSanitize';

/** Fast sanitize for internal gate IDs (always safe — never keywords, never start with digit). */
function sanitize(id: string) {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

// Gate types that have no direct VHDL equivalent and should be excluded from logic
const EXCLUDE_FROM_VHDL = new Set([
  'CLOCK', 'PUSH_BTN', 'JUNCTION', 'TEXT_NOTE',
  'SEG7', 'SEG7_BCD', 'SEG7_DUAL', 'SEG7_BCD_2',
  'DOTMATRIX8', 'STEPPER_VIZ', 'ADC8',
  'CUSTOM_IC',
]);

/** Renders extra VHDL signal/constant declarations, supporting arrays (ROM constants, RAM signals). */
function renderVHDLExtraSignals(
  sigs: { name: string; width: number; depth?: number; initData?: number[] }[]
): string[] {
  const lines: string[] = [];
  for (const { name, width, depth, initData } of sigs) {
    if (depth !== undefined) {
      const nibbles = Math.ceil(width / 4);
      const typeName = `t_${name}`;
      lines.push(`  type ${typeName} is array (0 to ${depth - 1}) of STD_LOGIC_VECTOR(${width - 1} downto 0);`);
      if (initData) {
        // ROM: declare as constant with actual data (only non-zero entries + others)
        const nonZero = Array.from({ length: depth }, (_, i) => [i, initData[i] ?? 0] as const)
          .filter(([, v]) => v !== 0);
        const entries = [
          ...nonZero.map(([i, v]) =>
            `    ${i} => x"${v.toString(16).toUpperCase().padStart(nibbles, '0')}"`
          ),
          `    others => x"${'0'.repeat(nibbles)}"`,
        ];
        lines.push(`  constant ${name} : ${typeName} := (`);
        lines.push(entries.join(',\n'));
        lines.push(`  );`);
      } else {
        // RAM: declare as signal, initialized to all zeros
        lines.push(`  signal ${name} : ${typeName} := (others => (others => '0'));`);
      }
    } else {
      lines.push(`  signal ${name} : STD_LOGIC_VECTOR(${width - 1} downto 0) := (others => '0');`);
    }
  }
  return lines;
}

/** Convert a port label to a safe VHDL identifier (strips leading /, sanitizes). */
function portIdent(label: string | undefined, fallback: string): string {
  const raw = (label ?? fallback).replace(/^\/+/, 'n'); // /OE → nOE
  return sanitizeVHDL(raw, 'signal') || sanitizeVHDL(fallback, 'signal');
}

function buildPortMap(circuit: Circuit) {
  const byPort: Record<string, string> = {};
  // Track assigned port names to guarantee uniqueness after sanitizing.
  const usedPortNames = new Set<string>();
  let swIdx = 0, wIdx = 0, ledIdx = 0;

  for (const gate of Object.values(circuit.gates)) {
    if (gate.typeId === 'INPUT_SWITCH') {
      const raw  = gate.label ? sanitizeVHDL(gate.label, 'signal') : `sw_${swIdx++}`;
      byPort[`${gate.id}:out`] = makeUnique(raw, usedPortNames);
    }
  }
  for (const wire of Object.values(circuit.wires)) {
    const fromKey = `${wire.from.gateId}:${wire.from.portId}`;
    if (!byPort[fromKey]) byPort[fromKey] = `w_${wIdx++}`;
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
  for (const gate of Object.values(circuit.gates)) {
    if (gate.typeId === 'OUTPUT_LED') {
      const k = `${gate.id}:in`;
      if (!byPort[k]) {
        const raw  = gate.label ? sanitizeVHDL(gate.label, 'signal') : `led_${ledIdx++}`;
        byPort[k] = makeUnique(raw, usedPortNames);
      }
    }
  }
  return byPort;
}

const VHDL_PRIM: Record<string, string> = {
  AND: 'and', OR: 'or', NOT: 'not', NAND: 'nand', NOR: 'nor',
  XOR: 'xor', XNOR: 'xnor',
  AND3: 'and', AND4: 'and', OR3: 'or', OR4: 'or',
  NAND3: 'nand', NAND4: 'nand', NOR3: 'nor', NOR4: 'nor', XOR3: 'xor',
};

export function generateVHDL(circuit: Circuit): string {
  const entityName = sanitizeVHDL(circuit.name || 'circuit', 'entity');
  const byPort = buildPortMap(circuit);

  // Phase 0: Pre-populate byPort for unconnected gate input pins.
  // Same rationale as in verilog.ts: prevents VHDL literal constants ('0') from
  // appearing in sensitivity lists and process conditions.
  // Unconnected pins become entity input ports via Bug-fix-1 below.
  // Collision guard: same as verilog.ts — numeric suffix on duplicate base names.
  {
    const usedNcNames = new Set<string>(Object.values(byPort));
    for (const gate of Object.values(circuit.gates)) {
      if (gate.typeId === 'INPUT_SWITCH' || gate.typeId === 'OUTPUT_LED') continue;
      if (EXCLUDE_FROM_VHDL.has(gate.typeId) || !gateRegistry.has(gate.typeId)) continue;
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

  const inputs: string[]  = [];
  const outputs: string[] = [];
  const signals = new Set<string>();
  const logic: string[]   = [];
  const ffLogic: string[] = [];

  // ── Pass 1A: Entity-Ports sammeln (muss vollständig sein, bevor Signale bestimmt werden) ──
  // Object.values() hat keine garantierte Reihenfolge. Würde man Ports und Signale in einer
  // einzigen Schleife sammeln, könnte ein internes Gate (z. B. FF) vor dem OUTPUT_LED
  // verarbeitet werden: outputs[] ist dann noch leer, der Guard !outputs.includes(s) greift
  // nicht, und das spätere Out-Port-Signal landet doppelt — als `signal` UND als `out STD_LOGIC`.
  for (const gate of Object.values(circuit.gates)) {
    if (gate.typeId === 'INPUT_SWITCH') {
      inputs.push(byPort[`${gate.id}:out`] ?? `sw_${gate.id}`);
    } else if (gate.typeId === 'OUTPUT_LED') {
      outputs.push(byPort[`${gate.id}:in`] ?? `led_${gate.id}`);
    }
  }

  // ── Multi-driver guard ─────────────────────────────────────────────────────────
  // If any signal appears as both input and output port, the circuit has a
  // multi-driver conflict that cannot be represented as valid HDL. Return a
  // clearly-marked stub instead of generating broken code.
  {
    const conflicts = inputs.filter(n => outputs.includes(n));
    if (conflicts.length > 0) {
      const note = conflicts.map(c => `-- conflicting signal: "${c}"`).join('\n');
      return [
        `-- Generated by LogicSim`,
        `-- HDL EXPORT BLOCKED — multi-driver port conflict`,
        `-- The following signal(s) appear as both input and output port:`,
        note,
        `-- Each destination port must have exactly one driver.`,
        `-- Resolve bus contention before exporting to HDL.`,
        ``,
        `library IEEE;`,
        `use IEEE.STD_LOGIC_1164.ALL;`,
        ``,
        `entity ${entityName} is`,
        `  -- no ports — export blocked due to multi-driver conflict`,
        `end ${entityName};`,
        ``,
        `architecture Behavioral of ${entityName} is`,
        `begin`,
        `  -- no logic — export blocked due to multi-driver conflict`,
        `end Behavioral;`,
      ].join('\n');
    }
  }

  // ── Pass 1B: Interne Signale sammeln (inputs[] und outputs[] jetzt vollständig) ──────────
  for (const gate of Object.values(circuit.gates)) {
    if (
      gate.typeId === 'INPUT_SWITCH' ||
      gate.typeId === 'OUTPUT_LED'   ||
      EXCLUDE_FROM_VHDL.has(gate.typeId) ||
      !gateRegistry.has(gate.typeId)
    ) continue;
    const def = gateRegistry.get(gate.typeId);
    for (const out of def.outputs) {
      const k = `${gate.id}:${out.id}`;
      // Gates flagged with vhdlSkipUnconnectedOutputs handle missing outputs in
      // their own toVHDL() (return a comment). All other gates — including
      // custom-toVHDL gates that still use `?? w_${sid}_out` fallbacks — always
      // get a fallback signal declaration so internal references are never undeclared.
      const s = (def.toVHDL && def.vhdlSkipUnconnectedOutputs)
        ? byPort[k]
        : byPort[k] ?? `w_${sanitize(gate.id)}_${out.id}`;
      if (!s) continue; // flagged gate with unconnected output — nothing to declare
      if (!inputs.includes(s) && !outputs.includes(s)) signals.add(s);
    }
  }

  // ── Pass 1C: Zusätzliche interne Signale (z.B. Schieberegister in PISO4) ────────────────
  const extraVHDLSignals: { name: string; width: number; depth?: number; initData?: number[] }[] = [];
  for (const gate of Object.values(circuit.gates)) {
    if (EXCLUDE_FROM_VHDL.has(gate.typeId) || !gateRegistry.has(gate.typeId)) continue;
    const def = gateRegistry.get(gate.typeId);
    if (def.vhdlExtraSignals) {
      for (const sig of def.vhdlExtraSignals(gate)) {
        extraVHDLSignals.push(sig);
      }
    }
  }

  // ── Bug fix 1: undeclared signals used by logic gates (e.g. CLOCK → process)
  // must appear as entity input ports.
  for (const gate of Object.values(circuit.gates)) {
    if (EXCLUDE_FROM_VHDL.has(gate.typeId) || !gateRegistry.has(gate.typeId)) continue;
    const def = gateRegistry.get(gate.typeId);
    for (const inp of def.inputs) {
      const wName = byPort[`${gate.id}:${inp.id}`];
      if (wName && !inputs.includes(wName) && !outputs.includes(wName) && !signals.has(wName)) {
        inputs.push(wName);
      }
    }
  }

  // ── Bug fix 2: VHDL pre-2008 forbids reading 'out' ports.
  // FF outputs that are entity out-ports need a readable internal signal (_q).
  // The process uses the _q signal; a concurrent assignment drives the port.
  const ffByPort = { ...byPort };      // modified port map used only for FF code generation
  const qAssignments: string[] = [];   // e.g. "  w_1 <= w_1_q;"

  for (const gate of Object.values(circuit.gates)) {
    if (EXCLUDE_FROM_VHDL.has(gate.typeId) || !gateRegistry.has(gate.typeId)) continue;
    const def = gateRegistry.get(gate.typeId);

    for (const out of def.outputs) {
      const s = byPort[`${gate.id}:${out.id}`];
      if (!s || !outputs.includes(s)) continue; // only affected when the signal is an out port

      const qName = `${s}_q`;
      if (signals.has(qName)) continue; // already handled (e.g. two FFs driving same output)

      // Redirect every byPort entry that resolves to this out-port signal to the _q variant
      for (const k of Object.keys(ffByPort)) {
        if (ffByPort[k] === s) ffByPort[k] = qName;
      }
      signals.add(qName);
      qAssignments.push(`  ${s} <= ${qName};`);
    }
  }

  // ── Pass 2: generate logic using the correct port map per gate type ────────
  for (const gate of Object.values(circuit.gates)) {
    if (
      gate.typeId === 'INPUT_SWITCH' ||
      gate.typeId === 'OUTPUT_LED'   ||
      EXCLUDE_FROM_VHDL.has(gate.typeId) ||
      !gateRegistry.has(gate.typeId)
    ) continue;

    const def     = gateRegistry.get(gate.typeId);
    // ffByPort leitet FF-Ausgangs-Out-Ports auf Shadow-Signale (_q) um.
    // Gilt für ALLE Gates: auch kombinatorische Gates (z.B. XOR) dürfen
    // keinen VHDL-Out-Port als Eingang lesen — sie müssen das Shadow-Signal nutzen.
    const portMap = ffByPort;

    let line: string;
    if (gate.typeId === 'CONST_HIGH') {
      const s = portMap[`${gate.id}:out`];
      line = s ? `${s} <= '1'; -- CONST_HIGH` : '-- CONST_HIGH (unconnected)';
    } else if (gate.typeId === 'CONST_LOW') {
      const s = portMap[`${gate.id}:out`];
      line = s ? `${s} <= '0'; -- CONST_LOW` : '-- CONST_LOW (unconnected)';
    } else if (def.toVHDL) {
      line = def.toVHDL(gate, portMap, constMap);
    } else {
      line = defaultGateVHDL(gate, portMap);
    }

    const indented = line.split('\n').map(l => '  ' + l).join('\n');
    (def.isSynchronous ? ffLogic : logic).push(indented);
  }

  // ── Assemble output ───────────────────────────────────────────────────────
  const portLines: string[] = [
    ...inputs.map((n)  => `    ${n} : in STD_LOGIC`),
    ...outputs.map((n) => `    ${n} : out STD_LOGIC`),
  ];

  const lines = [
    `-- Generated by LogicSim`,
    `-- VHDL-2002 — bit 0 = LSB`,
    ``,
    `library IEEE;`,
    `use IEEE.STD_LOGIC_1164.ALL;`,
    `use IEEE.NUMERIC_STD.ALL;`,
    ``,
    `entity ${entityName} is`,
    ...(portLines.length > 0
      ? [`  Port (`, portLines.join(';\n'), `  );`]
      : [`  -- no ports`]
    ),
    `end ${entityName};`,
    ``,
    `architecture Behavioral of ${entityName} is`,
    ...(signals.size > 0
      ? [...signals].map((s) => `  signal ${s} : STD_LOGIC := '0';`)
      : ['  -- no internal signals']),
    ...renderVHDLExtraSignals(extraVHDLSignals),
    `begin`,
    ``,
    ...(logic.length > 0 ? [...logic, ``] : []),
    ...(qAssignments.length > 0 ? [...qAssignments, ``] : []),
    ...(ffLogic.length > 0 ? [
      `  -- Sequential / registered logic`,
      ...ffLogic,
      ``,
    ] : []),
    `end Behavioral;`,
  ];

  return lines.join('\n');
}

function defaultGateVHDL(gate: GateInstance, byPort: Record<string, string>): string {
  const def = gateRegistry.get(gate.typeId);
  const prim = VHDL_PRIM[gate.typeId];
  const outs = def.outputs.map((p) => byPort[`${gate.id}:${p.id}`] ?? `w_${sanitize(gate.id)}_${p.id}`);
  const ins  = def.inputs.map((p)  => byPort[`${gate.id}:${p.id}`] ?? `'0'`);

  if (gate.typeId === 'NOT') {
    return `${outs[0]} <= not ${ins[0]}; -- ${gate.id}`;
  }
  if (gate.typeId === 'BUFFER') {
    return `${outs[0]} <= ${ins[0]}; -- BUFFER ${gate.id}`;
  }

  if (!prim) {
    return `-- ERROR: HDL export not implemented for ${gate.typeId} (${gate.id}) — add toVHDL() to gate definition`;
  }

  // NAND/NOR cannot be chained in IEEE 1076; decompose into not(and/or ...).
  if (gate.typeId === 'NAND3' || gate.typeId === 'NAND4') {
    return `${outs[0]} <= not (${ins.join(' and ')}); -- ${gate.id}`;
  }
  if (gate.typeId === 'NOR3' || gate.typeId === 'NOR4') {
    return `${outs[0]} <= not (${ins.join(' or ')}); -- ${gate.id}`;
  }

  return `${outs[0]} <= ${ins.join(` ${prim} `)}; -- ${gate.id}`;
}
