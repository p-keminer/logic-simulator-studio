import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';
import type { SignalValue } from '../../core/types';

/**
 * 4-bit ALU – 8 operations selected by Op[2:0]:
 *   000 ADD   001 SUB   010 AND   011 OR
 *   100 XOR   101 NOT_A  110 SHL   111 SHR
 */
gateRegistry.register({
  typeId: 'ALU4',
  label: 'ALU',
  category: 'logic_comp',
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
  shapeComponent: FlipFlopShape,
  description: '4-Bit ALU: ADD/SUB/AND/OR/XOR/NOT/SHL/SHR via Op[2:0]',
});
