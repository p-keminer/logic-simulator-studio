import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';
import type { SignalValue } from '../../core/types';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_'); }

/**
 * 4-bit ALU – 8 operations selected by Op[2:0]:
 *   000 ADD   001 SUB   010 AND   011 OR
 *   100 XOR   101 NOT_A  110 SHL   111 SHR
 */
gateRegistry.register({
  typeId: 'ALU4',
  label: 'ALU',
  category: 'arith',
  width: 100, height: 260,
  inputs: [
    { id: 'a0',  label: 'A0',  relativeX: 0, relativeY: 0.05 },
    { id: 'a1',  label: 'A1',  relativeX: 0, relativeY: 0.12 },
    { id: 'a2',  label: 'A2',  relativeX: 0, relativeY: 0.19 },
    { id: 'a3',  label: 'A3',  relativeX: 0, relativeY: 0.26 },
    { id: 'b0',  label: 'B0',  relativeX: 0, relativeY: 0.38 },
    { id: 'b1',  label: 'B1',  relativeX: 0, relativeY: 0.45 },
    { id: 'b2',  label: 'B2',  relativeX: 0, relativeY: 0.52 },
    { id: 'b3',  label: 'B3',  relativeX: 0, relativeY: 0.59 },
    { id: 'op0', label: 'Op0', relativeX: 0, relativeY: 0.70 },
    { id: 'op1', label: 'Op1', relativeX: 0, relativeY: 0.77 },
    { id: 'op2', label: 'Op2', relativeX: 0, relativeY: 0.84 },
    { id: 'cin', label: 'CIN', relativeX: 0, relativeY: 0.94 },
  ],
  outputs: [
    { id: 's0',   label: 'S0',   relativeX: 1, relativeY: 0.10 },
    { id: 's1',   label: 'S1',   relativeX: 1, relativeY: 0.20 },
    { id: 's2',   label: 'S2',   relativeX: 1, relativeY: 0.30 },
    { id: 's3',   label: 'S3',   relativeX: 1, relativeY: 0.40 },
    { id: 'cout', label: 'COUT', relativeX: 1, relativeY: 0.60 },
    { id: 'zero', label: 'ZERO', relativeX: 1, relativeY: 0.75 },
  ],
  evaluate: ({ a0, a1, a2, a3, b0, b1, b2, b3, op0, op1, op2, cin }) => {
    const a = ((a0 ?? 0) as number) | (((a1 ?? 0) as number) << 1) | (((a2 ?? 0) as number) << 2) | (((a3 ?? 0) as number) << 3);
    const b = ((b0 ?? 0) as number) | (((b1 ?? 0) as number) << 1) | (((b2 ?? 0) as number) << 2) | (((b3 ?? 0) as number) << 3);
    const op = ((op0 ?? 0) as number) | (((op1 ?? 0) as number) << 1) | (((op2 ?? 0) as number) << 2);
    const c  = (cin ?? 0) as number;

    let result = 0;
    let cout   = 0;

    switch (op) {
      case 0: { const s = a + b + c; result = s & 0xF; cout = (s >> 4) & 1; break; }  // ADD
      case 1: { const d = a - b - c; result = ((d % 16) + 16) % 16; cout = d < 0 ? 1 : 0; break; } // SUB
      case 2: result = a & b; break; // AND
      case 3: result = a | b; break; // OR
      case 4: result = a ^ b; break; // XOR
      case 5: result = (~a) & 0xF; break; // NOT A
      case 6: result = (a << 1) & 0xF; cout = (a >> 3) & 1; break; // SHL
      case 7: result = (a >> 1) & 0xF; cout = a & 1; break;        // SHR
      default: result = 0;
    }

    return {
      s0:   ((result)      & 1) as SignalValue,
      s1:   ((result >> 1) & 1) as SignalValue,
      s2:   ((result >> 2) & 1) as SignalValue,
      s3:   ((result >> 3) & 1) as SignalValue,
      cout: (cout           & 1) as SignalValue,
      zero: (result === 0 ? 1 : 0) as SignalValue,
    };
  },
  toVerilog: (g, w) => {
    const sid  = sanitize(g.id);
    const a0   = w[`${g.id}:a0`]  ?? "1'b0"; const a1 = w[`${g.id}:a1`] ?? "1'b0";
    const a2   = w[`${g.id}:a2`]  ?? "1'b0"; const a3 = w[`${g.id}:a3`] ?? "1'b0";
    const b0   = w[`${g.id}:b0`]  ?? "1'b0"; const b1 = w[`${g.id}:b1`] ?? "1'b0";
    const b2   = w[`${g.id}:b2`]  ?? "1'b0"; const b3 = w[`${g.id}:b3`] ?? "1'b0";
    const op0  = w[`${g.id}:op0`] ?? "1'b0"; const op1 = w[`${g.id}:op1`] ?? "1'b0";
    const op2  = w[`${g.id}:op2`] ?? "1'b0";
    const cin  = w[`${g.id}:cin`] ?? "1'b0";
    const s0   = w[`${g.id}:s0`]  ?? `w_${sid}_s0`; const s1 = w[`${g.id}:s1`] ?? `w_${sid}_s1`;
    const s2   = w[`${g.id}:s2`]  ?? `w_${sid}_s2`; const s3 = w[`${g.id}:s3`] ?? `w_${sid}_s3`;
    const cout = w[`${g.id}:cout`] ?? `w_${sid}_cout`;
    const zero = w[`${g.id}:zero`] ?? `w_${sid}_zero`;
    return [
      `// ALU4 ${sid}`,
      `always @(*) begin : blk_${sid}`,
      `  reg [3:0] va, vb;`,
      `  reg [4:0] sum;`,
      `  va  = {${a3}, ${a2}, ${a1}, ${a0}};`,
      `  vb  = {${b3}, ${b2}, ${b1}, ${b0}};`,
      `  sum = 5'b0;`,
      `  case ({${op2}, ${op1}, ${op0}})`,
      `    3'b000: sum = {1'b0, va} + {1'b0, vb} + {4'b0, ${cin}}; // ADD`,
      `    3'b001: sum = {1'b0, va} - {1'b0, vb} - {4'b0, ${cin}}; // SUB`,
      `    3'b010: sum = {1'b0, va & vb};                           // AND`,
      `    3'b011: sum = {1'b0, va | vb};                           // OR`,
      `    3'b100: sum = {1'b0, va ^ vb};                           // XOR`,
      `    3'b101: sum = {1'b0, ~va};                               // NOT A`,
      `    3'b110: sum = {va, 1'b0};                                // SHL (MSB→COUT)`,
      `    3'b111: sum = {va[0], 1'b0, va[3:1]};                   // SHR (LSB→COUT)`,
      `    default: sum = 5'b0;`,
      `  endcase`,
      `  {${s3}, ${s2}, ${s1}, ${s0}} = sum[3:0];`,
      `  ${cout} = sum[4];`,
      `  ${zero} = (sum[3:0] == 4'b0) ? 1'b1 : 1'b0;`,
      `end // ALU4 ${sid}`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid  = sanitize(g.id);
    const a0   = w[`${g.id}:a0`]  ?? "'0'"; const a1 = w[`${g.id}:a1`] ?? "'0'";
    const a2   = w[`${g.id}:a2`]  ?? "'0'"; const a3 = w[`${g.id}:a3`] ?? "'0'";
    const b0   = w[`${g.id}:b0`]  ?? "'0'"; const b1 = w[`${g.id}:b1`] ?? "'0'";
    const b2   = w[`${g.id}:b2`]  ?? "'0'"; const b3 = w[`${g.id}:b3`] ?? "'0'";
    const op0  = w[`${g.id}:op0`] ?? "'0'"; const op1 = w[`${g.id}:op1`] ?? "'0'";
    const op2  = w[`${g.id}:op2`] ?? "'0'";
    const cin  = w[`${g.id}:cin`] ?? "'0'";
    const s0   = w[`${g.id}:s0`]  ?? `w_${sid}_s0`; const s1 = w[`${g.id}:s1`] ?? `w_${sid}_s1`;
    const s2   = w[`${g.id}:s2`]  ?? `w_${sid}_s2`; const s3 = w[`${g.id}:s3`] ?? `w_${sid}_s3`;
    const cout = w[`${g.id}:cout`] ?? `w_${sid}_cout`;
    const zero = w[`${g.id}:zero`] ?? `w_${sid}_zero`;
    return [
      `-- ALU4 ${sid}`,
      `process(${a0}, ${a1}, ${a2}, ${a3}, ${b0}, ${b1}, ${b2}, ${b3}, ${op0}, ${op1}, ${op2}, ${cin})`,
      `  variable va  : unsigned(3 downto 0);`,
      `  variable vb  : unsigned(3 downto 0);`,
      `  variable vop : integer range 0 to 7;`,
      `  variable sum : unsigned(4 downto 0);`,
      `begin`,
      `  va  := unsigned(${a3} & ${a2} & ${a1} & ${a0});`,
      `  vb  := unsigned(${b3} & ${b2} & ${b1} & ${b0});`,
      `  vop := to_integer(unsigned(${op2} & ${op1} & ${op0}));`,
      `  sum := (others => '0');`,
      `  case vop is`,
      `    when 0 => sum := resize(va,5) + resize(vb,5) + unsigned("0000" & ${cin}); -- ADD`,
      `    when 1 => sum := resize(va,5) - resize(vb,5) - unsigned("0000" & ${cin}); -- SUB`,
      `    when 2 => sum(3 downto 0) := va and vb;                                   -- AND`,
      `    when 3 => sum(3 downto 0) := va or  vb;                                   -- OR`,
      `    when 4 => sum(3 downto 0) := va xor vb;                                   -- XOR`,
      `    when 5 => sum(3 downto 0) := not va;                                      -- NOT A`,
      `    when 6 => sum(0):='0'; sum(1):=va(0); sum(2):=va(1); sum(3):=va(2); sum(4):=va(3); -- SHL`,
      `    when 7 => sum(0):=va(1); sum(1):=va(2); sum(2):=va(3); sum(3):='0'; sum(4):=va(0); -- SHR`,
      `    when others => null;`,
      `  end case;`,
      `  ${s0} <= sum(0); ${s1} <= sum(1); ${s2} <= sum(2); ${s3} <= sum(3);`,
      `  ${cout} <= sum(4);`,
      `  if sum(3 downto 0) = x"0" then ${zero} <= '1'; else ${zero} <= '0'; end if;`,
      `end process; -- ALU4 ${sid}`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: '4-Bit ALU: ADD/SUB/AND/OR/XOR/NOT/SHL/SHR via Op[2:0]',
  verilogAlwaysComb: true,
});
