import type { Circuit, GateInstance } from '../types';
import { gateRegistry } from '../registry/GateRegistry';

function sanitize(id: string) {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

// Gate types that have no direct VHDL equivalent and should be excluded from logic
const EXCLUDE_FROM_VHDL = new Set([
  'CLOCK', 'PUSH_BTN', 'JUNCTION', 'TEXT_NOTE',
  'OUTPUT_LED_7SEG', 'DOT_MATRIX', 'STEPPER_MOTOR', 'ADC8',
  'ROM256', 'RAM256', 'CUSTOM_IC',
]);

function buildPortMap(circuit: Circuit) {
  const byPort: Record<string, string> = {};
  let swIdx = 0, wIdx = 0, ledIdx = 0;

  for (const gate of Object.values(circuit.gates)) {
    if (gate.typeId === 'INPUT_SWITCH') {
      byPort[`${gate.id}:out`] = gate.label ? sanitize(gate.label) : `sw_${swIdx++}`;
    }
  }
  for (const wire of Object.values(circuit.wires)) {
    const fromKey = `${wire.from.gateId}:${wire.from.portId}`;
    if (!byPort[fromKey]) byPort[fromKey] = `w_${wIdx++}`;
    byPort[`${wire.to.gateId}:${wire.to.portId}`] = byPort[fromKey];
  }
  for (const gate of Object.values(circuit.gates)) {
    if (gate.typeId === 'OUTPUT_LED') {
      const k = `${gate.id}:in`;
      if (!byPort[k]) byPort[k] = gate.label ? sanitize(gate.label) : `led_${ledIdx++}`;
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
  const entityName = sanitize(circuit.name) || 'circuit';
  const byPort = buildPortMap(circuit);

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
      const s = byPort[k] ?? `w_${sanitize(gate.id)}_${out.id}`;
      if (!inputs.includes(s) && !outputs.includes(s)) signals.add(s);
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
      line = def.toVHDL(gate, portMap);
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
    `-- ${new Date().toISOString()}`,
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

  if (!prim) {
    return `-- ${gate.typeId} (${gate.id}): manual VHDL implementation required`;
  }

  if (gate.typeId === 'NOT') {
    return `${outs[0]} <= not ${ins[0]}; -- ${gate.id}`;
  }
  if (gate.typeId === 'BUFFER') {
    return `${outs[0]} <= ${ins[0]}; -- BUFFER ${gate.id}`;
  }

  return `${outs[0]} <= ${ins.join(` ${prim} `)}; -- ${gate.id}`;
}
