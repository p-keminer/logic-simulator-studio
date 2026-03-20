/**
 * HDL Export Tests -- Verilog and VHDL generators
 *
 * Tests structural correctness of generated code from `generateVerilog`
 * and `generateVHDL`, as well as identifier sanitization utilities.
 */
import { describe, it, expect } from 'vitest';

// Register all gates before importing generators
import '../../core/registry/index';

import { generateVerilog } from '../../core/io/verilog';
import { generateVHDL } from '../../core/io/vhdl';
import { sanitizeVerilog, sanitizeVHDL, makeUnique } from '../../core/io/identSanitize';
import type { Circuit, GateInstance, Wire, SignalState } from '../../core/types';
import { synthesizeFsm } from '../../fsm/synthesis/synthesize';
import type { FsmMachine } from '../../fsm/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultSignal: SignalState = { value: 0, version: 0, lastChangedAt: 0 };

function makeGate(
  id: string,
  typeId: string,
  x = 0,
  y = 0,
  opts?: { customState?: Record<string, unknown>; label?: string },
): GateInstance {
  return {
    id,
    typeId,
    x,
    y,
    outputSignals: {},
    customState: opts?.customState ?? {},
    isSelected: false,
    label: opts?.label,
  };
}

function makeWire(
  id: string,
  fromGate: string,
  fromPort: string,
  toGate: string,
  toPort: string,
): Wire {
  return {
    id,
    from: { gateId: fromGate, portId: fromPort },
    to: { gateId: toGate, portId: toPort },
    waypoints: [],
    signal: { ...defaultSignal },
    isSelected: false,
  };
}

function makeCircuit(
  name: string,
  gates: GateInstance[],
  wires: Wire[],
): Circuit {
  return {
    id: 'test-circuit',
    name,
    version: '1.0',
    gates: Object.fromEntries(gates.map(g => [g.id, g])),
    wires: Object.fromEntries(wires.map(w => [w.id, w])),
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  };
}

function emptyCircuit(name = 'fsm_export_test'): Circuit {
  return makeCircuit(name, [], []);
}

function makeExportFsm(): FsmMachine {
  return {
    id: 'fsm-export-test',
    name: 'Export Test FSM',
    archType: 'moore',
    inputCount: 1,
    inputNames: ['A'],
    outputCount: 1,
    outputNames: ['Y'],
    states: {
      s0: { id: 's0', label: 'S0', x: 100, y: 100, isInitial: true, output: 0 },
      s1: { id: 's1', label: 'S1', x: 300, y: 100, isInitial: false, output: 1 },
    },
    transitions: [
      { id: 't0', fromId: 's0', toId: 's1', conditionText: 'A', mealyOutput: 0 },
      { id: 't1', fromId: 's1', toId: 's0', conditionText: '!A', mealyOutput: 0 },
    ],
  };
}

// ---------------------------------------------------------------------------
// 1. Basic AND gate circuit -- Verilog
// ---------------------------------------------------------------------------
describe('Basic AND gate -- Verilog', () => {
  const circuit = makeCircuit('and_test', [
    makeGate('sw_a', 'INPUT_SWITCH', 0, 0, { label: 'a' }),
    makeGate('sw_b', 'INPUT_SWITCH', 0, 60, { label: 'b' }),
    makeGate('g_and', 'AND', 120, 30),
    makeGate('led0', 'OUTPUT_LED', 240, 30),
  ], [
    makeWire('w1', 'sw_a', 'out', 'g_and', 'a'),
    makeWire('w2', 'sw_b', 'out', 'g_and', 'b'),
    makeWire('w3', 'g_and', 'out', 'led0', 'in'),
  ]);

  const verilog = generateVerilog(circuit);

  it('contains module declaration', () => {
    expect(verilog).toContain('module');
    expect(verilog).toMatch(/module\s+and_test/);
  });

  it('contains input declarations', () => {
    expect(verilog).toContain('input');
    expect(verilog).toMatch(/input\s+wire\s+a/);
    expect(verilog).toMatch(/input\s+wire\s+b/);
  });

  it('contains output declaration', () => {
    expect(verilog).toContain('output');
  });

  it('uses Verilog and primitive for AND gate', () => {
    // defaultGateVerilog maps AND -> `and` primitive
    expect(verilog).toMatch(/\band\b/);
  });

  it('contains endmodule', () => {
    expect(verilog).toContain('endmodule');
  });
});

// ---------------------------------------------------------------------------
// 2. Basic AND gate circuit -- VHDL
// ---------------------------------------------------------------------------
describe('Basic AND gate -- VHDL', () => {
  const circuit = makeCircuit('and_test', [
    makeGate('sw_a', 'INPUT_SWITCH', 0, 0, { label: 'a' }),
    makeGate('sw_b', 'INPUT_SWITCH', 0, 60, { label: 'b' }),
    makeGate('g_and', 'AND', 120, 30),
    makeGate('led0', 'OUTPUT_LED', 240, 30),
  ], [
    makeWire('w1', 'sw_a', 'out', 'g_and', 'a'),
    makeWire('w2', 'sw_b', 'out', 'g_and', 'b'),
    makeWire('w3', 'g_and', 'out', 'led0', 'in'),
  ]);

  const vhdl = generateVHDL(circuit);

  it('contains entity declaration', () => {
    expect(vhdl).toContain('entity');
    expect(vhdl).toMatch(/entity\s+and_test\s+is/);
  });

  it('contains architecture declaration', () => {
    expect(vhdl).toContain('architecture');
    expect(vhdl).toMatch(/architecture\s+Behavioral\s+of\s+and_test/);
  });

  it('contains port declaration', () => {
    expect(vhdl).toMatch(/Port\s*\(/i);
  });

  it('contains signal or port entries', () => {
    // inputs appear as `in STD_LOGIC` ports
    expect(vhdl).toMatch(/a\s*:\s*in\s+STD_LOGIC/);
    expect(vhdl).toMatch(/b\s*:\s*in\s+STD_LOGIC/);
  });

  it('uses VHDL and operator', () => {
    expect(vhdl).toMatch(/\band\b/);
  });

  it('ends with end Behavioral', () => {
    expect(vhdl).toContain('end Behavioral;');
  });
});

// ---------------------------------------------------------------------------
// 3. NOT gate -- both formats
// ---------------------------------------------------------------------------
describe('NOT gate -- Verilog', () => {
  const circuit = makeCircuit('not_test', [
    makeGate('sw0', 'INPUT_SWITCH', 0, 0, { label: 'x' }),
    makeGate('g_not', 'NOT', 100, 0),
    makeGate('led0', 'OUTPUT_LED', 200, 0),
  ], [
    makeWire('w1', 'sw0', 'out', 'g_not', 'a'),
    makeWire('w2', 'g_not', 'out', 'led0', 'in'),
  ]);

  const verilog = generateVerilog(circuit);

  it('uses Verilog not primitive', () => {
    // defaultGateVerilog maps NOT -> `not` primitive
    expect(verilog).toMatch(/\bnot\b/);
  });
});

describe('NOT gate -- VHDL', () => {
  const circuit = makeCircuit('not_test', [
    makeGate('sw0', 'INPUT_SWITCH', 0, 0, { label: 'x' }),
    makeGate('g_not', 'NOT', 100, 0),
    makeGate('led0', 'OUTPUT_LED', 200, 0),
  ], [
    makeWire('w1', 'sw0', 'out', 'g_not', 'a'),
    makeWire('w2', 'g_not', 'out', 'led0', 'in'),
  ]);

  const vhdl = generateVHDL(circuit);

  it('uses VHDL not operator', () => {
    expect(vhdl).toMatch(/<=\s*not\s+/);
  });
});

// ---------------------------------------------------------------------------
// 4. D-FF -- Verilog
// ---------------------------------------------------------------------------
describe('D-FF -- Verilog', () => {
  const circuit = makeCircuit('dff_test', [
    makeGate('sw_d', 'INPUT_SWITCH', 0, 0, { label: 'd_in' }),
    makeGate('clk0', 'CLOCK', 0, 60),
    makeGate('dff', 'D_FF', 120, 0),
    makeGate('led0', 'OUTPUT_LED', 240, 0),
  ], [
    makeWire('w1', 'sw_d', 'out', 'dff', 'd'),
    makeWire('w2', 'clk0', 'clk', 'dff', 'clk'),
    makeWire('w3', 'dff', 'q', 'led0', 'in'),
  ]);

  const verilog = generateVerilog(circuit);

  it('contains posedge clocking', () => {
    expect(verilog).toMatch(/always\s+@\(posedge\b/);
  });

  it('uses non-blocking assignment', () => {
    expect(verilog).toMatch(/<=/);
  });

  it('has output reg for Q (synchronous driver)', () => {
    expect(verilog).toMatch(/output\s+reg\b/);
  });
});

// ---------------------------------------------------------------------------
// 5. D-FF -- VHDL
// ---------------------------------------------------------------------------
describe('D-FF -- VHDL', () => {
  const circuit = makeCircuit('dff_test', [
    makeGate('sw_d', 'INPUT_SWITCH', 0, 0, { label: 'd_in' }),
    makeGate('clk0', 'CLOCK', 0, 60),
    makeGate('dff', 'D_FF', 120, 0),
    makeGate('led0', 'OUTPUT_LED', 240, 0),
  ], [
    makeWire('w1', 'sw_d', 'out', 'dff', 'd'),
    makeWire('w2', 'clk0', 'clk', 'dff', 'clk'),
    makeWire('w3', 'dff', 'q', 'led0', 'in'),
  ]);

  const vhdl = generateVHDL(circuit);

  it('contains rising_edge', () => {
    expect(vhdl).toContain('rising_edge');
  });

  it('contains process block', () => {
    expect(vhdl).toMatch(/\bprocess\b/);
    expect(vhdl).toContain('end process;');
  });

  it('contains library and use declarations', () => {
    expect(vhdl).toContain('library IEEE;');
    expect(vhdl).toContain('use IEEE.STD_LOGIC_1164.ALL;');
  });
});

// ---------------------------------------------------------------------------
// 5b. Synthesized multi-FSM export keeps canonical top-level signal names
// ---------------------------------------------------------------------------
describe('Synthesized multi-FSM exports keep canonical top-level names', () => {
  const first = synthesizeFsm(makeExportFsm(), emptyCircuit());
  const firstCircuit: Circuit = {
    ...emptyCircuit('fsm_export_first'),
    gates: first.gates,
    wires: first.wires,
  };
  const second = synthesizeFsm(makeExportFsm(), firstCircuit);
  const combined: Circuit = {
    ...emptyCircuit('fsm_export_multi'),
    gates: { ...first.gates, ...second.gates },
    wires: { ...first.wires, ...second.wires },
  };

  const verilog = generateVerilog(combined);
  const vhdl = generateVHDL(combined);

  it('Verilog keeps clock ports canonical across multiple synthesized FSMs', () => {
    expect(verilog).toMatch(/input\s+wire\s+CLK\b/);
    expect(verilog).toMatch(/input\s+wire\s+CLK_1\b/);
    expect(verilog).not.toMatch(/input\s+wire\s+w_\d+\b/);
  });

  it('Verilog keeps projected state and output ports canonical across multiple synthesized FSMs', () => {
    expect(verilog).toMatch(/output\s+reg\s+Q0\b/);
    expect(verilog).toMatch(/output\s+reg\s+Q0_1\b/);
    expect(verilog).toMatch(/output\s+wire\s+Y\b/);
    expect(verilog).toMatch(/output\s+wire\s+Y_1\b/);
    expect(verilog).not.toMatch(/output\s+(?:reg|wire)\s+w_\d+\b/);
  });

  it('VHDL keeps clock ports canonical across multiple synthesized FSMs', () => {
    expect(vhdl).toMatch(/CLK\s*:\s*in\s+STD_LOGIC/);
    expect(vhdl).toMatch(/CLK_1\s*:\s*in\s+STD_LOGIC/);
    expect(vhdl).not.toMatch(/w_\d+\s*:\s*in\s+STD_LOGIC/);
  });

  it('VHDL keeps projected state and output ports canonical across multiple synthesized FSMs', () => {
    expect(vhdl).toMatch(/Q0\s*:\s*out\s+STD_LOGIC/);
    expect(vhdl).toMatch(/Q0_1\s*:\s*out\s+STD_LOGIC/);
    expect(vhdl).toMatch(/Y\s*:\s*out\s+STD_LOGIC/);
    expect(vhdl).toMatch(/Y_1\s*:\s*out\s+STD_LOGIC/);
    expect(vhdl).not.toMatch(/w_\d+\s*:\s*out\s+STD_LOGIC/);
  });
});

// ---------------------------------------------------------------------------
// 6. Excluded gates produce no output
// ---------------------------------------------------------------------------
describe('Excluded gates produce no logic output', () => {
  it('SEG7 is excluded from Verilog', () => {
    const circuit = makeCircuit('excl_test', [
      makeGate('seg', 'SEG7', 0, 0),
    ], []);
    const verilog = generateVerilog(circuit);
    // Should have no gate logic (no assign, no always)
    expect(verilog).not.toMatch(/\bassign\b/);
    expect(verilog).not.toMatch(/\balways\b/);
  });

  it('DOTMATRIX8 is excluded from VHDL', () => {
    const circuit = makeCircuit('excl_test', [
      makeGate('dm', 'DOTMATRIX8', 0, 0),
    ], []);
    const vhdl = generateVHDL(circuit);
    // Should have no concurrent signal assignments from DOTMATRIX8
    expect(vhdl).not.toMatch(/DOTMATRIX8/);
  });

  it('STEPPER_VIZ is excluded from Verilog', () => {
    const circuit = makeCircuit('excl_test', [
      makeGate('sv', 'STEPPER_VIZ', 0, 0),
    ], []);
    const verilog = generateVerilog(circuit);
    expect(verilog).not.toMatch(/STEPPER_VIZ/);
    expect(verilog).not.toMatch(/\bassign\b/);
  });

  it('circuit with only excluded gates produces valid but empty module', () => {
    const circuit = makeCircuit('empty_mod', [
      makeGate('seg', 'SEG7', 0, 0),
      makeGate('dm', 'DOTMATRIX8', 0, 50),
      makeGate('sv', 'STEPPER_VIZ', 0, 100),
    ], []);
    const verilog = generateVerilog(circuit);
    expect(verilog).toContain('module empty_mod');
    expect(verilog).toContain('endmodule');
  });
});

// ---------------------------------------------------------------------------
// 7. Unconnected inputs use nc_ naming
// ---------------------------------------------------------------------------
describe('Unconnected inputs use nc_ naming', () => {
  it('AND gate with one disconnected input has nc_ signal -- Verilog', () => {
    const circuit = makeCircuit('nc_test', [
      makeGate('sw0', 'INPUT_SWITCH', 0, 0, { label: 'x' }),
      makeGate('g_and', 'AND', 100, 0),
      makeGate('led0', 'OUTPUT_LED', 200, 0),
    ], [
      makeWire('w1', 'sw0', 'out', 'g_and', 'a'),
      // b is NOT connected
      makeWire('w3', 'g_and', 'out', 'led0', 'in'),
    ]);

    const verilog = generateVerilog(circuit);
    // Unconnected input 'b' (label 'B') should generate nc_B
    expect(verilog).toMatch(/nc_/);
  });

  it('AND gate with one disconnected input has nc_ signal -- VHDL', () => {
    const circuit = makeCircuit('nc_test', [
      makeGate('sw0', 'INPUT_SWITCH', 0, 0, { label: 'x' }),
      makeGate('g_and', 'AND', 100, 0),
      makeGate('led0', 'OUTPUT_LED', 200, 0),
    ], [
      makeWire('w1', 'sw0', 'out', 'g_and', 'a'),
      // b is NOT connected
      makeWire('w3', 'g_and', 'out', 'led0', 'in'),
    ]);

    const vhdl = generateVHDL(circuit);
    expect(vhdl).toMatch(/nc_/);
  });
});

// ---------------------------------------------------------------------------
// 8. Identifier sanitization
// ---------------------------------------------------------------------------
describe('Identifier sanitization', () => {
  describe('sanitizeVerilog', () => {
    it('prefixes Verilog keyword "module" with n_', () => {
      expect(sanitizeVerilog('module', 'signal')).toBe('n_module');
    });

    it('prefixes Verilog keyword "wire" with n_', () => {
      expect(sanitizeVerilog('wire', 'signal')).toBe('n_wire');
    });

    it('prefixes Verilog keyword "assign" with n_', () => {
      expect(sanitizeVerilog('assign', 'signal')).toBe('n_assign');
    });

    it('handles module-kind digit prefix', () => {
      expect(sanitizeVerilog('123abc', 'module')).toBe('m_123abc');
    });

    it('handles signal-kind digit prefix', () => {
      expect(sanitizeVerilog('7seg', 'signal')).toBe('n_7seg');
    });

    it('replaces special characters with underscores', () => {
      expect(sanitizeVerilog('a-b+c')).toBe('a_b_c');
    });

    it('strips leading underscores', () => {
      expect(sanitizeVerilog('__test')).toBe('test');
    });

    it('empty string returns fallback', () => {
      const result = sanitizeVerilog('');
      expect(result).toBeTruthy(); // should return 'n_x' or similar fallback
    });

    it('Verilog is case-sensitive: "Module" is NOT a keyword', () => {
      expect(sanitizeVerilog('Module', 'signal')).toBe('Module');
    });
  });

  describe('sanitizeVHDL', () => {
    it('prefixes VHDL keyword "signal" with n_', () => {
      expect(sanitizeVHDL('signal', 'signal')).toBe('n_signal');
    });

    it('prefixes VHDL keyword "process" with n_', () => {
      expect(sanitizeVHDL('process', 'signal')).toBe('n_process');
    });

    it('prefixes VHDL keyword "entity" with n_', () => {
      expect(sanitizeVHDL('entity', 'entity')).toBe('n_entity');
    });

    it('is case-insensitive: "SIGNAL" is a keyword too', () => {
      expect(sanitizeVHDL('SIGNAL', 'signal')).toBe('n_SIGNAL');
    });

    it('handles entity-kind digit prefix', () => {
      expect(sanitizeVHDL('1circuit', 'entity')).toBe('m_1circuit');
    });

    it('replaces special characters', () => {
      expect(sanitizeVHDL('a.b/c')).toBe('a_b_c');
    });
  });

  describe('makeUnique', () => {
    it('returns name as-is when no collision', () => {
      const used = new Set<string>();
      expect(makeUnique('foo', used)).toBe('foo');
      expect(used.has('foo')).toBe(true);
    });

    it('appends _2 on first collision', () => {
      const used = new Set(['foo']);
      expect(makeUnique('foo', used)).toBe('foo_2');
      expect(used.has('foo_2')).toBe(true);
    });

    it('appends _3 on second collision', () => {
      const used = new Set(['foo', 'foo_2']);
      expect(makeUnique('foo', used)).toBe('foo_3');
    });

    it('keeps incrementing on repeated collisions', () => {
      const used = new Set(['bar', 'bar_2', 'bar_3']);
      expect(makeUnique('bar', used)).toBe('bar_4');
    });
  });
});

// ---------------------------------------------------------------------------
// 9. Multi-gate circuit (2 switches -> AND -> OR with another switch -> LED)
// ---------------------------------------------------------------------------
describe('Multi-gate circuit -- Verilog', () => {
  const circuit = makeCircuit('multi_test', [
    makeGate('sw_a', 'INPUT_SWITCH', 0, 0, { label: 'a' }),
    makeGate('sw_b', 'INPUT_SWITCH', 0, 60, { label: 'b' }),
    makeGate('sw_c', 'INPUT_SWITCH', 0, 120, { label: 'c' }),
    makeGate('g_and', 'AND', 120, 30),
    makeGate('g_or', 'OR', 240, 60),
    makeGate('led0', 'OUTPUT_LED', 360, 60),
  ], [
    makeWire('w1', 'sw_a', 'out', 'g_and', 'a'),
    makeWire('w2', 'sw_b', 'out', 'g_and', 'b'),
    makeWire('w3', 'g_and', 'out', 'g_or', 'a'),
    makeWire('w4', 'sw_c', 'out', 'g_or', 'b'),
    makeWire('w5', 'g_or', 'out', 'led0', 'in'),
  ]);

  const verilog = generateVerilog(circuit);
  const vhdl = generateVHDL(circuit);

  it('Verilog contains both AND and OR primitives', () => {
    expect(verilog).toMatch(/\band\s+g_/);
    expect(verilog).toMatch(/\bor\s+g_/);
  });

  it('Verilog declares internal wire for AND output', () => {
    // The AND output is an internal wire (not a port)
    expect(verilog).toMatch(/\bwire\b/);
  });

  it('Verilog has three input ports', () => {
    const inputMatches = verilog.match(/input\s+wire\s+\w+/g) ?? [];
    expect(inputMatches.length).toBe(3);
  });

  it('VHDL contains both and/or operators', () => {
    // The VHDL default gate uses the operator in signal assignment
    expect(vhdl).toMatch(/\band\b/);
    expect(vhdl).toMatch(/\bor\b/);
  });

  it('VHDL declares internal signal', () => {
    expect(vhdl).toMatch(/\bsignal\b/);
  });
});

// ---------------------------------------------------------------------------
// 10. JK-FF -- Verilog
// ---------------------------------------------------------------------------
describe('JK-FF -- Verilog', () => {
  const circuit = makeCircuit('jkff_test', [
    makeGate('sw_j', 'INPUT_SWITCH', 0, 0, { label: 'j_in' }),
    makeGate('sw_k', 'INPUT_SWITCH', 0, 60, { label: 'k_in' }),
    makeGate('clk0', 'CLOCK', 0, 120),
    makeGate('jkff', 'JK_FF', 120, 0),
    makeGate('led0', 'OUTPUT_LED', 240, 0),
  ], [
    makeWire('w1', 'sw_j', 'out', 'jkff', 'j'),
    makeWire('w2', 'clk0', 'clk', 'jkff', 'clk'),
    makeWire('w3', 'sw_k', 'out', 'jkff', 'k'),
    makeWire('w4', 'jkff', 'q', 'led0', 'in'),
  ]);

  const verilog = generateVerilog(circuit);

  it('contains posedge clocking', () => {
    expect(verilog).toMatch(/always\s+@\(posedge\b/);
  });

  it('contains J/K truth table conditionals', () => {
    // The JK-FF toVerilog emits if/else if blocks for J/K combinations
    expect(verilog).toMatch(/if\s*\(/);
    expect(verilog).toMatch(/else\s+if/);
  });

  it('contains toggle logic (complement of Q)', () => {
    expect(verilog).toMatch(/~\w/); // ~q for toggle
  });

  it('uses non-blocking assignment', () => {
    expect(verilog).toMatch(/<=/);
  });
});

// ---------------------------------------------------------------------------
// 11. MS-JK FF -- negedge
// ---------------------------------------------------------------------------
describe('MS-JK FF -- negedge', () => {
  const circuit = makeCircuit('msjk_test', [
    makeGate('sw_j', 'INPUT_SWITCH', 0, 0, { label: 'j_in' }),
    makeGate('sw_k', 'INPUT_SWITCH', 0, 60, { label: 'k_in' }),
    makeGate('clk0', 'CLOCK', 0, 120),
    makeGate('msjk', 'MS_JK_FF', 120, 0),
    makeGate('led0', 'OUTPUT_LED', 240, 0),
  ], [
    makeWire('w1', 'sw_j', 'out', 'msjk', 'j'),
    makeWire('w2', 'clk0', 'clk', 'msjk', 'clk'),
    makeWire('w3', 'sw_k', 'out', 'msjk', 'k'),
    makeWire('w4', 'msjk', 'q', 'led0', 'in'),
  ]);

  it('Verilog uses negedge clk', () => {
    const verilog = generateVerilog(circuit);
    expect(verilog).toMatch(/always\s+@\(negedge\b/);
  });

  it('VHDL uses falling_edge', () => {
    const vhdl = generateVHDL(circuit);
    expect(vhdl).toContain('falling_edge');
  });
});

// ---------------------------------------------------------------------------
// 12. CONST_HIGH / CONST_LOW
// ---------------------------------------------------------------------------
describe('CONST_HIGH / CONST_LOW -- Verilog', () => {
  const circuit = makeCircuit('const_test', [
    makeGate('ch', 'CONST_HIGH', 0, 0),
    makeGate('cl', 'CONST_LOW', 0, 50),
    makeGate('g_and', 'AND', 100, 25),
    makeGate('led0', 'OUTPUT_LED', 200, 25),
  ], [
    makeWire('w1', 'ch', 'out', 'g_and', 'a'),
    makeWire('w2', 'cl', 'out', 'g_and', 'b'),
    makeWire('w3', 'g_and', 'out', 'led0', 'in'),
  ]);

  it('Verilog assigns 1\'b1 for CONST_HIGH', () => {
    const verilog = generateVerilog(circuit);
    expect(verilog).toContain("1'b1");
    expect(verilog).toContain('CONST_HIGH');
  });

  it('Verilog assigns 1\'b0 for CONST_LOW', () => {
    const verilog = generateVerilog(circuit);
    expect(verilog).toContain("1'b0");
    expect(verilog).toContain('CONST_LOW');
  });

  it('VHDL uses \'1\' for CONST_HIGH and \'0\' for CONST_LOW', () => {
    const vhdl = generateVHDL(circuit);
    expect(vhdl).toContain("'1'");
    expect(vhdl).toContain('CONST_HIGH');
    expect(vhdl).toContain("'0'");
    expect(vhdl).toContain('CONST_LOW');
  });
});

// ---------------------------------------------------------------------------
// JUNCTION signal propagation — output LEDs through junctions must be driven
// ---------------------------------------------------------------------------
describe('JUNCTION signal propagation', () => {
  // AND:out → JUNCTION:in, JUNCTION:y0 → LED1:in, JUNCTION:y1 → LED2:in
  const circuit = makeCircuit('junction_test', [
    makeGate('sw_a', 'INPUT_SWITCH', 0, 0, { label: 'a' }),
    makeGate('sw_b', 'INPUT_SWITCH', 0, 60, { label: 'b' }),
    makeGate('g_and', 'AND', 200, 30),
    makeGate('junc', 'JUNCTION', 350, 30),
    makeGate('led1', 'OUTPUT_LED', 500, 0, { label: 'y1' }),
    makeGate('led2', 'OUTPUT_LED', 500, 60, { label: 'y2' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'g_and', 'a'),
    makeWire('w2', 'sw_b', 'out', 'g_and', 'b'),
    makeWire('w3', 'g_and', 'out', 'junc', 'in'),
    makeWire('w4', 'junc', 'y0', 'led1', 'in'),
    makeWire('w5', 'junc', 'y1', 'led2', 'in'),
  ]);

  it('Verilog: LED outputs share the same signal as AND output (no undriven ports)', () => {
    const verilog = generateVerilog(circuit);
    // Both LEDs should be declared as output ports
    expect(verilog).toMatch(/output\s+\w+\s+\w+/);
    // There should be NO undriven output: the AND gate drives a wire, and both
    // LED ports should map to that same wire through the JUNCTION.
    // Specifically: the AND primitive drives a signal, and both LED ports use it.
    const andMatch = verilog.match(/and\s+\w+\((\w+),/);
    expect(andMatch).toBeTruthy();
    const andOutSignal = andMatch![1];
    // Both LED output ports should be this same signal
    const outputLines = verilog.match(/output\s+wire\s+(\w+)/g) ?? [];
    const outputNames = outputLines.map(l => l.split(/\s+/).pop()!);
    // All output names should equal the AND output signal
    for (const name of outputNames) {
      expect(name).toBe(andOutSignal);
    }
  });

  it('VHDL: LED outputs share the same signal as AND output (no undriven ports)', () => {
    const vhdl = generateVHDL(circuit);
    // Should contain AND operator
    expect(vhdl).toMatch(/\band\b/);
    // Both output ports should map to the same driven signal
    const portLines = [...vhdl.matchAll(/(\w+)\s*:\s*out\s+STD_LOGIC/g)];
    expect(portLines.length).toBe(2);
    // Both output port names should be identical (same signal through junction)
    expect(portLines[0][1]).toBe(portLines[1][1]);
  });
});
